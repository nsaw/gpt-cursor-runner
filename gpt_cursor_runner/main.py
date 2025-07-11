#!/usr/bin/env python3
"""
GPT-Cursor Runner Main Application.

Flask server for handling webhooks and providing API endpoints.
"""

import os
from datetime import datetime
from flask import Flask, request, jsonify
from dotenv import load_dotenv

# Import handlers
from gpt_cursor_runner.webhook_handler import process_hybrid_block
from gpt_cursor_runner.slack_handler import (
    verify_slack_signature, 
    handle_slack_command, 
    handle_slack_event,
    send_slack_response
)
from gpt_cursor_runner.event_logger import event_logger

# Import summary manager for mandatory .md generation
try:
    from gpt_cursor_runner.summary_manager import (
        write_failure_summary,
        write_completion_summary,
        write_pause_summary,
        write_fallback_summary,
        write_manual_summary,
        write_daemon_summary
    )
    SUMMARY_MANAGER_AVAILABLE = True
except ImportError:
    SUMMARY_MANAGER_AVAILABLE = False
    print("Warning: Summary manager not available - summaries will not be generated")

# Import dashboard
try:
    from gpt_cursor_runner.dashboard import create_dashboard_routes
except ImportError:
    create_dashboard_routes = None

load_dotenv()

app = Flask(__name__)

# Create dashboard routes if available
if create_dashboard_routes:
    create_dashboard_routes(app)

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
        
        # Write completion summary
        if SUMMARY_MANAGER_AVAILABLE:
            write_completion_summary(
                result=result,
                context="webhook_processing"
            )
        
        return jsonify({"status": "success", "result": result})
        
    except Exception as e:
        error_msg = f"Error processing webhook: {str(e)}"
        
        # Log the error
        if event_logger:
            event_logger.log_system_event("webhook_error", {
                "error": str(e),
                "headers": dict(request.headers)
            })
        
        # Write failure summary
        if SUMMARY_MANAGER_AVAILABLE:
            write_failure_summary(
                error_message=str(e),
                error_type="webhook_processing_error",
                context="/webhook endpoint"
            )
        
        try:
            from gpt_cursor_runner.slack_proxy import create_slack_proxy
            slack_proxy = create_slack_proxy()
            slack_proxy.notify_error(error_msg, context="/webhook endpoint")
        except Exception:
            pass
        return jsonify({"error": error_msg}), 500

def handle_slack_webhook():
    """Handle Slack webhook requests."""
    try:
        # Verify Slack signature (skip in debug mode)
        debug_mode = os.getenv('DEBUG_MODE', 'false').lower() == 'true'
        print(f"DEBUG: DEBUG_MODE = {os.getenv('DEBUG_MODE')}, debug_mode = {debug_mode}")
        
        if not debug_mode:
            timestamp = request.headers.get('X-Slack-Request-Timestamp', '')
            signature = request.headers.get('X-Slack-Signature', '')
            
            if not verify_slack_signature(request.get_data(), signature, timestamp):
                return jsonify({"error": "Invalid signature"}), 401
        else:
            print("DEBUG: Skipping signature verification in debug mode")
        
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
            data.get('event', {})
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
        
        # Write failure summary
        if SUMMARY_MANAGER_AVAILABLE:
            write_failure_summary(
                error_message=str(e),
                error_type="slack_webhook_error",
                context="/webhook Slack handler"
            )
        
        try:
            from gpt_cursor_runner.slack_proxy import create_slack_proxy
            slack_proxy = create_slack_proxy()
            slack_proxy.notify_error(error_msg, context="/webhook Slack handler")
        except Exception:
            pass
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
            "target_file": "test-components/TestComponent.tsx",
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
        
        # Write completion summary
        if SUMMARY_MANAGER_AVAILABLE:
            write_completion_summary(
                result=result,
                patch_data=test_patch,
                context="slack_test_endpoint"
            )
        
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
        
        # Write failure summary
        if SUMMARY_MANAGER_AVAILABLE:
            write_failure_summary(
                error_message=str(e),
                error_type="slack_test_error",
                context="/slack/test endpoint"
            )
        
        try:
            from gpt_cursor_runner.slack_proxy import create_slack_proxy
            slack_proxy = create_slack_proxy()
            slack_proxy.notify_error(error_msg, context="/slack/test endpoint")
        except Exception:
            pass
        return jsonify({"error": error_msg}), 500

