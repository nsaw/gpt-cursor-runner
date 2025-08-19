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
# Company Confidential
# Company Confidential
# Company Confidential
#!/usr/bin/env python3
# Company Confidential
"""
GPT-Cursor Runner Main Application.

Flask server for handling webhooks and providing API endpoints.
"""

import os
import sys
import psutil
import socket
import subprocess
import json
import time
from datetime import datetime
from typing import Union, Tuple
from flask import Flask, request, jsonify, Response
from dotenv import load_dotenv

# Import handlers
from gpt_cursor_runner.webhook_handler import handle_webhook_post
from gpt_cursor_runner.slack_handler import (
    verify_slack_signature,
    handle_slack_command,
    handle_slack_event,
    handle_slack_interaction,
)

# Import dashboard
try:
    from gpt_cursor_runner.dashboard import create_dashboard_routes
except ImportError:
    create_dashboard_routes = None

# PATCHED: Expo conflict guard
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "scripts", "utils"))
# Temporarily disabled expoGuard for patch delivery testing
# try:
#     from expoGuard import detect_expo_processes
#     detect_expo_processes()
# except ImportError:
#     pass  # Continue if guard not available

load_dotenv()

app = Flask(__name__)

# Create dashboard routes if available
if create_dashboard_routes is not None:
    create_dashboard_routes(app)


@app.route("/webhook", methods=["POST"])
def webhook() -> Union[Response, Tuple[Response, int]]:
    """Handle incoming webhook requests."""
    # Check if it's a Slack request
    if request.headers.get("X-Slack-Signature"):
        return handle_slack_webhook()

    # Otherwise, use enhanced webhook handler for GPT requests
    return handle_webhook_post()


def handle_slack_webhook() -> Union[Response, Tuple[Response, int]]:
    """Handle generic Slack webhook POSTs (legacy). Prefer /slack/* routes."""
    try:
        debug_mode = os.getenv("DEBUG_MODE", "false").lower() == "true"
        timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
        signature = request.headers.get("X-Slack-Signature", "")
        raw_body = request.get_data()  # RAW BODY REQUIRED FOR HMAC BASE STRING

        if not debug_mode:
            if not verify_slack_signature(timestamp, signature, raw_body):
                return jsonify({"error": "Invalid signature"}), 401

        # Slack Events API uses JSON; Slash commands use form-encoded
        if request.mimetype == "application/json":
            data = request.get_json(silent=True) or {}
            if data.get("type") == "url_verification":
                return jsonify({"challenge": data.get("challenge")})
            if data.get("type") == "event_callback":
                event_data = data.get("event", {})
                response = handle_slack_event(event_data)
                return jsonify(response)
            return jsonify({"error": "Unsupported JSON payload"}), 400

        # Fallback: treat as slash command form payload
        form_data = request.form.to_dict()
        if form_data.get("command"):
            response = handle_slack_command(form_data)
            return jsonify(response)

        return jsonify({"error": "Unknown request type"}), 400

    except Exception as e:
        print(f"Error handling Slack webhook: {e}")
        return jsonify({"error": "Internal server error"}), 500


# --- First-class Slack HTTP endpoints matching the manifest ---


@app.route("/slack/commands", methods=["POST"])
def slack_commands() -> Union[Response, Tuple[Response, int]]:
    try:
        debug_mode = os.getenv("DEBUG_MODE", "false").lower() == "true"
        timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
        signature = request.headers.get("X-Slack-Signature", "")
        raw_body = request.get_data()

        if not debug_mode:
            if not verify_slack_signature(timestamp, signature, raw_body):
                return jsonify({"error": "Invalid signature"}), 401

        # Slash commands are form-encoded
        form_data = request.form.to_dict()
        response = handle_slack_command(form_data)

        # Ensure Slack-compatible response shape
        if isinstance(response, dict) and "response_type" not in response:
            response = {"response_type": "ephemeral", **response}
        return jsonify(response)
    except Exception as e:
        print(f"/slack/commands error: {e}")
        return (
            jsonify(
                {
                    "response_type": "ephemeral",
                    "text": "❌ Error processing command.",
                }
            ),
            500,
        )


