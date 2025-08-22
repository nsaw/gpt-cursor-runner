#!/usr/bin/env python3
"""
CYOPS Daemon for automatic patch processing.
Monitors patches directory and applies patches automatically.
"""

import os
import json
import time
import shutil
import glob
from datetime import datetime
from typing import Dict, Any, Optional, List, Set


class CyopsDaemon:
    """CYOPS Daemon for automatic patch processing."""

    def __init__(self, patches_dir: str, check_interval: int = 30) -> None:
        """Initialize the daemon."""
        self.patches_dir = patches_dir
        self.check_interval = check_interval

        # Set up directories
        self.done_dir = os.path.join(patches_dir, ".completed")
        self.fail_dir = os.path.join(patches_dir, ".failed")
        self.skip_dir = os.path.join(patches_dir, ".skipped")

        # Ensure directories exist
        for directory in [self.done_dir, self.fail_dir, self.skip_dir]:
            os.makedirs(directory, exist_ok=True)

        # Track processed files
        self.processed_files: Set[str] = set()

    def load_patch(self, filepath: str) -> Optional[Dict[str, Any]]:
        """Load a patch file and return its contents."""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Error loading patch {filepath}: {e}")
            return None

    def apply_patch(self, patch_data: Dict[str, Any], filepath: str) -> bool:
        """Apply a patch using the patch application logic."""
        try:
            # Import here to avoid circular imports
            from gpt_cursor_runner.patch_processor import process_patch
            return process_patch(patch_data, filepath)
        except ImportError:
            print("Warning: patch_processor module not available")
            return False
        except Exception as e:
            print(f"Error applying patch {filepath}: {e}")
            return False

    def move_file(self, src: str, dest_dir: str) -> None:
        """Move a file to the specified directory."""
        try:
            filename = os.path.basename(src)
            dest_path = os.path.join(dest_dir, filename)
            shutil.move(src, dest_path)
            print(f"Moved {filename} to {dest_dir}")
        except Exception as e:
            print(f"Error moving file {src}: {e}")

    def process_patch_file(self, filepath: str) -> None:
        """Process a single patch file."""
        if filepath in self.processed_files:
            return

        print(f"Processing patch: {os.path.basename(filepath)}")

        # Load patch data
        patch_data = self.load_patch(filepath)
        if not patch_data:
            self.move_file(filepath, self.fail_dir)
            self.processed_files.add(filepath)
            return

        # Apply the patch
        success = self.apply_patch(patch_data, filepath)

        # Move file based on result
        if success:
            self.move_file(filepath, self.done_dir)
        else:
            self.move_file(filepath, self.fail_dir)

        self.processed_files.add(filepath)

    def scan_for_patches(self) -> List[str]:
        """Scan for new patch files."""
        pattern = os.path.join(self.patches_dir, "*.json")
        patch_files = glob.glob(pattern)

        # Filter out files in subdirectories
        patch_files = [f for f in patch_files if os.path.dirname(f) == self.patches_dir]

        # Filter out already processed files
        new_files = [f for f in patch_files if f not in self.processed_files]

        return new_files

    def run(self) -> None:
        """Main daemon loop."""
        print(f"CYOPS Daemon started, monitoring: {self.patches_dir}")
        print(f"Check interval: {self.check_interval} seconds")

        try:
            while True:
                # Scan for new patches
                new_patches = self.scan_for_patches()

                if new_patches:
                    print(f"Found {len(new_patches)} new patch(es)")
                    for patch_file in new_patches:
                        self.process_patch_file(patch_file)
                else:
                    print("No new patches found")

                # Wait before next check
                time.sleep(self.check_interval)

        except KeyboardInterrupt:
            print("\nCYOPS Daemon stopped by user")
        except Exception as e:
            print(f"CYOPS Daemon error: {e}")


def main() -> None:
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="CYOPS Daemon")
    parser.add_argument(
        "--patches-dir",
        default="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches",
        help="Directory to monitor for patches"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=30,
        help="Check interval in seconds"
    )

    args = parser.parse_args()

    # Create and run daemon
    daemon = CyopsDaemon(args.patches_dir, args.interval)
    daemon.run()


if __name__ == "__main__":
    main() 