@app.route('/events', methods=['GET'])
def get_events():
    """Get all events."""
    if not event_logger:
        return jsonify({"error": "Event logger not available"}), 500
    
    try:
        events = event_logger.get_all_events()
        return jsonify({"events": events})
    except Exception as e:
        error_msg = f"Error retrieving events: {str(e)}"
        
        # Write failure summary
        if SUMMARY_MANAGER_AVAILABLE:
            write_failure_summary(
                error_message=str(e),
                error_type="events_retrieval_error",
                context="/events endpoint"
            )
        
        return jsonify({"error": error_msg}), 500

@app.route('/events/summary', methods=['GET'])
def get_event_summary():
    """Get event summary."""
    if not event_logger:
        return jsonify({"error": "Event logger not available"}), 500
    
    try:
        summary = event_logger.get_event_summary()
        return jsonify(summary)
    except Exception as e:
        error_msg = f"Error retrieving event summary: {str(e)}"
        
        # Write failure summary
        if SUMMARY_MANAGER_AVAILABLE:
            write_failure_summary(
                error_message=str(e),
                error_type="event_summary_error",
                context="/events/summary endpoint"
            )
        
        return jsonify({"error": error_msg}), 500

@app.route('/events/patch', methods=['GET'])
def get_patch_events():
    """Get patch events."""
    if not event_logger:
        return jsonify({"error": "Event logger not available"}), 500
    
    try:
        events = event_logger.get_patch_events()
        return jsonify({"patch_events": events})
    except Exception as e:
        error_msg = f"Error retrieving patch events: {str(e)}"
        
        # Write failure summary
        if SUMMARY_MANAGER_AVAILABLE:
            write_failure_summary(
                error_message=str(e),
                error_type="patch_events_error",
                context="/events/patch endpoint"
            )
        
        return jsonify({"error": error_msg}), 500

@app.route('/events/slack', methods=['GET'])
def get_slack_events():
    """Get Slack events."""
    if not event_logger:
        return jsonify({"error": "Event logger not available"}), 500
    
    try:
        events = event_logger.get_slack_events()
        return jsonify({"slack_events": events})
    except Exception as e:
        error_msg = f"Error retrieving Slack events: {str(e)}"
        
        # Write failure summary
        if SUMMARY_MANAGER_AVAILABLE:
            write_failure_summary(
                error_message=str(e),
                error_type="slack_events_error",
                context="/events/slack endpoint"
            )
        
        return jsonify({"error": error_msg}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    try:
        # Basic health check
        health_status = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0",
            "summary_manager": SUMMARY_MANAGER_AVAILABLE
        }
        
        # Write daemon summary for health check
        if SUMMARY_MANAGER_AVAILABLE:
            write_daemon_summary(
                daemon_name="gpt-cursor-runner",
                status="healthy",
                details="Health check passed",
                context="/health endpoint"
            )
        
        return jsonify(health_status)
    except Exception as e:
        error_msg = f"Health check failed: {str(e)}"
        
        # Write failure summary
        if SUMMARY_MANAGER_AVAILABLE:
            write_failure_summary(
                error_message=str(e),
                error_type="health_check_error",
                context="/health endpoint"
            )
        
        return jsonify({"status": "unhealthy", "error": error_msg}), 500

def main():
    """Main application entry point."""
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG_MODE', 'false').lower() == 'true'
    
    # Write startup summary
    if SUMMARY_MANAGER_AVAILABLE:
        write_daemon_summary(
            daemon_name="gpt-cursor-runner",
            status="starting",
            details=f"Starting Flask server on port {port}",
            context="application_startup"
        )
    
    print(f"🚀 Starting GPT-Cursor Runner on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)

if __name__ == '__main__':
    main()

