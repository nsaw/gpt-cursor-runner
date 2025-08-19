#!/bin/bash

echo "🔧 Starting precise linting error fixes..."

# Fix 1: Fix main.py - restore proper structure
echo "🔧 Fixing main.py structure..."
cat > gpt_cursor_runner/main.py << 'EOF'
# Company Confidential
# Company Confidential
#!/usr/bin/env python3
"""
GPT-Cursor Runner Main Application.

Flask server for handling webhooks and providing API endpoints.
"""

import os
import sys
import psutil
import socket
from datetime import datetime
from typing import Union, Tuple
from flask import Flask, request, jsonify, Response
from dotenv import load_dotenv

# Import handlers
from gpt_cursor_runner.webhook_handler import (
    process_hybrid_block,
    process_summary,
    handle_webhook_post,
)

from gpt_cursor_runner.slack_handler import (
    verify_slack_signature,
    handle_slack_command,
    handle_slack_event,
    send_slack_response,
)
from gpt_cursor_runner.event_logger import event_logger

# Import slack proxy for error handling
from gpt_cursor_runner.slack_proxy import create_slack_client

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
    """Handle Slack webhook requests."""
    try:
        # Verify Slack signature (skip in debug mode)
        debug_mode = os.getenv("DEBUG_MODE", "false").lower() == "true"
        print(
            f"DEBUG: DEBUG_MODE = {os.getenv('DEBUG_MODE')}, debug_mode = {debug_mode}"
        )

        if not debug_mode:
            if not verify_slack_signature(request):
                return jsonify({"error": "Invalid signature"}), 401

        # Parse the request
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data"}), 400

        # Handle different types of Slack requests
        if data.get("type") == "url_verification":
            return jsonify({"challenge": data.get("challenge")})
        elif data.get("type") == "event_callback":
            event_data = data.get("event", {})
            response = handle_slack_event(event_data)
            return jsonify(response)
        elif data.get("command"):
            response = handle_slack_command(data)
            return jsonify(response)
        else:
            return jsonify({"error": "Unknown request type"}), 400

    except Exception as e:
        print(f"Error handling Slack webhook: {e}")
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
                "local_ip": local_ip
            }
        }
        
        return jsonify(health_data)
    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 500


@app.route("/status", methods=["GET"])
def status() -> Response:
    """Status endpoint."""
    return jsonify({
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5555))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    
    print(f"Starting GPT-Cursor Runner on port {port}")
    print(f"Debug mode: {debug}")
    
    app.run(host="0.0.0.0", port=port, debug=debug)
EOF

# Fix 2: Fix slack_handler.py - add missing functions and fix type issues
echo "🔧 Fixing slack_handler.py..."
cat >> gpt_cursor_runner/slack_handler.py << 'EOF'

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
        return response
    
    return {"text": "Event received"}


def send_slack_response(channel: str, text: str, thread_ts: Optional[str] = None) -> Dict[str, Any]:
    """Send a response to a Slack channel."""
    try:
        if slack_client:
            response = slack_client.chat_postMessage(
                channel=channel,
                text=text,
                thread_ts=thread_ts
            )
            return {"success": True, "response": response}
        else:
            return {"success": False, "error": "Slack client not available"}
    except Exception as e:
        return {"success": False, "error": str(e)}
EOF

# Fix 3: Add missing newlines to all Python files
echo "📝 Adding missing newlines..."
find gpt_cursor_runner -name "*.py" -exec sh -c '
    if [ -s "$1" ] && [ "$(tail -c1 "$1" | wc -l)" -eq 0 ]; then
        echo "" >> "$1"
        echo "✅ Added newline to $1"
    fi
' sh {} \;

# Fix 4: Fix type annotations in slack_handler.py
echo "🔤 Fixing type annotations..."
sed -i '' 's/Collection\[str\]/List[str]/g' gpt_cursor_runner/slack_handler.py
sed -i '' 's/Collection\[Any\]/List[Any]/g' gpt_cursor_runner/slack_handler.py

# Fix 5: Remove unused variables
echo "🧹 Removing unused variables..."
sed -i '' '/summaries_dir = /d' gpt_cursor_runner/slack_handler.py
sed -i '' '/second_arg = /d' gpt_cursor_runner/slack_handler.py

echo "✅ Precise linting error fixes completed!"
