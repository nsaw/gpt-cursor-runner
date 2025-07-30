#!/usr/bin/env python3
"""
GPT-Cursor Runner Main Application.

Flask server for handling webhooks and providing API endpoints.
"""

import os
import sys
import psutil
from datetime import datetime
from flask import Flask, request, jsonify
from dotenv import load_dotenv

# PATCHED: Expo conflict guard
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'scripts', 'utils'))
# Temporarily disabled expoGuard for patch delivery testing
# try:
#     from expoGuard import detect_expo_processes
#     detect_expo_processes()
# except ImportError:
#     pass  # Continue if guard not available

# Import handlers
from gpt_cursor_runner.webhook_handler import process_hybrid_block, process_summary

from gpt_cursor_runner.slack_handler import (
    verify_slack_signature,
    handle_slack_command,
    handle_slack_event,
    send_slack_response,
)
from gpt_cursor_runner.event_logger import event_logger

# Import GHOST 2.0 modules
from gpt_cursor_runner.sequential_processor import get_sequential_processor
from gpt_cursor_runner.error_recovery import get_error_recovery
from gpt_cursor_runner.rate_limiter import get_rate_limiter
from gpt_cursor_runner.request_validator import get_request_validator
from gpt_cursor_runner.audit_logger import get_audit_logger
from gpt_cursor_runner.server_fixes import get_server_fixes
from gpt_cursor_runner.error_handler import get_error_handler
from gpt_cursor_runner.health_endpoints import get_health_endpoints
from gpt_cursor_runner.cors_config import get_cors_manager

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

