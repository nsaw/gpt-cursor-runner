#!/usr/bin/env python3
"""
Slack message sending test module
"""

import os
import requests
from datetime import datetime
def test_send_message() -> bool:
    """Test sending a message to Slack"""
    print("📤 Testing Slack message sending...")
    
    # Get Slack token from environment
    slack_token = os.getenv('SLACK_BOT_TOKEN')
    if not slack_token:
        print("❌ SLACK_BOT_TOKEN not found in environment")
        return False
    
    try:
        url = "https://slack.com/api/chat.postMessage"
        headers = {
            "Authorization": f"Bearer {slack_token}",
            "Content-Type": "application/json"
        }
        
        message = {
            "channel": "C0955JLTKJ4",  # Default channel
            "text": (f"🔔 *CYOPS Test Ping*\n\n"
                    f"Timestamp: {datetime.now().isoformat()}\n"
                    f"Source: Modular Test")
        }
        
        response = requests.post(url, headers=headers, json=message)
        result = response.json()
        
        print(f"   Status: {response.status_code}")
        
        if result.get('ok'):
            print("   ✅ Message sent successfully!")
            print(f"   Message ID: {result.get('ts', 'unknown')}")
            return True
        else:
            print("   ❌ Message sending failed!")
            print(f"   Error: {result.get('error', 'unknown error')}")
            return False
            
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return False


if __name__ == "__main__":
    test_send_message() 