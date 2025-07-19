#!/usr/bin/env python3
"""
Enhanced BRAUN (AGENT 1) Daemon

Automatically monitors the patches directory and processes JSON patches,
with enhanced error handling, self-monitoring, and system integration.
"""

from gpt_cursor_runner.read_patches import read_patches
from gpt_cursor_runner.patch_runner import apply_patch
import os
import sys
import time
import json
import shutil
import glob
import logging
import threading
import signal
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


@dataclass
class DaemonHealth:
    """Health status for the daemon."""

    is_running: bool
    uptime: float
    processed_count: int
    failed_count: int
    last_activity: datetime
    error_count: int
    consecutive_failures: int
    memory_usage: float
    cpu_usage: float


class EnhancedBraunDaemon:
    """Enhanced BRAUN daemon with self-monitoring and error recovery."""

    def __init__(self, patches_dir: str = None, check_interval: int = 30):
        self.patches_dir = (
            patches_dir
            or "/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/tasks/patches"
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

    def _setup_logging(self):
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

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        self.logger.info(f"Received signal {signum}, shutting down gracefully...")
        self.stop()
        sys.exit(0)

    def get_pending_patches(self) -> List[str]:
        """Get list of pending patch files with enhanced error handling."""
        try:
            if not os.path.exists(self.patches_dir):
                self.logger.error(f"❌ Patches directory not found: {self.patches_dir}")
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
        """Load patch data from file with enhanced error handling."""
        try:
            with open(patch_file, 'r') as f:
                patch_data = json.load(f)

            # Validate patch structure
            required_fields = ["id", "target_file", "patch"]
            for field in required_fields:
                if field not in patch_data:
                    raise ValueError(f"Missing required field: {field}")

            # Add file path to patch data
            patch_data['_file_path'] = patch_file
            return patch_data

        except json.JSONDecodeError as e:
            self.logger.error(f"❌ Invalid JSON in patch {patch_file}: {e}")
            self.error_count += 1
            return None
        except Exception as e:
            self.logger.error(f"❌ Error loading patch {patch_file}: {e}")
            self.error_count += 1
            return None

    def process_patch(self, patch_file: str) -> bool:
        """Process a single patch file with enhanced error handling."""
        filename = os.path.basename(patch_file)
        patch_data = self.load_patch(patch_file)

        if not patch_data:
            self.logger.error(f"❌ Failed to load patch: {filename}")
            self.move_patch(patch_file, self.fail_dir, "Failed to load patch data")
            self.failed_count += 1
            self.consecutive_failures += 1
            return False

        patch_id = patch_data.get("id", "unknown")
        target_file = patch_data.get("target_file", "")
        description = patch_data.get("description", "No description")

        self.logger.info(f"\n🔧 Processing patch: {filename}")
        self.logger.info(f"   🆔 ID: {patch_id}")
        self.logger.info(f"   🎯 Target: {target_file}")
        self.logger.info(f"   📝 Description: {description}")

        try:
            # First, validate the patch (dry run)
            self.logger.info("   🔍 Validating patch...")
            validation_result = apply_patch(patch_data, dry_run=True)

            if not validation_result["success"]:
                self.logger.error(
                    f"   ❌ Patch validation failed: {validation_result['message']}"
                )
                self.move_patch(
                    patch_file,
                    self.fail_dir,
                    f"Validation failed: {validation_result['message']}",
                )
                self.failed_count += 1
                self.consecutive_failures += 1
                return False

            self.logger.info("   ✅ Patch validation successful")

            # Apply the patch (not dry run)
            self.logger.info("   🚀 Applying patch...")
            apply_result = apply_patch(patch_data, dry_run=False)

            if apply_result["success"] and apply_result.get("changes_made", False):
                self.logger.info("   ✅ Patch applied successfully")
                self.move_patch(patch_file, self.done_dir, "Successfully applied")
                self.processed_count += 1
                self.consecutive_failures = 0  # Reset on success
                self.last_activity = datetime.now()
                return True
            else:
                self.logger.warning(
                    f"   ⚠️ Patch application failed: {apply_result['message']}"
                )
                self.move_patch(
                    patch_file,
                    self.fail_dir,
                    f"Application failed: {apply_result['message']}",
                )
                self.failed_count += 1
                self.consecutive_failures += 1
                return False

        except Exception as e:
            self.logger.error(f"   ❌ Unexpected error processing patch: {e}")
            self.move_patch(patch_file, self.fail_dir, f"Unexpected error: {e}")
            self.failed_count += 1
            self.consecutive_failures += 1
            self.error_count += 1
            return False

    def move_patch(self, patch_file: str, target_dir: str, reason: str):
        """Move patch file to target directory with reason and enhanced logging."""
        filename = os.path.basename(patch_file)
        target_file = os.path.join(target_dir, filename)

        try:
            # Create a log entry for the move
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "filename": filename,
                "original_path": patch_file,
                "target_path": target_file,
                "reason": reason,
                "status": "moved",
            }

            # Write log entry
            log_file = os.path.join(target_dir, "move_log.json")
            try:
                if os.path.exists(log_file):
                    with open(log_file, 'r') as f:
                        log_data = json.load(f)
                else:
                    log_data = {"entries": []}

                log_data["entries"].append(log_entry)

                # Keep only last 100 entries
                if len(log_data["entries"]) > 100:
                    log_data["entries"] = log_data["entries"][-100:]

                with open(log_file, 'w') as f:
                    json.dump(log_data, f, indent=2)
            except Exception as e:
                self.logger.warning(f"⚠️ Could not write log entry: {e}")

            # Move the file
            shutil.move(patch_file, target_file)
            self.logger.info(
                f"   📁 Moved {filename} to {os.path.basename(target_dir)}"
            )

        except Exception as e:
            self.logger.error(f"❌ Error moving patch {filename}: {e}")
            self.error_count += 1

    def check_json_stop_file(self) -> bool:
        """Check if there's a .json.stop file in the patches directory."""
        json_stop_file = os.path.join(self.patches_dir, ".json.stop")
        return os.path.exists(json_stop_file)

    def check_stop_file(self) -> bool:
        """Check if daemon should stop."""
        return os.path.exists(self.stop_file)

    def get_health_status(self) -> DaemonHealth:
        """Get current health status of the daemon."""
        import psutil
        import os

        try:
            process = psutil.Process(os.getpid())
            memory_usage = process.memory_info().rss / 1024 / 1024  # MB
            cpu_usage = process.cpu_percent()
        except Exception:
            memory_usage = 0.0
            cpu_usage = 0.0

        return DaemonHealth(
            is_running=self.is_running,
            uptime=(datetime.now() - self.start_time).total_seconds(),
            processed_count=self.processed_count,
            failed_count=self.failed_count,
            last_activity=self.last_activity,
            error_count=self.error_count,
            consecutive_failures=self.consecutive_failures,
            memory_usage=memory_usage,
            cpu_usage=cpu_usage,
        )

    def _health_monitor_loop(self):
        """Health monitoring loop."""
        while self.is_running:
            try:
                health = self.get_health_status()

                # Log health status
                self.logger.info(
                    f"📊 Health Status - Uptime: {health.uptime:.0f}s, "
                    f"Processed: {health.processed_count}, "
                    f"Failed: {health.failed_count}, "
                    f"Errors: {health.error_count}, "
                    f"Memory: {health.memory_usage:.1f}MB, "
                    f"CPU: {health.cpu_usage:.1f}%"
                )

                # Check for excessive consecutive failures
                if health.consecutive_failures >= 5:
                    self.logger.warning(
                        f"⚠️ High consecutive failure count: {
                            health.consecutive_failures}")

                # Check for memory issues
                if health.memory_usage > 500:  # 500MB threshold
                    self.logger.warning(
                        f"⚠️ High memory usage: {health.memory_usage:.1f}MB"
                    )

                # Check for inactivity
                if (
                    datetime.now() - health.last_activity
                ).total_seconds() > 3600:  # 1 hour
                    self.logger.warning("⚠️ No patch activity for over 1 hour")

                time.sleep(self.health_interval)

            except Exception as e:
                self.logger.error(f"Error in health monitor: {e}")
                time.sleep(self.health_interval)

    def run(self):
        """Main daemon loop with enhanced error handling."""
        self.logger.info("🚀 Enhanced BRAUN Daemon starting...")
        self.logger.info(f"⏰ Check interval: {self.check_interval} seconds")
        self.logger.info("🛑 Create .stop file to stop the daemon")
        self.logger.info("🛑 Create .json.stop file to pause processing")
        self.logger.info("=" * 50)

        self.is_running = True

        # Start health monitoring thread
        self.health_thread = threading.Thread(
            target=self._health_monitor_loop, daemon=True
        )
        self.health_thread.start()

        try:
            while not self.check_stop_file():
                # Check for .json.stop file
                if self.check_json_stop_file():
                    self.logger.info("🛑 Found .json.stop file - pausing processing")
                    time.sleep(self.check_interval)
                    continue

                # Get pending patches
                pending_patches = self.get_pending_patches()

                if pending_patches:
                    self.logger.info(
                        f"\n🔍 Found {len(pending_patches)} pending patches"
                    )

                    for patch_file in pending_patches:
                        # Check for .json.stop file before each patch
                        if self.check_json_stop_file():
                            self.logger.info(
                                "🛑 Found .json.stop file - stopping sequential processing"
                            )
                            break

                        if self.check_stop_file():
                            break

                        if self.process_patch(patch_file):
                            self.processed_count += 1
                        else:
                            self.failed_count += 1

                        # Small delay between patches
                        time.sleep(1)
                else:
                    self.logger.info(
                        f"⏳ No pending patches found. Waiting {self.check_interval}s..."
                    )

                # Wait before next check
                time.sleep(self.check_interval)

        except KeyboardInterrupt:
            self.logger.info("🛑 Received interrupt signal")
        except Exception as e:
            self.logger.error(f"❌ Unexpected error in main loop: {e}")
            self.error_count += 1
        finally:
            self.stop()

    def stop(self):
        """Stop the daemon gracefully."""
        self.logger.info("🛑 Stopping Enhanced BRAUN Daemon...")
        self.is_running = False

        if self.health_thread:
            self.health_thread.join(timeout=5)

        # Final health report
        health = self.get_health_status()
        self.logger.info(
            f"📊 Final Stats - Processed: {health.processed_count}, "
            f"Failed: {health.failed_count}, "
            f"Errors: {health.error_count}, "
            f"Uptime: {health.uptime:.0f}s"
        )

        self.logger.info("✅ Enhanced BRAUN Daemon stopped")


def main():
    """Main entry point."""
    daemon = EnhancedBraunDaemon()
    daemon.run()


if __name__ == "__main__":
    main()
