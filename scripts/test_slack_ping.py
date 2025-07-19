#!/usr/bin/env python3
"""
Test script to simulate Slack pinging the test endpoint.
"""

import requests


def test_slack_ping():
    """Test the Slack test endpoint."""

    # Simple POST request to the test endpoint
    url = "https://runner-dev.thoughtmarks.app/slack/test"

    try:
        response = requests.post(url, json={"test": "ping"})
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")

        if response.status_code == 200:
            print("✅ Slack test endpoint successful!")

            # Check if patch was created
            import os

            patches_dir = "patches"
            if os.path.exists(patches_dir):
                patch_files = [
                    f
                    for f in os.listdir(patches_dir)
                    if f.startswith("slack-test-patch_")
                ]
                if patch_files:
                    print(f"✅ Test patch created: {patch_files[-1]}")
                else:
                    print("⚠️  No test patch found")
        else:
            print("❌ Slack test endpoint failed!")

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    test_slack_ping()
