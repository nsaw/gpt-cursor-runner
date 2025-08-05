"""
Slack Handler for GPT-Cursor Runner.

Handles Slack slash commands, event verification, and dispatch.
"""

import os
import hmac
import hashlib
import json
from typing import Dict, Any

# Import dependencies
try:
    from .event_logger import event_logger
except ImportError:
    event_logger = None

try:
    from .slack_proxy import create_slack_proxy

    slack_proxy = create_slack_proxy()
except ImportError:
    slack_proxy = None


def verify_slack_signature(request_body: bytes, signature: str, timestamp: str) -> bool:
    """Verify Slack request signature."""
    slack_signing_secret = os.getenv("SLACK_SIGNING_SECRET")
    if not slack_signing_secret:
        return True  # Skip verification if not configured

    # Create the signature base string
    sig_basestring = f"v0:{timestamp}:{request_body.decode('utf-8')}"

    # Create the expected signature
    expected_signature = (
        "v0="
        + hmac.new(
            slack_signing_secret.encode("utf-8"),
            sig_basestring.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
    )
    return hmac.compare_digest(expected_signature, signature)


def handle_slack_command(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle Slack slash command."""
    command = request_data.get("command", "")
    text = request_data.get("text", "")
    user_id = request_data.get("user_id", "")
    channel_id = request_data.get("channel_id", "")

    # Log the command
    if event_logger:
        event_logger.log_slack_event(
            "slash_command",
            {
                "user_id": user_id,
                "channel_id": channel_id,
                "command": command,
                "text": text,
            },
        )

    # Handle /status-runner
    if command == "/status-runner":
        response = {"text": "Runner status operational"}
        if slack_proxy:
            slack_proxy.notify_status("Runner status operational", health_score=100)
        return response

    # Add more command handlers as needed
    return {"text": f"Unknown command: {command}"}


def handle_slack_event(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle Slack event (e.g., app_mention, message)."""
    event_type = event_data.get("type", "")
    user_id = event_data.get("user", "")
    channel_id = event_data.get("channel", "")
    text = event_data.get("text", "")

    # Log the event
    if event_logger:
        event_logger.log_slack_event(
            event_type,
            {
                "user_id": user_id,
                "channel_id": channel_id,
                "text": text,
            },
        )

    # Example: respond to app_mention
    if event_type == "app_mention":
        response = {"text": f"Hello <@{user_id}>! How can I help you?"}
        if slack_proxy:
            slack_proxy.notify_command_executed("app_mention", user_id, True)
        return response

    return {"text": "Event received."}


def handle_interactive_component(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Handle Slack interactive components (buttons, menus, etc.)."""
    # Log the interaction
    if event_logger:
        event_logger.log_slack_event(
            "interactive_component",
            {
                "user_id": payload.get("user", {}).get("id", "unknown"),
                "channel_id": payload.get("channel", {}).get("id", "unknown"),
                "command": payload.get("callback_id", ""),
                "text": json.dumps(payload),
            },
        )

    # Example: acknowledge the interaction
    return {"text": "Interaction received."}


def handle_event_request(request_json: Dict[str, Any]) -> Dict[str, Any]:
    """Main entry point for Slack event requests."""
    if "type" in request_json and request_json["type"] == "url_verification":
        # Slack URL verification challenge
        return {"challenge": request_json.get("challenge", "")}
    elif "event" in request_json:
        return handle_slack_event(request_json["event"])
    return {"text": "Unknown request."}


def send_slack_response(response_url: str, response_data: Dict[str, Any]) -> bool:
    """Send response to Slack via response_url."""
    try:
        import requests

        response = requests.post(response_url, json=response_data, timeout=10)
        return response.status_code == 200
    except Exception as e:
        print(f"Error sending Slack response: {e}")
        return False
