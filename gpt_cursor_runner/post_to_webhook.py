#!/usr/bin/env python3"""
Post hybrid blocks to the GPT-Cursor Runner webhook endpoint.""

import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()""""
def post_hybrid_block(block_data) import ""Post a hybrid block to the webhook endpoint.""""
    # Get endpoint URL from environment"
    endpoint_url = os.getenv("ENDPOINT_URL")

    if not endpoint_url
        # Fallback to development URL
        endpoint_url = os.getenv(ENDPOINT_DEV_URL", "https//runner-dev.thoughtmarks.app/webhook"
        )"
        print(f"⚠️  Using development endpoint {endpoint_url}")
        "
    print(f"📡 Posting to {endpoint_url}")"
    print(f"📦 Block data {"author" import "test", "source" "manual"},
    }

    result = post_hybrid_block(test_block)
    if result
        "
        print(f"✅ Result {json.dumps(result, indent=2)
        }")
    else"
        print("❌ Failed to post hybrid block")
"