#!/usr/bin/env python3
"""
Slack webhook test module
"""

import os
import requests
from datetime import datetime


def test_webhook():
    """Test Slack webhook functionality"""
    print("🔗 Testing Slack webhook...")
    
    # Get webhook URL from environment
    webhook_url = os.getenv('SLACK_WEBHOOK_URL')
    if not webhook_url:
        print("❌ SLACK_WEBHOOK_URL not found in environment")
        return False
    
    try:
        message = {
            "text": f"🔔 *CYOPS Webhook Test*\n\nTimestamp: {datetime.now().isoformat()}\nSource: Modular Test"
        }
        
        response = requests.post(webhook_url, json=message)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ Webhook message sent successfully!")
            return True
        else:
            print("   ❌ Webhook message failed!")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return False


if __name__ == "__main__":
    test_webhook() 