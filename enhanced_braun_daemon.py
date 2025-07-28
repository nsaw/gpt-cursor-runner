#!/usr/bin/env python3
"""
Enhanced BRAUN (AGENT 1) Daemon

Automatically monitors the patches directory and processes JSON patches
with enhanced error handling, self-monitoring, and system integration.
"""

import os
import sys
import time
import json
import shutil
import glob
import logging
import threading
import signal
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from apply_patch import apply_patch
except ImportError:
    # Fallback if apply_patch module is not available
    def apply_patch(
        patch_data: Dict[str, Any], dry_run: bool = False
    ) -> Dict[str, Any]:
        """Fallback apply_patch function."""
        return {
            "success": True,
            "message": "Fallback apply_patch",
            "changes_made": False
        }


@dataclass
class DaemonHealth:
    """Health status for the daemon."""
    is_running: bool
    uptime: float
    processed_count: int
    failed_count: int
    last_activity: datetime
    error_count: int
    memory_usage: float
    cpu_usage: float


class EnhancedBraunDaemon:
    """Enhanced BRAUN daemon with self-monitoring and error recovery."""

    def __init__(self, patches_dir: Optional[str] = None, check_interval: int = 30):
        self.patches_dir = (
            patches_dir
            or "/Users/sawyer/gitSync/.cursor-cache/MAIN/patches"
        )
        self.check_interval = check_interval
        self.done_dir = os.path.join(self.patches_dir, ".done")
        self.fail_dir = os.path.join(self.patches_dir, ".fail")
        self.skip_dir = os.path.join(self.patches_dir, ".skip")
        self.tests_dir = os.path.join(self.patches_dir, ".tests")
        self.stop_file = os.path.join(self.patches_dir, ".stop")

        # Health tracking
        self.start_time = datetime.now()
        self.processed_count = 0
        self.failed_count = 0
        self.error_count = 0
        self.consecutive_failures = 0
        self.last_activity = datetime.now()
        self.is_running = False

        # Setup logging
        self._setup_logging()

        # Ensure directories exist
        for directory in [self.done_dir, self.fail_dir, self.skip_dir, self.tests_dir]:
            os.makedirs(directory, exist_ok=True)

        # Set environment variable for patch reading
        os.environ["PATCHES_DIRECTORY"] = self.patches_dir

        # Health monitoring thread
        self.health_thread = None
        self.health_interval = 60  # Check health every minute

        # Signal handling
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        self.logger.info("🤖 Enhanced BRAUN Daemon initialized")
        self.logger.info(f"📁 Patches directory: {self.patches_dir}")
        self.logger.info(f"✅ Done directory: {self.done_dir}")
        self.logger.info(f"❌ Fail directory: {self.fail_dir}")
        self.logger.info(f"⏸️ Skip directory: {self.skip_dir}")
        self.logger.info(f"🧪 Tests directory: {self.tests_dir}")
        self.logger.info(f"🛑 Stop file: {self.stop_file}")

    def _setup_logging(self) -> None:
        """Setup enhanced logging."""
        log_dir = "logs"
        os.makedirs(log_dir, exist_ok=True)
        self.logger = logging.getLogger("EnhancedBraunDaemon")
        self.logger.setLevel(logging.INFO)

        # File handler
        fh = logging.FileHandler(f"{log_dir}/enhanced-braun-daemon.log")
        fh.setLevel(logging.INFO)

        # Console handler
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)

        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        fh.setFormatter(formatter)
        ch.setFormatter(formatter)

        self.logger.addHandler(fh)
        self.logger.addHandler(ch)

    def _signal_handler(self, signum: int, frame: Any) -> None:
        """Handle shutdown signals gracefully."""
        self.logger.info(f"Received signal {signum}, shutting down gracefully...")
        self.stop()
        sys.exit(0)

    def get_pending_patches(self) -> List[str]:
        """Get list of pending patch files with enhanced error handling."""
        try:
            if not os.path.exists(self.patches_dir):
                self.logger.error(
                    f"Patches directory does not exist: {self.patches_dir}"
                )
                return []

            # Get all JSON files in patches directory (excluding .json.stop files)
            patch_files = glob.glob(os.path.join(self.patches_dir, "*.json"))

            # Remove .json.stop files from patch list
            patch_files = [f for f in patch_files if not f.endswith('.json.stop')]

            # Filter out files that are already processed
            pending_patches = []
            for patch_file in patch_files:
                filename = os.path.basename(patch_file)

                # Skip if already in done, fail, skip, or tests directories
                if (
                    os.path.exists(os.path.join(self.done_dir, filename))
                    or os.path.exists(os.path.join(self.fail_dir, filename))
                    or os.path.exists(os.path.join(self.skip_dir, filename))
                    or os.path.exists(os.path.join(self.tests_dir, filename))
                ):
                    continue

                pending_patches.append(patch_file)

            return sorted(pending_patches)
        except Exception as e:
            self.logger.error(f"Error getting pending patches: {e}")
            self.error_count += 1
            return []

    def load_patch(self, patch_file: str) -> Optional[Dict[str, Any]]:
        """Load patch data from file with error handling."""
        try:
            with open(patch_file, 'r') as f:
                patch_data: Dict[str, Any] = json.load(f)
                # Add file path to patch data
                patch_data['_file_path'] = patch_file
                return patch_data
        except Exception as e:
            self.logger.error(f"Error loading patch {patch_file}: {e}")
            self.error_count += 1
            return None

    def process_patch(self, patch_file: str) -> bool:
        """Process a single patch file with enhanced error handling."""
        filename = os.path.basename(patch_file)
        patch_data = self.load_patch(patch_file)

        if not patch_data:
            self.logger.error(f"Failed to load patch: {filename}")
            self.move_patch(patch_file, self.fail_dir, "Failed to load patch data")
            self.failed_count += 1
            self.consecutive_failures += 1
            return False

        patch_id = patch_data.get("id", "unknown")
        target_file = patch_data.get("target_file", "")
        description = patch_data.get("description", "No description")

        self.logger.info(f"Processing patch: {filename}")
        self.logger.info(f"  ID: {patch_id}")
        self.logger.info(f"  Target: {target_file}")
        self.logger.info(f"  Description: {description}")

        # First, validate the patch (dry run)
        self.logger.info("  Validating patch...")
        validation_result = apply_patch(patch_data, dry_run=True)

        if not validation_result["success"]:
            self.logger.error(
                f"Patch validation failed: {validation_result['message']}"
            )
            self.move_patch(
                patch_file,
                self.fail_dir,
                f"Validation failed: {validation_result['message']}",
            )
            self.failed_count += 1
            self.consecutive_failures += 1
            return False

        self.logger.info("  Patch validation successful")

        # Apply the patch (not dry run)
        self.logger.info("  Applying patch...")
        apply_result = apply_patch(patch_data, dry_run=False)

        if apply_result["success"] and apply_result.get("changes_made", False):
            self.logger.info("  Patch applied successfully")
            self.move_patch(patch_file, self.done_dir, "Successfully applied")
            self.processed_count += 1
            self.consecutive_failures = 0  # Reset consecutive failures
            return True
        else:
            self.logger.error(f"Patch application failed: {apply_result['message']}")
            self.move_patch(
                patch_file,
                self.fail_dir,
                f"Application failed: {apply_result['message']}",
            )
            self.failed_count += 1
            self.consecutive_failures += 1
            return False

    def move_patch(self, patch_file: str, target_dir: str, reason: str) -> None:
        """Move patch file to target directory with reason and logging."""
        filename = os.path.basename(patch_file)
        target_file = os.path.join(target_dir, filename)

        try:
            # Create a log entry for the move
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "filename": filename,
                "original_path": patch_file,
                "target_path": target_file,
                "reason": reason
            }

            # Write to a log file
            log_file = os.path.join(target_dir, f"{filename}.log")
            with open(log_file, 'w') as f:
                json.dump(log_entry, f, indent=2)
        except Exception as e:
            self.logger.warning(f"Could not write log entry: {e}")

        # Move the file
        try:
            shutil.move(patch_file, target_file)
            self.logger.info(f"Moved {filename} to {os.path.basename(target_dir)}")
        except Exception as e:
            self.logger.error(f"Error moving file {filename}: {e}")

    def get_health_status(self) -> DaemonHealth:
        """Get current health status of the daemon."""
        uptime = (datetime.now() - self.start_time).total_seconds()
        
        # Simple memory and CPU usage estimation
        memory_usage = 0.0  # Could be enhanced with psutil
        cpu_usage = 0.0     # Could be enhanced with psutil
        
        return DaemonHealth(
            is_running=self.is_running,
            uptime=uptime,
            processed_count=self.processed_count,
            failed_count=self.failed_count,
            last_activity=self.last_activity,
            error_count=self.error_count,
            memory_usage=memory_usage,
            cpu_usage=cpu_usage
        )

    def _health_monitor(self) -> None:
        """Health monitoring thread function."""
        while self.is_running:
            try:
                health = self.get_health_status()
                self.logger.info(f"Health check: {asdict(health)}")
                
                # Check for consecutive failures
                if self.consecutive_failures >= 5:
                    self.logger.warning(
                        f"High consecutive failures: {self.consecutive_failures}"
                    )
                
                time.sleep(self.health_interval)
            except Exception as e:
                self.logger.error(f"Error in health monitor: {e}")
                time.sleep(self.health_interval)

    def start(self) -> None:
        """Start the enhanced daemon."""
        self.is_running = True
        self.logger.info("🚀 Starting Enhanced BRAUN daemon...")
        
        # Start health monitoring thread
        self.health_thread = threading.Thread(
            target=self._health_monitor, daemon=True
        )
        self.health_thread.start()
        
        self.run()

    def stop(self) -> None:
        """Stop the enhanced daemon."""
        self.is_running = False
        self.logger.info("🛑 Stopping Enhanced BRAUN daemon...")

    def run(self) -> None:
        """Main daemon loop with enhanced error handling."""
        self.logger.info(f"⏰ Check interval: {self.check_interval} seconds")
        self.logger.info("🛑 Create .stop file to stop the daemon")

        while self.is_running:
            # Check for stop file
            if os.path.exists(self.stop_file):
                self.logger.info("🛑 Stop file detected, shutting down...")
                break

            try:
                # Get pending patches
                pending_patches = self.get_pending_patches()

                if pending_patches:
                    self.logger.info(f"Found {len(pending_patches)} pending patches")
                    for patch_file in pending_patches:
                        if os.path.exists(self.stop_file) or not self.is_running:
                            break
                        self.process_patch(patch_file)
                        self.last_activity = datetime.now()
                else:
                    self.logger.debug("No pending patches, sleeping...")

            except KeyboardInterrupt:
                self.logger.info("🛑 Keyboard interrupt received, shutting down...")
                break
            except Exception as e:
                self.logger.error(f"Error in daemon loop: {e}")
                self.error_count += 1

            # Sleep before next check
            time.sleep(self.check_interval)

        self.logger.info("✅ Enhanced BRAUN daemon stopped")


def main() -> None:
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Enhanced BRAUN daemon for patch processing"
    )
    parser.add_argument(
        "--patches-dir",
        help="Directory containing patches (default: .cursor-cache/MAIN/patches)"
    )
    parser.add_argument(
        "--check-interval",
        type=int,
        default=30,
        help="Check interval in seconds (default: 30)"
    )

    args = parser.parse_args()

    daemon = EnhancedBraunDaemon(
        patches_dir=args.patches_dir,
        check_interval=args.check_interval
    )
    daemon.start()


if __name__ == "__main__":
    main()