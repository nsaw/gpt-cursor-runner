# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
#!/usr/bin/env python3
"""
Test script to simulate Slack pinging the test endpoint.
"""

import requests


def test_slack_ping():
    """Test Slack ping functionality."""
    try:
        # Test the Slack ping endpoint
        response = requests.get("http://localhost:5000/slack/ping", timeout=5)
        if response.status_code == 200:
            print("✅ Slack ping endpoint working!")

            # Check if there are any test patches
            import os

            patch_dir = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches"
            if os.path.exists(patch_dir):
                patch_files = [f for f in os.listdir(patch_dir) if f.endswith(".json")]
                if patch_files:
                    print(f"✅ Found {len(patch_files)} patch files")
                    print(f"Latest: {patch_files[-1]}")
                else:
                    print("⚠️  No test patch found")
            else:
                print("⚠️  No test patch found")
        else:
            print("❌ Slack test endpoint failed!")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    test_slack_ping()
