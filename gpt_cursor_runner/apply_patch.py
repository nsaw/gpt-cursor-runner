#!/usr/bin/env python3
"""
Script to apply saved patches to target files.
This demonstrates Option 3 functionality - direct patch application.
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, Optional, Any


def load_patch(patch_file: str) -> Optional[Dict[str, Any]]:
    """Load patch data from JSON file."""
    try:
        with open(patch_file, "r") as f:
            return json.load(f)  # type: ignore
    except Exception as e:
        print(f"❌ Error loading patch: {e}")
        return None


def apply_patch_to_file(patch_data: Dict[str, Any], target_file: str) -> bool:
    """Apply patch mutations to target file."""
    try:
        mutations = patch_data.get("mutations", [])

        for mutation in mutations:
            mutation_type = mutation.get("type")
            target = mutation.get("target")
            content = mutation.get("content", "")

            if mutation_type == "create":
                # Ensure directory exists
                target_path = Path(target)
                target_path.parent.mkdir(parents=True, exist_ok=True)

                # Create file
                with open(target, "w") as f:
                    f.write(content)
                print(f"✅ Created: {target}")

            elif mutation_type == "update":
                # Update existing file
                with open(target, "w") as f:
                    f.write(content)
                print(f"✅ Updated: {target}")

            elif mutation_type == "delete":
                # Delete file
                if os.path.exists(target):
                    os.remove(target)
                    print(f"✅ Deleted: {target}")

    except Exception as e:
        print(f"❌ Error applying patch: {e}")
        return False

    return True


def validate_patch(patch_data: Dict[str, Any]) -> bool:
    """Run validation commands for the patch."""
    try:
        validation_commands = patch_data.get("validate", {}).get("shell", [])

        for cmd in validation_commands:
            print(f"🔍 Running validation: {cmd}")
            result = os.system(cmd)
            if result != 0:
                print(f"❌ Validation failed: {cmd}")
                return False

        return True
    except Exception as e:
        print(f"❌ Error during validation: {e}")
        return False


def run_post_build(patch_data: Dict[str, Any]) -> None:
    """Run post-mutation build commands."""
    try:
        post_commands = patch_data.get("postMutationBuild", {}).get("shell", [])

        for cmd in post_commands:
            print(f"🔧 Running post-build: {cmd}")
            result = os.system(cmd)
            if result != 0:
                print(f"⚠️ Post-build command failed: {cmd}")

    except Exception as e:
        print(f"❌ Error during post-build: {e}")


def main() -> None:
    """Main function to apply a patch."""
    if len(sys.argv) != 2:
        print("Usage: python apply_patch.py <patch_file>")
        sys.exit(1)

    patch_file = sys.argv[1]
    if not os.path.exists(patch_file):
        print(f"❌ Patch file not found: {patch_file}")
        sys.exit(1)

    # Load patch data
    patch_data = load_patch(patch_file)
    if not patch_data:
        print("❌ Failed to load patch data")
        sys.exit(1)

    # Validate patch
    if not validate_patch(patch_data):
        print("❌ Patch validation failed")
        sys.exit(1)

    # Apply patch
    if not apply_patch_to_file(patch_data, patch_file):
        print("❌ Failed to apply patch")
        sys.exit(1)

    # Run post-build commands
    run_post_build(patch_data)
    print("✅ Patch applied successfully!")


if __name__ == "__main__":
    main()
