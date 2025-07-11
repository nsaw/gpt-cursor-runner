#!/usr/bin/env python3
"""
Apply All Queued Patches Script

Applies all patches in the patches/ directory that haven't been applied yet.
"""

import os
import json
import glob
from datetime import datetime
from gpt_cursor_runner.patch_runner import apply_patch_with_retry, log_patch_entry

def get_patch_files():
    """Get all patch files sorted by timestamp."""
    patch_files = glob.glob("patches/*.json")
    # Sort by modification time (newest first)
    patch_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
    return patch_files

def apply_all_patches(dry_run=True, force=False, force_root=None):
    """Apply all patches in the patches directory."""
    patch_files = get_patch_files()
    
    if not patch_files:
        print("No patch files found in patches/ directory")
        return
    
    print(f"Found {len(patch_files)} patch files:")
    for patch_file in patch_files:
        print(f"  - {os.path.basename(patch_file)}")
    
    print(f"\n{'DRY RUN' if dry_run else 'APPLYING'} patches...")
    
    results = []
    for patch_file in patch_files:
        try:
            with open(patch_file, 'r') as f:
                patch_data = json.load(f)
            
            print(f"\n📄 Processing: {patch_data.get('id', 'unknown')}")
            print(f"🎯 Target: {patch_data.get('target_file', 'unknown')}")
            
            # Apply patch
            if force_root:
                # Temporarily set TARGET_PROJECT_DIR environment variable
                original_target_dir = os.environ.get('TARGET_PROJECT_DIR')
                os.environ['TARGET_PROJECT_DIR'] = force_root
                try:
                    result = apply_patch_with_retry(patch_data, dry_run=dry_run, force=force)
                finally:
                    if original_target_dir:
                        os.environ['TARGET_PROJECT_DIR'] = original_target_dir
                    else:
                        os.environ.pop('TARGET_PROJECT_DIR', None)
            else:
                result = apply_patch_with_retry(patch_data, dry_run=dry_run, force=force)
            
            # Log the result
            log_patch_entry(patch_data, result)
            
            # Display result
            print(f"✅ Success: {result['success']}")
            print(f"📝 Message: {result['message']}")
            
            if result.get("backup_created"):
                print(f"💾 Backup: {result['backup_file']}")
            
            results.append({
                "patch_file": patch_file,
                "patch_id": patch_data.get('id', 'unknown'),
                "success": result['success'],
                "message": result['message']
            })
            
        except Exception as e:
            print(f"❌ Error processing {patch_file}: {e}")
            results.append({
                "patch_file": patch_file,
                "patch_id": "unknown",
                "success": False,
                "message": f"Error: {e}"
            })
    
    # Summary
    successful = sum(1 for r in results if r['success'])
    total = len(results)
    
    print(f"\n📊 Summary:")
    print(f"✅ Successful: {successful}/{total}")
    print(f"❌ Failed: {total - successful}/{total}")
    
    if not dry_run:
        print(f"\n🎉 Applied {successful} patches successfully!")
    else:
        print(f"\n🔍 Dry run completed. {successful} patches would be applied.")

if __name__ == "__main__":
    import sys
    
    dry_run = "--dry-run" in sys.argv
    force = "--force" in sys.argv
    
    # Check for --force-root parameter
    force_root = None
    for i, arg in enumerate(sys.argv):
        if arg == "--force-root" and i + 1 < len(sys.argv):
            force_root = sys.argv[i + 1]
            break
    
    print("🚀 GPT-Cursor Runner - Apply All Patches")
    print("=" * 50)
    
    apply_all_patches(dry_run=dry_run, force=force, force_root=force_root) 