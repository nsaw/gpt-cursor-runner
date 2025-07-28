#!/usr/bin/env python3
"""
BRAUN daemon for automatic patch processing.
It reads patches from the .cursor-cache/MAIN/patches directory and applies them.
"""

import argparse
import glob
import json
import os
import shutil
import sys
import time
from datetime import datetime
from typing import Dict, Any, Optional, List

# Add current directory to path for imports
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


class BraunDaemon:
    """BRAUN daemon for automatic patch processing."""

    def __init__(
        self, patches_dir: Optional[str] = None, check_interval: int = 30
    ) -> None:
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

        # Ensure directories exist
        for directory in [self.done_dir, self.fail_dir, self.skip_dir, self.tests_dir]:
            os.makedirs(directory, exist_ok=True)

        # Set environment variable for patch reading
        os.environ["PATCHES_DIRECTORY"] = self.patches_dir
        print("🤖 BRAUN Daemon initialized")
        print(f"📁 Patches directory: {self.patches_dir}")
        print(f"✅ Done directory: {self.done_dir}")
        print(f"❌ Fail directory: {self.fail_dir}")
        print(f"⏸️ Skip directory: {self.skip_dir}")
        print(f"🧪 Tests directory: {self.tests_dir}")
        print(f"🛑 Stop file: {self.stop_file}")

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
                patch_data: Dict[str, Any] = json.load(f)
                # Add file path to patch data
                patch_data['_file_path'] = patch_file
                return patch_data
        except Exception as e:
            print(f"❌ Error loading patch {patch_file}: {e}")
            return None

    def process_patch(self, patch_file: str) -> bool:
        """Process a single patch file."""
        filename = os.path.basename(patch_file)
        patch_data = self.load_patch(patch_file)

        if not patch_data:
            print(f"❌ Failed to load patch: {filename}")
            self.move_patch(patch_file, self.fail_dir, "Failed to load patch data")
            return False

        patch_id = patch_data.get("id", "unknown")
        target_file = patch_data.get("target_file", "")
        description = patch_data.get("description", "No description")

        print(f"\n🔧 Processing patch: {filename}")
        print(f"   🆔 ID: {patch_id}")
        print(f"   🎯 Target: {target_file}")
        print(f"   📝 Description: {description}")

        # First, validate the patch (dry run)
        print("   🔍 Validating patch...")
        validation_result = apply_patch(patch_data, dry_run=True)

        if not validation_result["success"]:
            print(f"   ❌ Patch validation failed: {validation_result['message']}")
            self.move_patch(
                patch_file,
                self.fail_dir,
                f"Validation failed: {validation_result['message']}",
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
            print(f"   ⚠️ Patch application failed: {apply_result['message']}")
            self.move_patch(
                patch_file,
                self.fail_dir,
                f"Application failed: {apply_result['message']}",
            )
            return False

    def move_patch(self, patch_file: str, target_dir: str, reason: str) -> None:
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

            # Write to a log file
            log_file = os.path.join(target_dir, f"{filename}.log")
            with open(log_file, 'w') as f:
                json.dump(log_entry, f, indent=2)
        except Exception as e:
            print(f"⚠️ Could not write log entry: {e}")

        # Move the file
        try:
            shutil.move(patch_file, target_file)
            print(f"   📁 Moved {filename} to {os.path.basename(target_dir)}")
        except Exception as e:
            print(f"❌ Error moving file {filename}: {e}")

    def run(self) -> None:
        """Main daemon loop."""
        print("🚀 Starting BRAUN daemon...")
        print(f"⏰ Check interval: {self.check_interval} seconds")
        print("🛑 Create .stop file to stop the daemon")

        while True:
            # Check for stop file
            if os.path.exists(self.stop_file):
                print("🛑 Stop file detected, shutting down...")
                break

            try:
                # Get pending patches
                pending_patches = self.get_pending_patches()

                if pending_patches:
                    print(f"\n📦 Found {len(pending_patches)} pending patches")
                    for patch_file in pending_patches:
                        if os.path.exists(self.stop_file):
                            break
                        self.process_patch(patch_file)
                else:
                    print("💤 No pending patches, sleeping...")

            except KeyboardInterrupt:
                print("\n🛑 Keyboard interrupt received, shutting down...")
                break
            except Exception as e:
                print(f"❌ Error in daemon loop: {e}")

            # Sleep before next check
            time.sleep(self.check_interval)

        print("✅ BRAUN daemon stopped")


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(description="BRAUN daemon for patch processing")
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

    daemon = BraunDaemon(
        patches_dir=args.patches_dir,
        check_interval=args.check_interval
    )
    daemon.run()


if __name__ == "__main__":
    main()