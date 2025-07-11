#!/usr/bin/env python3
"""
GPT-Cursor Runner Main Application.

Flask server for handling webhooks and providing API endpoints.
"""

import os
import json
from datetime import datetime
from flask import Flask, request, jsonify
from dotenv import load_dotenv

# Import handlers
from .webhook_handler import process_hybrid_block
from .slack_handler import (
    verify_slack_signature, 
    handle_slack_command, 
    handle_slack_event,
    send_slack_response
)
from .event_logger import event_logger

# Import dashboard
try:
    from .dashboard import create_dashboard_routes
except ImportError:
    create_dashboard_routes = None

# Import admin dashboard
try:
    from .admin_dashboard import create_admin_dashboard_routes
except ImportError:
    create_admin_dashboard_routes = None

# Import admin authentication
try:
    from .admin_config import create_admin_auth_routes
except ImportError:
    create_admin_auth_routes = None

load_dotenv()

app = Flask(__name__)

# Create dashboard routes if available
if create_dashboard_routes:
    create_dashboard_routes(app)

# Create admin authentication routes if available
if create_admin_auth_routes:
    create_admin_auth_routes(app)

# Create admin dashboard routes if available
if create_admin_dashboard_routes:
    create_admin_dashboard_routes(app)

@app.route('/webhook', methods=['POST'])
def webhook():
    """Handle incoming webhook requests."""
    try:
        # Check if it's a Slack request
        if request.headers.get('X-Slack-Signature'):
            return handle_slack_webhook()
        
        # Otherwise, treat as GPT hybrid block
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        # Log the incoming request
        if event_logger:
            event_logger.log_system_event("webhook_received", {
                "source": "gpt_hybrid_block",
                "data": data
            })
        
        result = process_hybrid_block(data)
        return jsonify({"status": "success", "result": result})
        
    except Exception as e:
        error_msg = f"Error processing webhook: {str(e)}"
        
        # Log the error
        if event_logger:
            event_logger.log_system_event("webhook_error", {
                "error": str(e),
                "headers": dict(request.headers)
            })
        
        return jsonify({"error": error_msg}), 500

def handle_slack_webhook():
    """Handle Slack webhook requests."""
    try:
        # Verify Slack signature
        timestamp = request.headers.get('X-Slack-Request-Timestamp', '')
        signature = request.headers.get('X-Slack-Signature', '')
        
        if not verify_slack_signature(request.get_data(), signature, timestamp):
            return jsonify({"error": "Invalid signature"}), 401
        
        # Parse request data
        if request.content_type == 'application/x-www-form-urlencoded':
            data = request.form.to_dict()
        else:
            data = request.get_json()
        
        # Log the Slack request
        if event_logger:
            event_logger.log_system_event("slack_webhook_received", {
                "data": data,
                "headers": dict(request.headers)
            })
        
        # Handle URL verification
        if data.get('type') == 'url_verification':
            return jsonify({"challenge": data.get('challenge', '')})
        
        # Handle slash commands
        if 'command' in data:
            response = handle_slack_command(data)
            
            # Send response if response_url is provided
            response_url = data.get('response_url')
            if response_url:
                send_slack_response(response_url, response)
            
            return jsonify(response)
        
        # Handle events
        if data.get('type') == 'event_callback':
            event = data.get('event', {})
            response = handle_slack_event(data)
            return jsonify(response)
        
        return jsonify({"status": "ok"})
        
    except Exception as e:
        error_msg = f"Error processing Slack webhook: {str(e)}"
        
        # Log the error
        if event_logger:
            event_logger.log_system_event("slack_webhook_error", {
                "error": str(e),
                "headers": dict(request.headers)
            })
        
        return jsonify({"error": error_msg}), 500

@app.route('/slack/test', methods=['POST'])
def slack_test():
    """Test endpoint for creating patches via Slack."""
    try:
        # Create a test patch
        test_patch = {
            "id": f"slack-test-patch-{int(datetime.now().timestamp())}",
            "role": "ui_patch",
            "description": "Test patch triggered by Slack ping",
            "target_file": "mobile-native-fresh/src/components/ui/OnboardingModal_RUNNER-TEST.tsx",
            "patch": {
                "pattern": "Test patch",
                "replacement": "✅ Test patch applied successfully!"
            },
            "metadata": {
                "author": "slack-test",
                "source": "slack_test_endpoint",
                "timestamp": datetime.now().isoformat()
            }
        }
        
        # Process the patch
        result = process_hybrid_block(test_patch)
        
        # Log the test event
        if event_logger:
            event_logger.log_system_event("slack_test_triggered", {
                "patch_id": test_patch["id"],
                "result": result
            })
        
        return jsonify({
            "status": "success",
            "message": "Test patch created successfully",
            "patch_id": test_patch["id"],
            "result": result
        })
        
    except Exception as e:
        error_msg = f"Error in Slack test: {str(e)}"
        
        # Log the error
        if event_logger:
            event_logger.log_system_event("slack_test_error", {
                "error": str(e)
            })
        
        return jsonify({"error": error_msg}), 500

@app.route('/events', methods=['GET'])
def get_events():
    """Get recent events for UI display."""
    try:
        limit = request.args.get('limit', 50, type=int)
        event_type = request.args.get('type')
        
        if not event_logger:
            return jsonify({"error": "Event logging not available"}), 500
        
        events = event_logger.get_recent_events(limit, event_type)
        return jsonify({
            "events": events,
            "count": len(events),
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({"error": f"Error getting events: {str(e)}"}), 500

@app.route('/events/summary', methods=['GET'])
def get_event_summary():
    """Get event summary for UI display."""
    try:
        if not event_logger:
            return jsonify({"error": "Event logging not available"}), 500
        
        summary = event_logger.get_event_summary()
        return jsonify(summary)
        
    except Exception as e:
        return jsonify({"error": f"Error getting event summary: {str(e)}"}), 500

@app.route('/events/patch', methods=['GET'])
def get_patch_events():
    """Get patch-specific events."""
    try:
        limit = request.args.get('limit', 20, type=int)
        
        if not event_logger:
            return jsonify({"error": "Event logging not available"}), 500
        
        events = event_logger.get_patch_events(limit)
        return jsonify({
            "events": events,
            "count": len(events),
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({"error": f"Error getting patch events: {str(e)}"}), 500

@app.route('/events/slack', methods=['GET'])
def get_slack_events():
    """Get Slack-specific events."""
    try:
        limit = request.args.get('limit', 20, type=int)
        
        if not event_logger:
            return jsonify({"error": "Event logging not available"}), 500
        
        events = event_logger.get_slack_events(limit)
        return jsonify({
            "events": events,
            "count": len(events),
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({"error": f"Error getting Slack events: {str(e)}"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    })

def main():
    """Main function to run the Flask server."""
    port = int(os.getenv('PORT', 5050))
    
    print(f"🚀 Starting GPT-Cursor Runner on port {port}")
    print(f"📡 Webhook endpoint: http://localhost:{port}/webhook")
    if create_dashboard_routes:
        print(f"📊 Dashboard: http://localhost:{port}/dashboard")
    print(f"🧪 Test endpoint: http://localhost:{port}/slack/test")
    print(f"📊 Events endpoint: http://localhost:{port}/events")
    print(f"🔗 Supports: GPT hybrid blocks + Slack events")
    
    app.run(host='0.0.0.0', port=port, debug=True)

if __name__ == '__main__':
    main()