@app.route("/webhook", methods=["POST"])
def webhook():
    """Handle incoming webhook requests."""
    try:
        # Check if it's a Slack request
        if request.headers.get("X-Slack-Signature"):
            return handle_slack_webhook()

        # Otherwise, treat as GPT hybrid block
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        # Log the incoming request
        if event_logger:
            event_logger.log_system_event(
                "webhook_received", {"source": "gpt_hybrid_block", "data": data}
            )

        result = process_hybrid_block(data)
        return jsonify({"status": "success", "result": result})

    except Exception as e:
        error_msg = f"Error processing webhook: {str(e)}"

        # Log the error
        if event_logger:
            event_logger.log_system_event(
                "webhook_error", {"error": str(e), "headers": dict(request.headers)}
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
        debug_mode = os.getenv("DEBUG_MODE", "false").lower() == "true"
        print(
            f"DEBUG: DEBUG_MODE = {os.getenv('DEBUG_MODE')}, debug_mode = {debug_mode}"
        )

        if not debug_mode:
            timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
            signature = request.headers.get("X-Slack-Signature", "")

            if not verify_slack_signature(request.get_data(), signature, timestamp):
                return jsonify({"error": "Invalid signature"}), 401
        else:
            print("DEBUG: Skipping signature verification in debug mode")

        # Parse request data
        if request.content_type == "application/x-www-form-urlencoded":
            data = request.form.to_dict()
        else:
            data = request.get_json()

        # Log the Slack request
        if event_logger:
            event_logger.log_system_event(
                "slack_webhook_received",
                {"data": data, "headers": dict(request.headers)},
            )

        # Handle URL verification
        if data.get("type") == "url_verification":
            return jsonify({"challenge": data.get("challenge", "")})

        # Handle slash commands
        if "command" in data:
            response = handle_slack_command(data)

            # Send response if response_url is provided
            response_url = data.get("response_url")
            if response_url:
                send_slack_response(response_url, response)

            return jsonify(response)

        # Handle events
        if data.get("type") == "event_callback":
            event = data.get("event", {})
            response = handle_slack_event(data)
            return jsonify(response)

        return jsonify({"status": "ok"})

    except Exception as e:
        error_msg = f"Error processing Slack webhook: {str(e)}"

        # Log the error
        if event_logger:
            event_logger.log_system_event(
                "slack_webhook_error",
                {"error": str(e), "headers": dict(request.headers)},
            )
        try:
            from gpt_cursor_runner.slack_proxy import create_slack_proxy

            slack_proxy = create_slack_proxy()
            slack_proxy.notify_error(error_msg, context="/webhook Slack handler")
        except Exception:
            pass
        return jsonify({"error": error_msg}), 500


@app.route("/slack/test", methods=["POST"])
def slack_test():
    """Test endpoint for creating patches via Slack."""
    try:
        # Create a test patch
        test_patch = {
            "id": f"slack-test-patch-{int(datetime.now().timestamp())}",
            "role": "ui_patch",
            "description": "Test patch triggered by Slack ping",
            "target_file": (
                "mobile-native-fresh/src/components/ui/OnboardingModal_RUNNER-TEST.tsx"
            ),
            "patch": {
                "pattern": "Test patch",
                "replacement": "✅ Test patch applied successfully!",
            },
            "metadata": {
                "author": "slack-test",
                "source": "slack_test_endpoint",
                "timestamp": datetime.now().isoformat(),
            },
        }

        # Process the patch
        result = process_hybrid_block(test_patch)

        # Log the test event
        if event_logger:
            event_logger.log_system_event(
                "slack_test_triggered", {"patch_id": test_patch["id"], "result": result}
            )

        return jsonify(
            {
                "status": "success",
                "message": "Test patch created successfully",
                "patch_id": test_patch["id"],
                "result": result,
            }
        )

    except Exception as e:
        error_msg = f"Error in Slack test: {str(e)}"

        # Log the error
        if event_logger:
            event_logger.log_system_event("slack_test_error", {"error": str(e)})
        try:
            from gpt_cursor_runner.slack_proxy import create_slack_proxy

            slack_proxy = create_slack_proxy()
            slack_proxy.notify_error(error_msg, context="/slack/test endpoint")
        except Exception:
            pass
        return jsonify({"error": error_msg}), 500


@app.route("/events", methods=["GET"])
def get_events():
    """Get recent events for UI display."""
    try:
        limit = request.args.get("limit", 50, type=int)
        event_type = request.args.get("type")

        if not event_logger:
            return jsonify({"error": "Event logging not available"}), 500

        events = event_logger.get_recent_events(
            limit, event_type if isinstance(event_type, str) and event_type else None
        )
        return jsonify(
            {
                "events": events,
                "count": len(events),
                "timestamp": datetime.now().isoformat(),
            }
        )

    except Exception as e:
        return jsonify({"error": f"Error getting events: {str(e)}"}), 500


@app.route("/events/summary", methods=["GET"])
def get_event_summary():
    """Get event summary for UI display."""
    try:
        if not event_logger:
            return jsonify({"error": "Event logging not available"}), 500

        summary = event_logger.get_event_summary()
        return jsonify(summary)

    except Exception as e:
        return jsonify({"error": f"Error getting event summary: {str(e)}"}), 500


@app.route("/events/patch", methods=["GET"])
def get_patch_events():
    """Get patch-specific events."""
    try:
        limit = request.args.get("limit", 20, type=int)

        if not event_logger:
            return jsonify({"error": "Event logging not available"}), 500

        events = event_logger.get_patch_events(limit)
        return jsonify(
            {
                "events": events,
                "count": len(events),
                "timestamp": datetime.now().isoformat(),
            }
        )

    except Exception as e:
        return jsonify({"error": f"Error getting patch events: {str(e)}"}), 500


@app.route("/events/slack", methods=["GET"])
def get_slack_events():
    """Get Slack-specific events."""
    try:
        limit = request.args.get("limit", 20, type=int)

        if not event_logger:
            return jsonify({"error": "Event logging not available"}), 500

        events = event_logger.get_slack_events(limit)
        return jsonify(
            {
                "events": events,
                "count": len(events),
                "timestamp": datetime.now().isoformat(),
            }
        )

    except Exception as e:
        return jsonify({"error": f"Error getting Slack events: {str(e)}"}), 500


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint with real-time component validation."""
    try:
        response = {
            "components": {},
            "system_metrics": {},
            "version": "3.1.1",
            "timestamp": datetime.now().isoformat()
        }
        
        status_flags = []
        
        # Ghost runner check
        ghost_found = False
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                if proc.info['cmdline'] and any("ghost-runner.js" in str(arg) for arg in proc.info['cmdline']):
                    ghost_found = True
                    break
        except Exception:
            pass
        
        response['components']['ghost_runner'] = "up" if ghost_found else "down"
        if not ghost_found:
            status_flags.append("ghost_down")
        
        # Port 5555 check
        port_conflict = False
        try:
            for conn in psutil.net_connections(kind='inet'):
                if hasattr(conn, 'laddr') and conn.laddr.port == 5555:
                    port_conflict = True
                    break
        except Exception:
            pass
        
        response['components']['port_5555_bound'] = port_conflict
        if not port_conflict:
            status_flags.append("port_unbound")
        
        # Filesystem check
        try:
            test_path = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/healthcheck.tmp"
            with open(test_path, 'w') as f:
                f.write('ok')
            os.remove(test_path)
            response['components']['fs_writable'] = True
        except Exception:
            response['components']['fs_writable'] = False
            status_flags.append("fs_readonly")
        
        # Flask request queue responsiveness
        response['components']['flask_responsive'] = True
        response['components']['webhook_endpoint'] = "operational"
        
        # System metrics
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            network = psutil.net_io_counters()
            
            response['system_metrics'] = {
                'cpu': {
                    'count': psutil.cpu_count(),
                    'load_average': os.getloadavg() if hasattr(os, 'getloadavg') else [0, 0, 0],
                    'percent': cpu_percent
                },
                'memory': {
                    'total': memory.total,
                    'available': memory.available,
                    'percent': memory.percent,
                    'used': memory.used
                },
                'disk': {
                    'total': disk.total,
                    'used': disk.used,
                    'free': disk.free,
                    'percent': (disk.used / disk.total) * 100
                },
                'network': {
                    'bytes_sent': network.bytes_sent,
                    'bytes_recv': network.bytes_recv,
                    'packets_sent': network.packets_sent,
                    'packets_recv': network.packets_recv
                }
            }
        except Exception as e:
            response['system_metrics'] = {'error': str(e)}
        
        # Status logic
        if not status_flags:
            response['overall_status'] = "healthy"
        elif "ghost_down" in status_flags:
            response['overall_status'] = "degraded"
        else:
            response['overall_status'] = "unknown"
        
        return jsonify(response), 200
        
    except Exception as e:
        # Fallback to basic health check
        return jsonify(
            {
                "overall_status": "error",
                "timestamp": datetime.now().isoformat(),
                "version": "3.1.1",
                "error": str(e),
                "components": {},
                "system_metrics": {}
            }
        ), 500


@app.route("/api/patches", methods=["POST"])
def api_patches():
    """Handle patch data from ghost bridge."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        # Log the incoming patch request
        if event_logger:
            event_logger.log_system_event(
                "api_patches_received", {"source": "ghost_bridge", "data": data}
            )

        # Process the patch data
        result = process_hybrid_block(data)
        return jsonify({"status": "success", "result": result})

    except Exception as e:
        error_msg = f"Error processing patch data: {str(e)}"

        # Log the error
        if event_logger:
            event_logger.log_system_event(
                "api_patches_error", {"error": str(e), "headers": dict(request.headers)}
            )
        try:
            from gpt_cursor_runner.slack_proxy import create_slack_proxy

            slack_proxy = create_slack_proxy()
            slack_proxy.notify_error(error_msg, context="/api/patches endpoint")
        except Exception:
            pass
        return jsonify({"error": error_msg}), 500


@app.route("/api/summaries", methods=["POST"])
def api_summaries():
    """Handle summary data from ghost bridge."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        # Log the incoming summary request
        if event_logger:
            event_logger.log_system_event(
                "api_summaries_received", {"source": "ghost_bridge", "data": data}
            )

        # Process the summary data
        result = process_summary(data)
        return jsonify({"status": "success", "result": result})

    except Exception as e:
        error_msg = f"Error processing summary data: {str(e)}"

        # Log the error
        if event_logger:
            event_logger.log_system_event(
                "api_summaries_error", {"error": str(e), "headers": dict(request.headers)}
            )
        try:
            from gpt_cursor_runner.slack_proxy import create_slack_proxy

            slack_proxy = create_slack_proxy()
            slack_proxy.notify_error(error_msg, context="/api/summaries endpoint")
        except Exception:
            pass
        return jsonify({"error": error_msg}), 500


@app.route("/api/status", methods=["GET"])
def api_status():
    """API status endpoint for ghost bridge health checks."""
    return jsonify(
        {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "3.1.0",
            "endpoints": {
                "webhook": "/webhook",
                "patches": "/api/patches",
                "summaries": "/api/summaries",
                "health": "/health",
                "events": "/events",
                "resources": "/api/resources",
            },
        }
    )


@app.route("/api/resources", methods=["GET"])
def api_resources():
    """Resource monitoring endpoint."""
    try:
        from gpt_cursor_runner.resource_monitor import get_resource_monitor
        
        resource_monitor = get_resource_monitor()
        resource_data = resource_monitor.get_alerts_json()
        
        return jsonify(resource_data)
    except Exception as e:
        return jsonify(
            {
                "error": f"Resource monitoring unavailable: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        ), 500


@app.route("/api/processes", methods=["GET"])
def api_processes():
    """Process management endpoint."""
    try:
        from gpt_cursor_runner.process_cleanup import get_process_cleanup
        
        process_cleanup = get_process_cleanup()
        process_data = {
            'processes': process_cleanup.get_process_list(),
            'cleanup_history': process_cleanup.get_cleanup_history(),
            'stats': process_cleanup.get_stats()
        }
        
        return jsonify(process_data)
    except Exception as e:
        return jsonify(
            {
                "error": f"Process management unavailable: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        ), 500


@app.route("/api/processor", methods=["GET", "POST"])
def api_processor():
    """Unified processor endpoint."""
    try:
        from gpt_cursor_runner.unified_processor import get_unified_processor, RequestType
        
        processor = get_unified_processor()
        
        if request.method == "GET":
            # Return processor statistics
            return jsonify({
                'stats': processor.get_stats(),
                'timestamp': datetime.now().isoformat()
            })
        else:
            # Process a request
            data = request.get_json()
            if not data:
                return jsonify({"error": "No JSON data provided"}), 400
            
            request_type_str = data.get('type', 'webhook')
            request_data = data.get('data', {})
            
            try:
                request_type = RequestType(request_type_str)
            except ValueError:
                return jsonify({"error": f"Invalid request type: {request_type_str}"}), 400
            
            request_id = processor.submit_request(request_type, request_data)
            
            return jsonify({
                'request_id': request_id,
                'status': 'submitted',
                'timestamp': datetime.now().isoformat()
            })
            
    except Exception as e:
        return jsonify(
            {
                "error": f"Unified processor unavailable: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        ), 500


@app.route("/api/sequential", methods=["GET", "POST"])
def api_sequential():
    """Sequential processor endpoint."""
    try:
        from gpt_cursor_runner.sequential_processor import get_sequential_processor
        
        processor = get_sequential_processor()
        
        if request.method == "GET":
            # Return processor statistics
            return jsonify({
                'stats': processor.get_stats(),
                'timestamp': datetime.now().isoformat()
            })
        else:
            # Submit a sequential request
            data = request.get_json()
            if not data:
                return jsonify({"error": "No JSON data provided"}), 400
            
            workflow_name = data.get('workflow', 'webhook_processing')
            request_data = data.get('data', {})
            priority = data.get('priority', 1)
            
            request_id = processor.submit_request(workflow_name, request_data, priority)
            
            return jsonify({
                'request_id': request_id,
                'workflow': workflow_name,
                'status': 'submitted',
                'timestamp': datetime.now().isoformat()
            })
            
    except Exception as e:
        return jsonify(
            {
                "error": f"Sequential processor unavailable: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        ), 500


@app.route("/api/sequential/<request_id>", methods=["GET"])
def api_sequential_status(request_id):
    """Get status of a sequential request."""
    try:
        from gpt_cursor_runner.sequential_processor import get_sequential_processor
        
        processor = get_sequential_processor()
        status = processor.get_request_status(request_id)
        
        if status is None:
            return jsonify({"error": "Request not found"}), 404
        
        return jsonify(status)
        
    except Exception as e:
        return jsonify(
            {
                "error": f"Sequential processor unavailable: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        ), 500


@app.route("/api/errors", methods=["GET"])
def api_errors():
    """Get error recovery information."""
    try:
        error_recovery = get_error_recovery()
        stats = error_recovery.get_error_stats()
        recent_errors = error_recovery.get_recent_errors()
        
        return jsonify({
            "stats": stats,
            "recent_errors": recent_errors
        })
    except Exception as e:
        return jsonify({"error": f"Error getting error info: {str(e)}"}), 500


@app.route("/api/rate-limits", methods=["GET"])
def api_rate_limits():
    """Get rate limiting information."""
    try:
        rate_limiter = get_rate_limiter()
        stats = rate_limiter.get_stats()
        
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": f"Error getting rate limit info: {str(e)}"}), 500


@app.route("/api/validation", methods=["POST"])
def api_validation():
    """Validate a request."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        request_type = data.get("type", "api")
        request_data = data.get("data", {})
        
        validator = get_request_validator()
        report = validator.validate_request(request_type, request_data)
        
        return jsonify({
            "is_valid": report.is_valid,
            "errors": [
                {
                    "field": error.field_name,
                    "type": error.error_type,
                    "message": error.message
                }
                for error in report.errors
            ],
            "warnings": [
                {
                    "field": warning.field_name,
                    "type": warning.error_type,
                    "message": warning.message
                }
                for warning in report.warnings
            ],
            "validated_data": report.validated_data
        })
    except Exception as e:
        return jsonify({"error": f"Error validating request: {str(e)}"}), 500


@app.route("/api/audit", methods=["GET"])
def api_audit():
    """Get audit log information."""
    try:
        audit_logger = get_audit_logger()
        stats = audit_logger.get_stats()
        recent_entries = audit_logger.get_entries(limit=50)
        
        return jsonify({
            "stats": stats,
            "recent_entries": recent_entries
        })
    except Exception as e:
        return jsonify({"error": f"Error getting audit info: {str(e)}"}), 500


@app.route("/api/server-fixes", methods=["GET"])
def api_server_fixes():
    """Get server fixes information."""
    try:
        server_fixes = get_server_fixes()
        stats = server_fixes.get_stats()
        issues = server_fixes.get_issues()
        
        return jsonify({
            "stats": stats,
            "issues": issues
        })
    except Exception as e:
        return jsonify({"error": f"Error getting server fixes info: {str(e)}"}), 500


@app.route("/api/error-handler", methods=["GET"])
def api_error_handler():
    """Get error handler information."""
    try:
        error_handler = get_error_handler()
        stats = error_handler.get_stats()
        errors = error_handler.get_errors()
        
        return jsonify({
            "stats": stats,
            "errors": errors
        })
    except Exception as e:
        return jsonify({"error": f"Error getting error handler info: {str(e)}"}), 500


@app.route("/api/health-endpoints", methods=["GET"])
def api_health_endpoints():
    """Get health endpoints information."""
    try:
        health_endpoints = get_health_endpoints()
        summary = health_endpoints.get_health_summary()
        history = health_endpoints.get_health_history(hours=1)
        
        return jsonify({
            "summary": summary,
            "history": history
        })
    except Exception as e:
        return jsonify({"error": f"Error getting health endpoints info: {str(e)}"}), 500


@app.route("/api/cors", methods=["GET"])
def api_cors():
    """Get CORS configuration information."""
    try:
        cors_manager = get_cors_manager()
        stats = cors_manager.get_stats()
        history = cors_manager.get_request_history(hours=1)
        
        return jsonify({
            "stats": stats,
            "history": history
        })
    except Exception as e:
        return jsonify({"error": f"Error getting CORS info: {str(e)}"}), 500


def main():
    """Main entry point."""
    # Start health aggregator
    try:
        from gpt_cursor_runner.health_aggregator import get_health_aggregator
        health_agg = get_health_aggregator()
        health_agg.start()
        print("🏥 Health aggregator started")
    except Exception as e:
        print(f"⚠️  Health aggregator failed to start: {e}")
    
    # Start resource monitor
    try:
        from gpt_cursor_runner.resource_monitor import get_resource_monitor
        resource_monitor = get_resource_monitor()
        resource_monitor.start()
        print("📊 Resource monitor started")
    except Exception as e:
        print(f"⚠️  Resource monitor failed to start: {e}")
    
    # Start process cleanup
    try:
        from gpt_cursor_runner.process_cleanup import get_process_cleanup
        process_cleanup = get_process_cleanup()
        process_cleanup.start()
        print("🧹 Process cleanup started")
    except Exception as e:
        print(f"⚠️  Process cleanup failed to start: {e}")
    
    # Start unified processor
    try:
        from gpt_cursor_runner.unified_processor import get_unified_processor
        unified_processor = get_unified_processor()
        unified_processor.start()
        print("⚙️  Unified processor started")
    except Exception as e:
        print(f"⚠️  Unified processor failed to start: {e}")
    
    # Start sequential processor
    try:
        from gpt_cursor_runner.sequential_processor import get_sequential_processor
        sequential_processor = get_sequential_processor()
        sequential_processor.start()
        print("🔄 Sequential processor started")
    except Exception as e:
        print(f"⚠️  Sequential processor failed to start: {e}")
    
    # Start error recovery
    try:
        error_recovery = get_error_recovery()
        error_recovery.start()
        print("🛠️  Error recovery started")
    except Exception as e:
        print(f"⚠️  Error recovery failed to start: {e}")
    
    # Start rate limiter
    try:
        rate_limiter = get_rate_limiter()
        rate_limiter.start()
        print("🚦 Rate limiter started")
    except Exception as e:
        print(f"⚠️  Rate limiter failed to start: {e}")
    
    # Start request validator
    try:
        request_validator = get_request_validator()
        print("✅ Request validator initialized")
    except Exception as e:
        print(f"⚠️  Request validator failed to initialize: {e}")
    
    # Start audit logger
    try:
        audit_logger = get_audit_logger()
        audit_logger.start()
        print("📝 Audit logger started")
    except Exception as e:
        print(f"⚠️  Audit logger failed to start: {e}")
    
    # Start server fixes
    try:
        server_fixes = get_server_fixes()
        server_fixes.start()
        print("🔧 Server fixes started")
    except Exception as e:
        print(f"⚠️  Server fixes failed to start: {e}")
    
    # Start error handler
    try:
        error_handler = get_error_handler()
        error_handler.start()
        print("🚨 Error handler started")
    except Exception as e:
        print(f"⚠️  Error handler failed to start: {e}")
    
    # Start health endpoints
    try:
        health_endpoints = get_health_endpoints()
        health_endpoints.start()
        print("🏥 Health endpoints started")
    except Exception as e:
        print(f"⚠️  Health endpoints failed to start: {e}")
    
    # Start CORS manager
    try:
        cors_manager = get_cors_manager()
        print("🌐 CORS manager initialized")
    except Exception as e:
        print(f"⚠️  CORS manager failed to initialize: {e}")
    
    port = int(os.getenv("PYTHON_PORT", 5051))
    print(f"🚀 Starting GPT-Cursor Runner on port {port}")
    print(f"📡 Webhook endpoint: http://localhost:{port}/webhook")
    print(f"📊 Dashboard: http://localhost:{port}/dashboard")
    print(f"🧪 Test endpoint: http://localhost:{port}/slack/test")
    print(f"📊 Events endpoint: http://localhost:{port}/events")
    print(f"🏥 Health endpoint: http://localhost:{port}/health")
    print(f"📊 Resources endpoint: http://localhost:{port}/api/resources")
    print(f"🧹 Processes endpoint: http://localhost:{port}/api/processes")
    print(f"⚙️  Processor endpoint: http://localhost:{port}/api/processor")
    print(f"🔄 Sequential endpoint: http://localhost:{port}/api/sequential")
    print(f"🛠️  Errors endpoint: http://localhost:{port}/api/errors")
    print(f"🚦 Rate limits endpoint: http://localhost:{port}/api/rate-limits")
    print(f"✅ Validation endpoint: http://localhost:{port}/api/validation")
    print(f"📝 Audit endpoint: http://localhost:{port}/api/audit")
    print(f"🔧 Server fixes endpoint: http://localhost:{port}/api/server-fixes")
    print(f"🚨 Error handler endpoint: http://localhost:{port}/api/error-handler")
    print(f"🏥 Health endpoints: http://localhost:{port}/api/health-endpoints")
    print(f"🌐 CORS endpoint: http://localhost:{port}/api/cors")
    print("🔗 Supports: GPT hybrid blocks + Slack events + GHOST 2.0")
    app.run(host="0.0.0.0", port=port, debug=True)


if __name__ == "__main__":
    main()