#!/usr/bin/env python3
"""
Script to apply saved patches to target files.
This demonstrates Option 3 functionality - direct patch application.
"""

import os
import json
import re
import glob
import argparse
from .patch_runner import apply_patch_with_retry, patch_runner_health_check

def load_patch(patch_file):
    """Load a patch from a JSON file."""
    try:
        with open(patch_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Error loading patch {patch_file}: {e}")
        return None

def apply_patch_to_file(patch_data, target_file_path):
    """Apply a patch to a target file."""
    if not os.path.exists(target_file_path):
        print(f"❌ Target file not found: {target_file_path}")
        return False
    
    try:
        # Read the target file
        with open(target_file_path, 'r') as f:
            content = f.read()
        
        # Get patch information
        pattern = patch_data['patch']['pattern']
        replacement = patch_data['patch']['replacement']
        
        # Apply the patch
        new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)
        
        # Check if content changed
        if new_content == content:
            print(f"⚠️  No changes applied to {target_file_path}")
            return False
        
        # Write the modified content back
        with open(target_file_path, 'w') as f:
            f.write(new_content)
        
        print(f"✅ Applied patch to {target_file_path}")
        return True
        
    except Exception as e:
        print(f"❌ Error applying patch to {target_file_path}: {e}")
        return False

def create_sample_target_file():
    """Create a sample target file for demonstration."""
    sample_content = """import React from 'react';
import { View, Image } from 'react-native';

export default function OnboardingModal() {
  return (
    <View>
      <Image source={require('../assets/onboarding.png')} />
    </View>
  );
}
"""
    
    # Create directories if they don't exist
    os.makedirs('src/screens', exist_ok=True)
    
    # Write sample file
    with open('src/screens/OnboardingModal.tsx', 'w') as f:
        f.write(sample_content)
    
    print("📝 Created sample target file: src/screens/OnboardingModal.tsx")

def main():
    """Main function to apply patches."""
    print("🔧 Patch Application Demo")
    print("=" * 40)
    
    # Create a sample target file if it doesn't exist
    if not os.path.exists('src/screens/OnboardingModal.tsx'):
        create_sample_target_file()
    
    # Find the most recent patch
    patch_files = glob.glob('patches/*.json')
    if not patch_files:
        print("❌ No patches found in patches/ directory")
        return
    
    # Use the most recent patch
    latest_patch = max(patch_files, key=os.path.getctime)
    print(f"📦 Using patch: {latest_patch}")
    
    # Load the patch
    patch_data = load_patch(latest_patch)
    if not patch_data:
        return
    
    # Get target file path
    target_file = patch_data.get('target_file')
    if not target_file:
        print("❌ No target_file specified in patch")
        return
    
    print(f"🎯 Target file: {target_file}")
    print(f"📝 Description: {patch_data.get('description', 'N/A')}")
    
    # Show before/after preview
    if os.path.exists(target_file):
        with open(target_file, 'r') as f:
            before_content = f.read()
        
        print("\n📄 Before:")
        print("-" * 20)
        print(before_content)
        
        # Apply the patch
        success = apply_patch_to_file(patch_data, target_file)
        
        if success:
            print("\n📄 After:")
            print("-" * 20)
            with open(target_file, 'r') as f:
                print(f.read())
    
    print("\n💡 This demonstrates how Option 3 would work:")
    print("   - Read patches from JSON files")
    print("   - Apply them directly to target files")
    print("   - Optionally commit changes to Git")

if __name__ == "__main__":
    main() 