@app.route("/slack/events", methods=["POST"])
def slack_events() -> Union[Response, Tuple[Response, int]]:
    try:
        debug_mode = os.getenv("DEBUG_MODE", "false").lower() == "true"
        timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
        signature = request.headers.get("X-Slack-Signature", "")
        raw_body = request.get_data()

        if not debug_mode:
            if not verify_slack_signature(timestamp, signature, raw_body):
                return jsonify({"error": "Invalid signature"}), 401

        data = request.get_json(silent=True) or {}
        if data.get("type") == "url_verification":
            return jsonify({"challenge": data.get("challenge")})
        if data.get("type") == "event_callback":
            event_data = data.get("event", {})
            response = handle_slack_event(event_data)
            return jsonify(response)
        return jsonify({"error": "Unknown event type"}), 400
    except Exception as e:
        print(f"/slack/events error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/slack/interactions", methods=["POST"])
def slack_interactions() -> Union[Response, Tuple[Response, int]]:
    try:
        debug_mode = os.getenv("DEBUG_MODE", "false").lower() == "true"
        timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
        signature = request.headers.get("X-Slack-Signature", "")
        raw_body = request.get_data()

        if not debug_mode:
            if not verify_slack_signature(timestamp, signature, raw_body):
                return jsonify({"error": "Invalid signature"}), 401

        # Interactions are form-encoded with a `payload` param
        payload = request.form.get("payload", "")
        response = handle_slack_interaction({"payload": payload})
        if isinstance(response, dict) and "response_type" not in response:
            response = {"response_type": "ephemeral", **response}
        return jsonify(response)
    except Exception as e:
        print(f"/slack/interactions error: {e}")
        return (
            jsonify(
                {
                    "response_type": "ephemeral",
                    "text": "❌ Error processing interaction.",
                }
            ),
            500,
        )


@app.route("/slack/oauth/callback", methods=["GET"])
def slack_oauth_callback() -> Union[Response, Tuple[Response, int]]:
    """Handle Slack OAuth callback for app installation."""
    try:
        # Get the authorization code from the request
        code = request.args.get("code")
        state = request.args.get("state")

        if not code:
            return jsonify({"error": "No authorization code provided"}), 400

        print(f"Received OAuth callback with code: {code[:10]}... and state: {state}")

        # Exchange the code for an access token
        # This would typically involve making a request to Slack's OAuth API
        # For now, we'll just log the code and return a success message

        # In a real implementation, you would:
        # 1. Exchange the code for an access token using Slack's OAuth API
        # 2. Store the token securely
        # 3. Register the app with the workspace

        print("OAuth callback processed successfully")

        return jsonify(
            {
                "status": "success",
                "message": "App installed successfully! You can now use slash commands.",
                "code_received": code[:10] + "...",
            }
        )

    except Exception as e:
        print(f"Error handling OAuth callback: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/health", methods=["GET"])
def health() -> Response:
    """Health check endpoint."""
    try:
        # Get system info
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")

        # Get network info
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)

        health_data = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "system": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "disk_percent": disk.percent,
                "hostname": hostname,
                "local_ip": local_ip,
            },
        }

        return jsonify(health_data)
    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 500


@app.route("/status", methods=["GET"])
def status() -> Response:
    """Status endpoint."""
    return jsonify(
        {
            "status": "running",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0",
        }
    )


@app.route("/api/status", methods=["GET"])
def api_status() -> Response:
    """API status endpoint for handlers."""
    try:
        # Get system info
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()

        # Get PM2 status
        pm2_status = {}
        try:
            result = subprocess.run(
                ["pm2", "jlist"], capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                pm2_data = json.loads(result.stdout)
                for proc in pm2_data:
                    pm2_status[proc["name"]] = {
                        "status": proc["pm2_env"]["status"],
                        "memory": proc["monit"]["memory"],
                        "cpu": proc["monit"]["cpu"],
                    }
        except Exception as e:
            pm2_status = {"error": str(e)}

        status_data = {
            "status": "running",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0",
            "system": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "uptime": time.time(),
            },
            "processes": pm2_status,
        }

        return jsonify(status_data)
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5051))
    debug = os.getenv("DEBUG", "false").lower() == "true"

    print(f"Starting GPT-Cursor Runner on port {port}")
    print(f"Debug mode: {debug}")

    app.run(host="0.0.0.0", port=port, debug=debug)
