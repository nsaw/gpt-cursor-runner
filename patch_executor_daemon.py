#!/usr/bin/env python3
"""
Patch Executor Daemon
===================

A proper daemon entry point for patch execution that monitors patch directories
and processes patches automatically.

Author: ThoughtPilot Team
Version: 1.0.0
"""

import os
import sys
import time
import json
import logging
import argparse
import signal
from pathlib import Path
from typing import Set
from datetime import datetime

# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from apply_patch import apply_patch_from_file
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure apply_patch.py is available")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/patch-executor-daemon.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class PatchExecutorDaemon:
    """Main daemon class for patch execution."""
    
    def __init__(self, patches_dir: str, check_interval: int = 30):
        self.patches_dir = Path(patches_dir)
        self.check_interval = check_interval
        self.running = False
        self.processed_patches: Set[str] = set()
        
        # Ensure patches directory exists
        self.patches_dir.mkdir(parents=True, exist_ok=True)
        
        # Ensure logs directory exists
        Path('logs').mkdir(exist_ok=True)
        
        logger.info("Patch Executor Daemon initialized")
        logger.info(f"Monitoring directory: {self.patches_dir}")
        logger.info(f"Check interval: {check_interval} seconds")
    
    def start(self) -> None:
        """Start the daemon."""
        self.running = True
        logger.info("Patch Executor Daemon started")
        
        # Set up signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        try:
            while self.running:
                self._process_patches()
                time.sleep(self.check_interval)
        except KeyboardInterrupt:
            logger.info("Received interrupt signal, shutting down...")
        except Exception as e:
            logger.error(f"Unexpected error in daemon loop: {e}")
        finally:
            self.stop()
    
    def stop(self) -> None:
        """Stop the daemon."""
        self.running = False
        logger.info("Patch Executor Daemon stopped")
    
    def _signal_handler(self, signum: int, frame) -> None:
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down...")
        self.stop()
    
    def _process_patches(self) -> None:
        """Process pending patches in the directory."""
        try:
            # Find all JSON patch files
            patch_files = list(self.patches_dir.glob("*.json"))
            
            if not patch_files:
                logger.debug("No patch files found")
                return
            
            logger.info(f"Found {len(patch_files)} patch files")
            
            for patch_file in patch_files:
                if patch_file.name in self.processed_patches:
                    continue
                
                self._process_single_patch(patch_file)
                
        except Exception as e:
            logger.error(f"Error processing patches: {e}")
    
    def _process_single_patch(self, patch_file: Path) -> None:
        """Process a single patch file."""
        try:
            logger.info(f"Processing patch: {patch_file.name}")
            
            # Apply the patch
            result = apply_patch_from_file(str(patch_file))
            
            # Move patch file based on result
            if result.get('status') == 'success':
                self._move_patch_file(patch_file, 'completed')
                logger.info(f"✅ Patch {patch_file.name} completed successfully")
            else:
                self._move_patch_file(patch_file, 'failed')
                logger.error(f"❌ Patch {patch_file.name} failed: {result.get('error', 'Unknown error')}")
            
            # Mark as processed
            self.processed_patches.add(patch_file.name)
            
        except Exception as e:
            logger.error(f"Error processing patch {patch_file.name}: {e}")
            self._move_patch_file(patch_file, 'failed')
            self.processed_patches.add(patch_file.name)
    
    def _move_patch_file(self, patch_file: Path, status: str) -> None:
        """Move patch file to appropriate status directory."""
        try:
            # Create status directory
            status_dir = self.patches_dir / f".{status}"
            status_dir.mkdir(exist_ok=True)
            
            # Move file
            destination = status_dir / patch_file.name
            patch_file.rename(destination)
            
            logger.info(f"Moved {patch_file.name} to {status} directory")
            
        except Exception as e:
            logger.error(f"Error moving patch file {patch_file.name}: {e}")


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Patch Executor Daemon")
    parser.add_argument(
        "--patches-dir",
        default="/Users/sawyer/gitSync/.cursor-cache/MAIN/patches",
        help="Directory containing patches (default: .cursor-cache/MAIN/patches)"
    )
    parser.add_argument(
        "--check-interval",
        type=int,
        default=30,
        help="Check interval in seconds (default: 30)"
    )
    parser.add_argument(
        "--daemon",
        action="store_true",
        help="Run as daemon (background process)"
    )
    
    args = parser.parse_args()
    
    # Create and start daemon
    daemon = PatchExecutorDaemon(args.patches_dir, args.check_interval)
    
    if args.daemon:
        # Run as background daemon
        import daemon
        with daemon.DaemonContext():
            daemon.start()
    else:
        # Run in foreground
        daemon.start()


if __name__ == "__main__":
    main() 