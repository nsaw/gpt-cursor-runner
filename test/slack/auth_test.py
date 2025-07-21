#!/usr/bin/env python3
"""
Slack authentication test module
"""

import os
import requests


def test_auth():
    """Test Slack bot authentication"""
    print("🔐 Testing Slack authentication...")
    
    # Get Slack token from environment
    slack_token = os.getenv('SLACK_BOT_TOKEN')
    if not slack_token:
        print("❌ SLACK_BOT_TOKEN not found in environment")
        return False
    
    try:
        url = "https://slack.com/api/auth.test"
        headers = {
            "Authorization": f"Bearer {slack_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(url, headers=headers)
        result = response.json()
        
        print(f"   Status: {response.status_code}")
        
        if result.get('ok'):
            print("   ✅ Bot authentication successful!")
            print(f"   Bot ID: {result.get('bot_id', 'unknown')}")
            print(f"   User ID: {result.get('user_id', 'unknown')}")
            print(f"   Team: {result.get('team', 'unknown')}")
            return True
        else:
            print("   ❌ Bot authentication failed!")
            print(f"   Error: {result.get('error', 'unknown error')}")
            return False
            
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return False


if __name__ == "__main__":
    test_auth() 