#!/usr/bin/env python3
"""
Post hybrid blocks to the GPT-Cursor Runner webhook endpoint.
"""

import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()


def post_hybrid_block(block_data):
    """Post a hybrid block to the webhook endpoint."""

    # Get endpoint URL from environment
    endpoint_url = os.getenv("ENDPOINT_URL")

    if not endpoint_url:
        # Fallback to development URL
        endpoint_url = os.getenv(
            "ENDPOINT_DEV_URL", "https://runner-dev.thoughtmarks.app/webhook"
        )
        print(f"⚠️  Using development endpoint: {endpoint_url}")

    print(f"📡 Posting to: {endpoint_url}")
    print(f"📦 Block data: {json.dumps(block_data, indent=2)}")

    try:
        response = requests.post(
            endpoint_url,
            json=block_data,
            headers={"Content-Type": "application/json"},
            timeout=30,
        )

        if response.status_code == 200:
            print("✅ Hybrid block posted successfully")
            return response.json()
        else:
            print(f"❌ Error posting hybrid block: {response.status_code}")
            print(f"Response: {response.text}")
            return None

    except requests.exceptions.RequestException as e:
        print(f"❌ Network error posting hybrid block: {e}")
        return None


if __name__ == "__main__":
    # Example hybrid block
    test_block = {
        "id": "test-hybrid-block",
        "role": "system",
        "description": "Test hybrid block via Cloudflare tunnel",
        "target_file": "test.md",
        "patch": "Test content",
        "metadata": {"author": "test", "source": "manual"},
    }

    result = post_hybrid_block(test_block)
    if result:
        print(f"✅ Result: {json.dumps(result, indent=2)}")
    else:
        print("❌ Failed to post hybrid block")
