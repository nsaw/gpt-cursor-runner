#!/usr/bin/env python3
"""
BRAUN (AGENT 1) Patch Processor

This script demonstrates how BRAUN should process patches from the correct directory.
It reads patches from the tm-mobile-cursor patches directory and applies them.
"""

from gpt_cursor_runner.patch_runner import apply_patch
from gpt_cursor_runner.read_patches import read_patches
import os
import sys
from typing import List, Dict, Any

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def setup_braun_environment() -> None:
    """Set up BRAUN environment to read from correct patches directory."""
    # Set the patches directory to the tm-mobile-cursor location
    patches_dir = (
        "/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/tasks/patches"
    )
    os.environ["PATCHES_DIRECTORY"] = patches_dir
    print(f"🔧 BRAUN configured to read patches from: {patches_dir}")


def process_pending_patches() -> List[Dict[str, Any]]:
    """Process all pending patches in the patches directory."""
    print("🔍 BRAUN scanning for pending patches...")

    patches = read_patches()
    print(f"📦 Found {len(patches)} patches to process")

    processed_patches = []

    for patch in patches:
        patch_id = patch.get("id", "unknown")
        target_file = patch.get("target_file", "")
        description = patch.get("description", "No description")

        print(f"\n🔧 Processing patch: {patch_id}")
        print(f"   🎯 Target: {target_file}")
        print(f"   📝 Description: {description}")

        # Apply the patch (dry run first for safety)
        result = apply_patch(patch, dry_run=True)

        if result["success"]:
            print("   ✅ Patch validated successfully")
            processed_patches.append(
                {"patch": patch, "result": result, "status": "validated"}
            )
        else:
            print(f"   ❌ Patch validation failed: {result['message']}")
            processed_patches.append(
                {"patch": patch, "result": result, "status": "failed"}
            )

    return processed_patches


def apply_approved_patches(patches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Apply patches that have been approved."""
    print("\n🚀 BRAUN applying approved patches...")

    applied_patches = []

    for patch_info in patches:
        if patch_info["status"] == "validated":
            patch = patch_info["patch"]
            patch_id = patch.get("id", "unknown")

            print(f"\n🔧 Applying patch: {patch_id}")

            # Apply the patch (not dry run)
            result = apply_patch(patch, dry_run=False)

            if result["success"] and result["changes_made"]:
                print("   ✅ Patch applied successfully")
                applied_patches.append(
                    {"patch": patch, "result": result, "status": "applied"}
                )
            else:
                print(f"   ⚠️  Patch application failed: {result['message']}")
                applied_patches.append(
                    {"patch": patch, "result": result, "status": "failed"}
                )

    return applied_patches


def main() -> None:
    """Main BRAUN patch processing workflow."""
    print("🤖 BRAUN (AGENT 1) Patch Processor")
    print("=" * 50)

    # Set up environment
    setup_braun_environment()

    # Process pending patches
    processed_patches = process_pending_patches()

    if not processed_patches:
        print("\n📭 No patches found to process.")
        return

    # Apply approved patches
    applied_patches = apply_approved_patches(processed_patches)

    # Summary
    print("\n📊 BRAUN Processing Summary")
    print("=" * 30)
    print(f"📦 Total patches found: {len(processed_patches)}")

    applied_count = len([p for p in applied_patches if p['status'] == 'applied'])
    failed_count = len([p for p in applied_patches if p['status'] == 'failed'])

    print(f"✅ Successfully applied: {applied_count}")
    print(f"❌ Failed to apply: {failed_count}")

    print("\n🎉 BRAUN patch processing complete!")


if __name__ == "__main__":
    main()
