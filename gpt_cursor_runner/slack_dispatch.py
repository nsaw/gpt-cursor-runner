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
import os
import json
import requests
from typing import Any, Dict, List, Optional

"""
Slack Dispatch Module for GPT-Cursor Runner.
Provides functions for GPT and Cursor to post messages directly to Slack.
"""


class SlackDispatcher:
    """Handles Slack dispatch for GPT and Cursor."""

    def __init__(self) -> None:
        from gpt_cursor_runner.config.config_manager import ConfigManager

        self.config: ConfigManager = ConfigManager()
        self.runner_url: str = os.getenv(
            "RUNNER_URL", "https://runner.thoughtmarks.app"
        )
        self.slack_token: Optional[str] = os.getenv("SLACK_BOT_TOKEN")

    def _make_dispatch_request(
        self, command: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        """Make a dispatch request to the runner."""
        url = f"{self.runner_url}/slack/commands"
        data: dict[str, str] = {
            "command": command,
            "text": json.dumps(payload),
            "user_name": "gpt-cursor-runner",
        }
        try:
            response = requests.post(url, json=data, timeout=10)
            response.raise_for_status()
            return {"success": True, "response": response.text}
        except requests.exceptions.RequestException as e:
            return {"success": False, "error": str(e)}

    def gpt_post_message(
        self, channel: str, text: str, blocks: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Post a message to Slack from GPT.

        Args:
            channel: Slack channel (e.g., "#runner-control")
            text: Message text
            blocks: Optional Slack blocks for rich formatting

        Returns:
            Dict with success status and response
        """
        if not self.config.is_gpt_slack_enabled():
            return {"success": False, "error": "GPT Slack dispatch is disabled"}

        payload: Dict[str, Any] = {
            "action": "postMessage",
            "channel": channel,
            "text": text,
        }
        if blocks:
            payload["blocks"] = blocks

        return self._make_dispatch_request("/gpt-slack-dispatch", payload)

    def gpt_update_message(
        self, channel: str, ts: str, text: str, blocks: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Update a message in Slack from GPT.

        Args:
            channel: Slack channel
            ts: Message timestamp
            text: Updated message text
            blocks: Optional Slack blocks

        Returns:
            Dict with success status and response
        """
        if not self.config.is_gpt_slack_enabled():
            return {"success": False, "error": "GPT Slack dispatch is disabled"}

        payload: Dict[str, Any] = {
            "action": "updateMessage",
            "channel": channel,
            "ts": ts,
            "text": text,
        }
        if blocks:
            payload["blocks"] = blocks

        return self._make_dispatch_request("/gpt-slack-dispatch", payload)

    def gpt_delete_message(self, channel: str, ts: str) -> Dict[str, Any]:
        """
        Delete a message in Slack from GPT.

        Args:
            channel: Slack channel
            ts: Message timestamp

        Returns:
            Dict with success status and response
        """
        if not self.config.is_gpt_slack_enabled():
            return {"success": False, "error": "GPT Slack dispatch is disabled"}

        payload = {"action": "deleteMessage", "channel": channel, "ts": ts}
        return self._make_dispatch_request("/gpt-slack-dispatch", payload)

    def cursor_post_message(
        self, channel: str, text: str, blocks: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Post a message to Slack from Cursor.

        Args:
            channel: Slack channel
            text: Message text
            blocks: Optional Slack blocks

        Returns:
            Dict with success status and response
        """
        payload: Dict[str, Any] = {
            "action": "postMessage",
            "channel": channel,
            "text": text,
        }
        if blocks:
            payload["blocks"] = blocks

        return self._make_dispatch_request("/cursor-slack-dispatch", payload)

    def cursor_post_code_block(
        self, channel: str, code: str, context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Post a code block to Slack from Cursor.

        Args:
            channel: Slack channel
            code: Code to post
            context: Optional context for the code

        Returns:
            Dict with success status and response
        """
        payload: Dict[str, Any] = {
            "action": "postCodeBlock",
            "channel": channel,
            "text": code,
            "context": context,
        }
        return self._make_dispatch_request("/cursor-slack-dispatch", payload)

    def cursor_update_message(
        self, channel: str, ts: str, text: str, blocks: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Update a message in Slack from Cursor.

        Args:
            channel: Slack channel
            ts: Message timestamp
            text: Updated message text
            blocks: Optional Slack blocks

        Returns:
            Dict with success status and response
        """
        payload: Dict[str, Any] = {
            "action": "updateMessage",
            "channel": channel,
            "ts": ts,
            "text": text,
        }
        if blocks:
            payload["blocks"] = blocks

        return self._make_dispatch_request("/cursor-slack-dispatch", payload)

    def cursor_delete_message(self, channel: str, ts: str) -> Dict[str, Any]:
        """
        Delete a message in Slack from Cursor.

        Args:
            channel: Slack channel
            ts: Message timestamp

        Returns:
            Dict with success status and response
        """
        payload = {"action": "deleteMessage", "channel": channel, "ts": ts}
        return self._make_dispatch_request("/cursor-slack-dispatch", payload)

    def post_cheatsheet(self, channel: Optional[str] = None) -> Dict[str, Any]:
        """
        Post a cheatsheet to Slack.

        Args:
            channel: Optional channel override

        Returns:
            Dict with success status and response
        """
        if not channel:
            channel = self.config.get_gpt_default_channel()

        cheatsheet_text = """
📎 *GPT-Cursor Runner Cheatsheet*

*Basic Commands:*
• `/status-runner` - Check runner status
• `/proceed` - Continue or approve next action
• `/again` - Retry failed or restart
• `/interrupt` - Pause or stop operations

*Manual Override:*
• `/manual-revise "instructions"` - Custom patch revision
• `/manual-append "content"` - Add content to patch
• `/send-with-logs` - Request AI with logs

*Troubleshooting:*
• `/troubleshoot` - Auto-diagnose and fix
• `/troubleshoot-oversight approve` - Approve fixes
• `/troubleshoot-oversight reject` - Reject fixes

*Slack Dispatch:*
• `/gpt-slack-dispatch` - GPT posts to Slack
• `/cursor-slack-dispatch` - Cursor posts to Slack
""".strip()

        # Ensure channel is not None after getting default
        assert channel is not None
        return self.gpt_post_message(channel, cheatsheet_text)

    def post_help(self, channel: Optional[str] = None) -> Dict[str, Any]:
        """
        Post help information to Slack.

        Args:
            channel: Optional channel override

        Returns:
            Dict with success status and response
        """
        if not channel:
            channel = self.config.get_gpt_default_channel()

        help_text = """
🤖 *GPT-Cursor Runner Help*

*Quick Actions:*
1. **Check Status**: `/status-runner`
2. **Troubleshoot**: `/troubleshoot`
3. **Manual Override**: `/manual-revise "your instructions"`
4. **Emergency Stop**: `/interrupt force`
5. **Restart Everything**: `/again restart`

*For Developers:*
• Use `/cursor-slack-dispatch` to post code blocks
• Use `/gpt-slack-dispatch` for AI-generated content
• Monitor with `/status-runner`

*Emergency Contacts:*
• Check logs in the runner dashboard
• Review recent patches with `/patch-preview`
• Lock system with `/lock-runner` if needed
""".strip()

        # Ensure channel is not None after getting default
        assert channel is not None
        return self.gpt_post_message(channel, help_text)

    def post_dashboard_ping(self, channel: Optional[str] = None) -> Dict[str, Any]:
        """
        Post a dashboard ping to Slack.

        Args:
            channel: Optional channel override

        Returns:
            Dict with success status and response
        """
        if not channel:
            channel = self.config.get_gpt_default_channel()

        ping_text = """
📊 *Dashboard Ping*

*Runner Status:* Active
*Last Check:* Just now
*System:* All systems operational

*Quick Actions:*
• View full dashboard: `/dashboard`
• Check detailed status: `/status-runner`
• Review recent activity: `/patch-preview`

*Next:* Monitor for new patches or issues
""".strip()

        # Ensure channel is not None after getting default
        assert channel is not None
        return self.gpt_post_message(channel, ping_text)


# Convenience functions for direct use
def gpt_post(
    channel: str, text: str, blocks: Optional[List[Dict]] = None
) -> Dict[str, Any]:
    """Quick function for GPT to post to Slack."""
    dispatcher = SlackDispatcher()
    return dispatcher.gpt_post_message(channel, text, blocks)


def cursor_post_code(
    channel: str, code: str, context: Optional[str] = None
) -> Dict[str, Any]:
    """Quick function for Cursor to post code to Slack."""
    dispatcher = SlackDispatcher()
    return dispatcher.cursor_post_code_block(channel, code, context)


def post_cheatsheet(channel: Optional[str] = None) -> Dict[str, Any]:
    """Quick function to post cheatsheet."""
    dispatcher = SlackDispatcher()
    if not channel:
        channel = dispatcher.config.get_gpt_default_channel()
    # Ensure channel is not None after getting default
    assert channel is not None
    return dispatcher.post_cheatsheet(channel)
