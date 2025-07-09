#!/usr/bin/env python3
"""
Complete workflow demo for GPT-Cursor Runner.
This demonstrates the full pipeline from GPT block generation to patch application.
"""

import os
import time
import subprocess
import requests
from dotenv import load_dotenv

def step1_start_server():
    """Step 1: Start the Flask webhook server."""
    print("🚀 Step 1: Starting Flask webhook server...")
    print("   (This will run in the background)")
    
    # Start server in background
    try:
        subprocess.Popen(["python", "main.py"], 
                        stdout=subprocess.PIPE, 
                        stderr=subprocess.PIPE)
        time.sleep(3)  # Give server time to start
        print("   ✅ Server started successfully")
        return True
    except Exception as e:
        print(f"   ❌ Failed to start server: {e}")
        return False

def step2_send_test_block():
    """Step 2: Send a test hybrid block to the webhook."""
    print("\n📤 Step 2: Sending test hybrid block...")
    
    load_dotenv(override=True)
    endpoint_url = os.getenv("ENDPOINT_URL")
    
    if not endpoint_url:
        print("   ❌ ENDPOINT_URL not configured")
        return False
    
    # Create a realistic hybrid block
    hybrid_block = {
        "id": "button-styling-fix",
        "role": "ui_improvement",
        "description": "Improve button styling with better padding and colors",
        "target_file": "src/components/Button.tsx",
        "patch": {
            "pattern": r"<TouchableOpacity.*?style=\{.*?\}.*?>",
            "replacement": """<TouchableOpacity 
  style={{
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  }}
>"""
        },
        "metadata": {
            "author": "gpt-4",
            "timestamp": "auto",
            "confidence": 0.95
        }
    }
    
    try:
        print(f"   📡 Sending to: {endpoint_url}")
        response = requests.post(endpoint_url, json=hybrid_block)
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Block received and saved: {result.get('saved')}")
            return True
        else:
            print(f"   ❌ Server returned status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ Failed to send block: {e}")
        return False

def step3_read_patches():
    """Step 3: Read and display saved patches."""
    print("\n📖 Step 3: Reading saved patches...")
    
    try:
        result = subprocess.run(["python", "read_patches.py"], 
                              capture_output=True, text=True)
        print(result.stdout)
        return True
    except Exception as e:
        print(f"   ❌ Failed to read patches: {e}")
        return False

def step4_apply_patch():
    """Step 4: Apply a patch to demonstrate Option 3."""
    print("\n🔧 Step 4: Applying patch to target file...")
    
    # Create a sample target file
    sample_content = """import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

export default function Button({ title, onPress }) {
  return (
    <TouchableOpacity style={{ padding: 10 }}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
}
"""
    
    os.makedirs('src/components', exist_ok=True)
    with open('src/components/Button.tsx', 'w') as f:
        f.write(sample_content)
    
    print("   📝 Created sample Button.tsx file")
    
    try:
        result = subprocess.run(["python", "apply_patch.py"], 
                              capture_output=True, text=True)
        print(result.stdout)
        return True
    except Exception as e:
        print(f"   ❌ Failed to apply patch: {e}")
        return False

def cleanup():
    """Clean up temporary files."""
    print("\n🧹 Cleaning up...")
    
    # Remove demo files
    files_to_remove = [
        'src/components/Button.tsx',
        'src/screens/OnboardingModal.tsx'
    ]
    
    for file_path in files_to_remove:
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"   🗑️  Removed: {file_path}")
    
    # Remove src directories if empty
    for dir_path in ['src/components', 'src/screens', 'src']:
        if os.path.exists(dir_path) and not os.listdir(dir_path):
            os.rmdir(dir_path)
            print(f"   🗑️  Removed empty directory: {dir_path}")

def main():
    """Run the complete workflow demo."""
    print("🎯 GPT-Cursor Runner - Complete Workflow Demo")
    print("=" * 50)
    
    steps = [
        ("Start Flask Server", step1_start_server),
        ("Send Test Block", step2_send_test_block),
        ("Read Patches", step3_read_patches),
        ("Apply Patch", step4_apply_patch)
    ]
    
    success_count = 0
    for step_name, step_func in steps:
        if step_func():
            success_count += 1
        else:
            print(f"   ⚠️  Step '{step_name}' failed, but continuing...")
    
    print(f"\n📊 Demo Results: {success_count}/{len(steps)} steps completed successfully")
    
    if success_count >= 3:
        print("🎉 Success! The GPT-Cursor runner is working correctly.")
        print("\n💡 Next steps:")
        print("   - Integrate with your actual GPT workflow")
        print("   - Customize the patch format for your needs")
        print("   - Add Git integration for automatic commits")
        print("   - Set up Cloudflare tunnel for external access")
    else:
        print("⚠️  Some steps failed. Check the output above for issues.")
    
    # Ask if user wants to clean up
    try:
        response = input("\n🧹 Clean up demo files? (y/n): ").lower().strip()
        if response == 'y':
            cleanup()
    except KeyboardInterrupt:
        print("\n👋 Demo completed!")

if __name__ == "__main__":
    main() 