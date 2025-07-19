#!/usr/bin/env python3
"""
CYOPS (AGENT 2) Daemon

Automatically monitors the DEV/CYOPS patches directory and processes JSON patches,
moving them to .done after successful execution or .fail if they fail.
Processes patches sequentially until encountering a .json.stop file.
"""

from gpt_cursor_runner.read_patches import read_patches
from gpt_cursor_runner.patch_runner import apply_patch
import os
import sys
import time
import json
import shutil
import glob
from datetime import datetime
from typing import List, Dict, Any, Optional


# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


class CyopsDaemon:
    """CYOPS daemon for automatic patch processing in DEV/CYOPS environment."""

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

        # Ensure directories exist
        for directory in [self.done_dir, self.fail_dir, self.skip_dir, self.tests_dir]:
            os.makedirs(directory, exist_ok=True)

        # Set environment variable for patch reading
        os.environ["PATCHES_DIRECTORY"] = self.patches_dir

        print("🤖 CYOPS Daemon initialized")
        print(f"📁 Patches directory: {self.patches_dir}")
        print(f"✅ Done directory: {self.done_dir}")
        print(f"❌ Fail directory: {self.fail_dir}")
        print(f"⏸️ Skip directory: {self.skip_dir}")
        print(f"🧪 Tests directory: {self.tests_dir}")
        print(f"🛑 Stop file: {self.stop_file}")

    def get_pending_patches(self) -> List[str]:
        """Get list of pending patch files."""
        if not os.path.exists(self.patches_dir):
            print(f"❌ Patches directory not found: {self.patches_dir}")
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

    def load_patch(self, patch_file: str) -> Optional[Dict[str, Any]]:
        """Load patch data from file."""
        try:
            with open(patch_file, 'r') as f:
                patch_data = json.load(f)

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
                print(f"⚠️ Could not write log entry: {e}")

            # Move the file
            shutil.move(patch_file, target_file)
            print(f"   📁 Moved {filename} to {os.path.basename(target_dir)}")

        except Exception as e:
            print(f"❌ Error moving patch {filename}: {e}")

    def check_json_stop_file(self) -> bool:
        """Check if there's a .json.stop file in the patches directory."""
        json_stop_file = os.path.join(self.patches_dir, ".json.stop")
        return os.path.exists(json_stop_file)

    def check_stop_file(self) -> bool:
        """Check if daemon should stop."""
        return os.path.exists(self.stop_file)

    def run(self):
        """Main daemon loop."""
        print("🚀 CYOPS Daemon starting...")
        print(f"⏰ Check interval: {self.check_interval} seconds")
        print("🛑 Create .stop file to stop the daemon")
        print("🛑 Create .json.stop file to pause processing")
        print("=" * 50)

        processed_count = 0
        failed_count = 0

        try:
            while not self.check_stop_file():
                # Check for .json.stop file
                if self.check_json_stop_file():
                    print("🛑 Found .json.stop file - pausing processing")
                    time.sleep(self.check_interval)
                    continue

                # Get pending patches
                pending_patches = self.get_pending_patches()

                if pending_patches:
                    print(f"\n🔍 Found {len(pending_patches)} pending patches")

                    for patch_file in pending_patches:
                        # Check for .json.stop file before each patch
                        if self.check_json_stop_file():
                            print(
                                "🛑 Found .json.stop file - stopping sequential processing"
                            )
                            break

                        if self.check_stop_file():
                            break

                        if self.process_patch(patch_file):
                            processed_count += 1
                        else:
                            failed_count += 1

                        # Small delay between patches
                        time.sleep(1)
                else:
                    print(
                        f"⏳ No pending patches found. Waiting {self.check_interval}s..."
                    )

                # Wait before next check
                time.sleep(self.check_interval)

        except KeyboardInterrupt:
            print("\n🛑 CYOPS Daemon stopped by user")
        except Exception as e:
            print(f"\n❌ CYOPS Daemon error: {e}")
        finally:
            print(f"\n📊 CYOPS Daemon Summary:")
            print(f"   ✅ Successfully processed: {processed_count}")
            print(f"   ❌ Failed to process: {failed_count}")
            print("🎉 CYOPS Daemon stopped")


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="CYOPS Daemon for automatic patch processing"
    )
    parser.add_argument("--patches-dir", help="Patches directory path")
    parser.add_argument(
        "--interval", type=int, default=30, help="Check interval in seconds"
    )
    parser.add_argument("--dry-run", action="store_true", help="Run in dry-run mode")

    args = parser.parse_args()

    # Set up environment
    patches_dir = (
        args.patches_dir
        or "/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/tasks/patches"
    )
    os.environ["PATCHES_DIRECTORY"] = patches_dir

    # Create and run daemon
    daemon = CyopsDaemon(patches_dir=patches_dir, check_interval=args.interval)
    daemon.run()


if __name__ == "__main__":
    main()
