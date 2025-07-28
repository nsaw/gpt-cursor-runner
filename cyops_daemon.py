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
from typing import Dict, Any, Optional, List
from gpt_cursor_runner.apply_patch import apply_patch


class CyopsDaemon:
    """CYOPS Daemon for automatic patch processing."""

    def __init__(self, patches_dir: str, check_interval: int = 30):
        """Initialize the daemon."""
        self.patches_dir = patches_dir
        self.check_interval = check_interval
        
        # Set up directories
        self.done_dir = os.path.join(patches_dir, ".completed")
        self.fail_dir = os.path.join(patches_dir, ".failed")
        self.skip_dir = os.path.join(patches_dir, ".skipped")
        self.tests_dir = os.path.join(patches_dir, ".tests")
        
        # Create directories if they don't exist
        for directory in [self.done_dir, self.fail_dir, self.skip_dir, self.tests_dir]:
            os.makedirs(directory, exist_ok=True)
        
        # Set up logging
        self.log_file = os.path.join(patches_dir, "cyops_daemon.log")
        
        print("🚀 CYOPS Daemon initialized")
        print("   📁 Patches directory: {}".format(patches_dir))
        print("   ⏱️  Check interval: {} seconds".format(check_interval))

    def run(self):
        """Run the daemon loop."""
        print("🔄 Starting CYOPS Daemon...")
        
        try:
            while True:
                self.process_patches()
                time.sleep(self.check_interval)
                
        except KeyboardInterrupt:
            print("\n🛑 CYOPS Daemon stopped by user")
        except Exception as e:
            print("❌ CYOPS Daemon error: {}".format(e))

    def get_pending_patches(self) -> List[str]:
        """Get list of pending patch files."""
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

    def load_patch(self, patch_file: str) -> Optional[Dict[str, Any]]:
        """Load patch data from file."""
        try:
            with open(patch_file, 'r') as f:
                patch_data = json.load(f)
            
            # Add file path to patch data
            patch_data['_file_path'] = patch_file
            return patch_data
        except Exception as e:
            print("❌ Error loading patch {}: {}".format(patch_file, e))
            return None

    def process_patch(self, patch_file: str) -> bool:
        """Process a single patch file."""
        filename = os.path.basename(patch_file)
        patch_data = self.load_patch(patch_file)

        if not patch_data:
            print("❌ Failed to load patch: {}".format(filename))
            self.move_patch(patch_file, self.fail_dir, "Failed to load patch data")
            return False

        patch_id = patch_data.get("id", "unknown")
        target_file = patch_data.get("target_file", "")
        description = patch_data.get("description", "No description")

        print("\n🔧 Processing patch: {}".format(filename))
        print("   🆔 ID: {}".format(patch_id))
        print("   🎯 Target: {}".format(target_file))
        print("   📝 Description: {}".format(description))

        # First, validate the patch (dry run)
        print("   🔍 Validating patch...")
        validation_result = apply_patch(patch_data, dry_run=True)

        if not validation_result["success"]:
            print("   ❌ Patch validation failed: {}".format(
                validation_result['message']
            ))
            self.move_patch(
                patch_file,
                self.fail_dir,
                "Validation failed: {}".format(validation_result['message']),
            )
            return False

        print("   ✅ Patch validation successful")

        # Apply the patch (not dry run)
        print("   🚀 Applying patch...")
        apply_result = apply_patch(patch_data, dry_run=False)

        if apply_result["success"] and apply_result.get("changes_made", False):
            print("   ✅ Patch applied successfully")
            self.move_patch(patch_file, self.done_dir, "Successfully applied")
            return True
        else:
            print("   ⚠️ Patch application failed: {}".format(
                apply_result['message']
            ))
            self.move_patch(
                patch_file,
                self.fail_dir,
                "Application failed: {}".format(
                    apply_result['message']
                ),
            )
            return False

    def move_patch(self, patch_file: str, target_dir: str, reason: str):
        """Move patch file to target directory with reason."""
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

            # Write log entry
            log_data = []
            if os.path.exists(self.log_file):
                try:
                    with open(self.log_file, 'r') as f:
                        log_data = json.load(f)
                except Exception:
                    log_data = []
            
            log_data.append(log_entry)
            
            with open(self.log_file, 'w') as f:
                json.dump(log_data, f, indent=2)
        except Exception as e:
            print("⚠️ Could not write log entry: {}".format(e))

        # Move the file
        try:
            shutil.move(patch_file, target_file)
            print("   📁 Moved {} to {}".format(filename, os.path.basename(target_dir)))
        except Exception as e:
            print("❌ Error moving patch {}: {}".format(filename, e))

    def process_patches(self):
        """Process all pending patches."""
        pending_patches = self.get_pending_patches()
        
        if not pending_patches:
            return
        
        print("\n📋 Found {} pending patches".format(len(pending_patches)))
        
        success_count = 0
        failed_count = 0
        
        for patch_file in pending_patches:
            if self.process_patch(patch_file):
                success_count += 1
            else:
                failed_count += 1
        
        print("\n📊 Processing complete:")
        print("   ✅ Successful: {}".format(success_count))
        print("   ❌ Failed: {}".format(failed_count))


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="CYOPS Daemon for automatic patch processing"
    )
    parser.add_argument("--patches-dir", help="Patches directory path")
    parser.add_argument(
        "--interval", 
        type=int, 
        default=30, 
        help="Check interval in seconds"
    )
    parser.add_argument("--dry-run", action="store_true", help="Run in dry-run mode")

    args = parser.parse_args()

    # Set up environment
    patches_dir = (
        args.patches_dir
        or "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches"
    )
    os.environ["PATCHES_DIRECTORY"] = patches_dir

    # Create and run daemon
    daemon = CyopsDaemon(patches_dir=patches_dir, check_interval=args.interval)
    daemon.run()


if __name__ == "__main__":
    main()