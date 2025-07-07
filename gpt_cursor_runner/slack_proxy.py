"""
Slack Proxy Fallback for GPT-Cursor Runner.

Provides alternative Slack integration when app installation is blocked.
"""

import os
import json
import time
import requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

class SlackProxy:
    """Proxy for Slack integration when app installation is blocked."""
    
    def __init__(self):
        self.webhook_url = os.getenv('SLACK_WEBHOOK_URL')
        self.channel = os.getenv('SLACK_CHANNEL', '#general')
        self.username = os.getenv('SLACK_USERNAME', 'GPT-Cursor Runner')
        
    def send_message(self, text: str, attachments: Optional[list] = None) -> bool:
        """Send a message to Slack via webhook."""
        if not self.webhook_url:
            print("⚠️  No Slack webhook URL configured")
            return False
        
        payload = {
            "text": text,
            "channel": self.channel,
            "username": self.username
        }
        
        if attachments:
            payload["attachments"] = attachments
        
        try:
            response = requests.post(self.webhook_url, json=payload)
            return response.status_code == 200
        except Exception as e:
            print(f"❌ Failed to send Slack message: {e}")
            return False
    
    def notify_patch_created(self, patch_id: str, target_file: str, description: str) -> bool:
        """Notify when a patch is created."""
        text = f"✅ Patch created: `{patch_id}`"
        
        attachments = [{
            "color": "good",
            "fields": [
                {
                    "title": "Target File",
                    "value": target_file,
                    "short": True
                },
                {
                    "title": "Description",
                    "value": description,
                    "short": True
                }
            ],
            "footer": "GPT-Cursor Runner",
            "ts": int(time.time())
        }]
        
        return self.send_message(text, attachments)
    
    def notify_patch_applied(self, patch_id: str, target_file: str, success: bool) -> bool:
        """Notify when a patch is applied."""
        if success:
            text = f"✅ Patch applied: `{patch_id}`"
            color = "good"
        else:
            text = f"❌ Patch failed: `{patch_id}`"
            color = "danger"
        
        attachments = [{
            "color": color,
            "fields": [
                {
                    "title": "Target File",
                    "value": target_file,
                    "short": True
                },
                {
                    "title": "Status",
                    "value": "Applied" if success else "Failed",
                    "short": True
                }
            ],
            "footer": "GPT-Cursor Runner",
            "ts": int(time.time())
        }]
        
        return self.send_message(text, attachments)
    
    def notify_error(self, error_message: str, context: str = "") -> bool:
        """Notify about errors."""
        text = f"❌ Error: {error_message}"
        
        attachments = [{
            "color": "danger",
            "fields": [
                {
                    "title": "Context",
                    "value": context or "Unknown",
                    "short": True
                },
                {
                    "title": "Time",
                    "value": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "short": True
                }
            ],
            "footer": "GPT-Cursor Runner",
            "ts": int(time.time())
        }]
        
        return self.send_message(text, attachments)

def create_slack_proxy():
    """Create a Slack proxy instance."""
    return SlackProxy() 