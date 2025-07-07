#!/usr/bin/env python3
"""
Script to read and display saved patches from the patches/ directory.
This demonstrates how Cursor could read and process the saved hybrid blocks.
"""

import os
import json
import glob

def read_patches():
    """Read all saved patches from the patches/ directory."""
    patches_dir = "patches"
    
    if not os.path.exists(patches_dir):
        print("❌ No patches directory found")
        return []
    
    # Find all JSON files in patches directory
    patch_files = glob.glob(os.path.join(patches_dir, "*.json"))
    
    patches = []
    for file_path in patch_files:
        try:
            with open(file_path, 'r') as f:
                patch_data = json.load(f)
                patch_data['_file_path'] = file_path
                patches.append(patch_data)
        except Exception as e:
            print(f"❌ Error reading {file_path}: {e}")
    
    return patches

def display_patches(patches):
    """Display patches in a readable format."""
    if not patches:
        print("📭 No patches found")
        return
    
    print(f"📦 Found {len(patches)} patch(es):\n")
    
    for i, patch in enumerate(patches, 1):
        print(f"🔧 Patch {i}:")
        print(f"   ID: {patch.get('id', 'N/A')}")
        print(f"   Role: {patch.get('role', 'N/A')}")
        print(f"   Description: {patch.get('description', 'N/A')}")
        print(f"   Target File: {patch.get('target_file', 'N/A')}")
        print(f"   File: {patch.get('_file_path', 'N/A')}")
        
        if 'patch' in patch:
            print(f"   Pattern: {patch['patch'].get('pattern', 'N/A')}")
            print(f"   Replacement: {patch['patch'].get('replacement', 'N/A')[:100]}...")
        
        if 'metadata' in patch:
            print(f"   Author: {patch['metadata'].get('author', 'N/A')}")
        
        print()

def main():
    """Main function to read and display patches."""
    print("🔍 Reading saved patches...")
    patches = read_patches()
    display_patches(patches)
    
    if patches:
        print("💡 Next steps:")
        print("   - Parse the 'target_file' to know which file to modify")
        print("   - Use the 'pattern' and 'replacement' to apply the patch")
        print("   - Optionally commit the changes to Git")

if __name__ == "__main__":
    main() 