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
# !/usr/bin/env python3
"""
Slack Proxy for GPT-Cursor Runner.

Provides Slack integration and communication capabilities.
"""

import os
import time
import requests
from dotenv import load_dotenv
from typing import Optional, Any

load_dotenv()


class SlackProxy:
    """Proxy for Slack integration when app installation is blocked."""

    def __init__(self) -> None:
        default_webhook = (
            "https://hooks.slack.com/services/T0955JLP5C0/B094CTKNZ8T/"
            "tDSnWOkjve1vsZBDz5CdHzb2"
        )
        self.webhook_url: str = os.getenv("SLACK_WEBHOOK_URL", default_webhook)
        self.channel: str = os.getenv("SLACK_CHANNEL", "#runner-control")
        self.username: str = os.getenv("SLACK_USERNAME", "GPT-Cursor Runner")

    def send_message(
        self, text: str, attachments: Optional[list[dict[str, Any]]] = None
    ) -> bool:
        """Send a message to Slack."""
        try:
            payload: dict[str, Any] = {
                "channel": self.channel,
                "username": self.username,
                "text": text,
            }
            if attachments:
                payload["attachments"] = attachments

            response = requests.post(self.webhook_url, json=payload, timeout=10)
            return response.status_code == 200
        except Exception as e:
            print(f"Error sending Slack message: {e}")
            return False

    def notify_patch_created(self, patch_data: dict[str, Any]) -> bool:
        """Notify when a patch is created."""
        patch_id = patch_data.get("id", "unknown")
        target_file = patch_data.get("target_file", "unknown")
        description = patch_data.get("description", "No description")

        text = f"✅ Patch created: `{patch_id}`"
        attachments = [
            {
                "color": "good",
                "fields": [
                    {"title": "Target File", "value": target_file, "short": True},
                    {"title": "Description", "value": description, "short": True},
                ],
                "footer": "GPT-Cursor Runner",
                "ts": int(time.time()),
            }
        ]
        return self.send_message(text, attachments)

    def notify_patch_applied(
        self, patch_id: str, target_file: str, success: bool
    ) -> bool:
        """Notify when a patch is applied."""
        if success:
            text = f"✅ Patch applied: `{patch_id}`"
            color = "good"
        else:
            text = f"❌ Patch failed: `{patch_id}`"
            color = "danger"

        attachments = [
            {
                "color": color,
                "fields": [
                    {"title": "Target File", "value": target_file, "short": True},
                    {
                        "title": "Status",
                        "value": "Applied" if success else "Failed",
                        "short": True,
                    },
                ],
                "footer": "GPT-Cursor Runner",
                "ts": int(time.time()),
            }
        ]
        return self.send_message(text, attachments)

    def notify_error(self, error_message: str, context: str = "") -> bool:
        """Notify about errors."""
        text = f"❌ Error: {error_message}"
        attachments = [
            {
                "color": "danger",
                "fields": [
                    {"title": "Context", "value": context or "Unknown", "short": True},
                    {
                        "title": "Time",
                        "value": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "short": True,
                    },
                ],
                "footer": "GPT-Cursor Runner",
                "ts": int(time.time()),
            }
        ]
        return self.send_message(text, attachments)

    def notify_status(self, status_message: str, health_score: int = 0) -> bool:
        """Notify about system status."""
        if health_score == 100:
            icon = "✅"
            color = "good"
        elif health_score > 50:
            icon = "⚠️"
            color = "warning"
        else:
            icon = "❌"
            color = "danger"

        text = f"{icon} **System Status**\n\n{status_message}"
        attachments = [
            {
                "color": color,
                "fields": [
                    {
                        "title": "Health Score",
                        "value": f"{health_score}%",
                        "short": True,
                    },
                    {
                        "title": "Time",
                        "value": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "short": True,
                    },
                ],
                "footer": "GPT-Cursor Runner",
                "ts": int(time.time()),
            }
        ]
        return self.send_message(text, attachments)

    def notify_command_executed(
        self, command: str, user: str, success: bool = True
    ) -> bool:
        """Notify about command execution."""
        if success:
            text = f"✅ Command executed: `{command}`"
            color = "good"
        else:
            text = f"❌ Command failed: `{command}`"
            color = "danger"

        attachments = [
            {
                "color": color,
                "fields": [
                    {"title": "Command", "value": command, "short": True},
                    {"title": "User", "value": user, "short": True},
                    {
                        "title": "Status",
                        "value": "Success" if success else "Failed",
                        "short": True,
                    },
                ],
                "footer": "GPT-Cursor Runner",
                "ts": int(time.time()),
            }
        ]
        return self.send_message(text, attachments)


def create_slack_proxy() -> SlackProxy:
    """Create a Slack proxy instance."""
    return SlackProxy()
