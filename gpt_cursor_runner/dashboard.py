#!/usr/bin/env python3
"""
Dashboard for GPT-Cursor Runner.

Provides web dashboard and statistics endpoints.
"""

import os
import json
import glob
from datetime import datetime, timedelta
from typing import Dict, Any, List
from flask import Flask, jsonify

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


def create_dashboard_routes(app: Flask):
    """Create dashboard routes for Flask app."""
    
    @app.route("/dashboard")
    def dashboard():
        """Serve dashboard HTML."""
        return DASHBOARD_HTML
    
    @app.route("/api/dashboard/stats")
    def dashboard_stats():
        """Get dashboard statistics."""
        try:
            stats = get_dashboard_stats()
            return jsonify(stats)
        except Exception as e:
            error_msg = f"Error getting dashboard stats: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(
                        error_msg, context="/api/dashboard/stats"
                    )
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500
    
    @app.route("/api/dashboard/events")
    def dashboard_events():
        """Get recent events."""
        try:
            if event_logger:
                events = event_logger.get_recent_events(50)
                return jsonify({"events": events})
            else:
                return jsonify({"error": "Event logger not available"}), 500
        except Exception as e:
            error_msg = f"Error getting events: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(
                        error_msg, context="/api/dashboard/events"
                    )
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500
    
    @app.route("/api/dashboard/patches")
    def dashboard_patches():
        """Get recent patches."""
        try:
            patches = get_recent_patches(20)
            return jsonify({"patches": patches})
        except Exception as e:
            error_msg = f"Error getting patches: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(
                        error_msg, context="/api/dashboard/patches"
                    )
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500
    
    @app.route("/api/dashboard/metrics")
    def dashboard_metrics():
        """Get system metrics."""
        try:
            metrics = {
                "uptime": get_uptime(),
                "memory": get_memory_usage(),
                "disk": get_disk_usage(),
            }
            return jsonify(metrics)
        except Exception as e:
            error_msg = f"Error getting metrics: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(
                        error_msg, context="/api/dashboard/metrics"
                    )
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500
    
    @app.route("/api/dashboard/tunnels")
    def dashboard_tunnels():
        """Get tunnel status."""
        try:
            tunnels = get_tunnel_status()
            return jsonify(tunnels)
        except Exception as e:
            error_msg = f"Error getting tunnel status: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(
                        error_msg, context="/api/dashboard/tunnels"
                    )
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500
    
    @app.route("/api/dashboard/agents")
    def dashboard_agents():
        """Get agent status."""
        try:
            agents = get_agent_status()
            return jsonify(agents)
        except Exception as e:
            error_msg = f"Error getting agent status: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(
                        error_msg, context="/api/dashboard/agents"
                    )
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500
    
    @app.route("/api/dashboard/queues")
    def dashboard_queues():
        """Get queue status."""
        try:
            queues = get_queue_status()
            return jsonify(queues)
        except Exception as e:
            error_msg = f"Error getting queue status: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(
                        error_msg, context="/api/dashboard/queues"
                    )
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500
    
    @app.route("/api/dashboard/slack-commands")
    def dashboard_slack_commands():
        """Get Slack command statistics."""
        try:
            stats = get_slack_command_stats()
            return jsonify(stats)
        except Exception as e:
            error_msg = f"Error getting Slack command stats: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(
                        error_msg, context="/api/dashboard/slack-commands"
                    )
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500


def get_dashboard_stats() -> Dict[str, Any]:
    """Get comprehensive dashboard statistics."""
    stats = {
        "timestamp": datetime.now().isoformat(),
        "patches": {},
        "events": {},
        "slack": {},
    }
    
    # Event statistics
    if event_logger:
        try:
            events = event_logger.get_recent_events(1000)
            event_counts = {}
            for event in events:
                event_type = event.get("type", "unknown")
                event_counts[event_type] = event_counts.get(event_type, 0) + 1
            
            stats["events"] = {
                "total": len(events),
                "by_type": event_counts,
                "recent_24h": len([e for e in events if is_recent_event(e, 24)]),
                "recent_7d": len([e for e in events if is_recent_event(e, 7 * 24)]),
            }
        except Exception as e:
            try:
                if slack_proxy:
                    slack_proxy.notify_error(
                        f"Error getting event stats: {e}", context="get_dashboard_stats"
                    )
            except Exception:
                pass
    
    # Slack statistics
    if event_logger:
        try:
            slack_events = event_logger.get_slack_events(1000)
            slack_counts = {}
            for event in slack_events:
                event_type = event.get("event_type", "unknown")
                slack_counts[event_type] = slack_counts.get(event_type, 0) + 1
            
            stats["slack"] = {
                "total_events": len(slack_events),
                "by_type": slack_counts,
                "recent_24h": len([e for e in slack_events if is_recent_event(e, 24)]),
            }
        except Exception as e:
            try:
                if slack_proxy:
                    slack_proxy.notify_error(
                        f"Error getting Slack stats: {e}", context="get_dashboard_stats"
                    )
            except Exception:
                pass
    
    return stats


def get_recent_patches(limit: int = 20) -> List[Dict[str, Any]]:
    """Get recent patches from the patches directory."""
    patches = []
    patches_dir = os.getenv("PATCHES_DIRECTORY", "patches")
    
    if os.path.exists(patches_dir):
        patch_files = glob.glob(os.path.join(patches_dir, "*.json"))
        patch_files.sort(key=os.path.getmtime, reverse=True)
        
        for patch_file in patch_files[:limit]:
            try:
                with open(patch_file, "r") as f:
                    patch_data = json.load(f)
                    patch_data["filepath"] = patch_file
                    patch_data["modified"] = datetime.fromtimestamp(
                        os.path.getmtime(patch_file)
                    ).isoformat()
                    patches.append(patch_data)
            except Exception as e:
                print(f"Error reading patch file {patch_file}: {e}")
    
    return patches


def get_uptime() -> Dict[str, Any]:
    """Get system uptime information."""
    try:
        import psutil
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.now() - boot_time
        
        return {
            "boot_time": boot_time.isoformat(),
            "uptime_seconds": int(uptime.total_seconds()),
            "uptime_days": uptime.days,
            "uptime_hours": uptime.seconds // 3600,
            "uptime_minutes": (uptime.seconds % 3600) // 60,
        }
    except ImportError:
        return {"error": "psutil not available"}


def get_memory_usage() -> Dict[str, Any]:
    """Get memory usage information."""
    try:
        import psutil
        memory = psutil.virtual_memory()
        
        return {
            "total": memory.total,
            "available": memory.available,
            "used": memory.used,
            "percent": memory.percent,
            "free": memory.free,
        }
    except ImportError:
        return {"error": "psutil not available"}


def get_disk_usage() -> Dict[str, Any]:
    """Get disk usage information."""
    try:
        import psutil
        disk = psutil.disk_usage("/")
        
        return {
            "total": disk.total,
            "used": disk.used,
            "free": disk.free,
            "percent": (disk.used / disk.total) * 100,
        }
    except ImportError:
        return {"error": "psutil not available"}


def get_tunnel_status() -> Dict[str, Any]:
    """Get tunnel status information."""
    # Placeholder for tunnel status
    return {
        "status": "unknown",
        "tunnels": [],
    }


def get_agent_status() -> Dict[str, Any]:
    """Get agent status information."""
    # Placeholder for agent status
    return {
        "status": "unknown",
        "agents": [],
    }


def get_queue_status() -> Dict[str, Any]:
    """Get queue status information."""
    # Placeholder for queue status
    return {
        "status": "unknown",
        "queues": [],
    }


def get_slack_command_stats() -> Dict[str, Any]:
    """Get Slack command statistics."""
    if event_logger:
        try:
            slack_events = event_logger.get_slack_events(1000)
            command_counts = {}
            
            for event in slack_events:
                if event.get("event_type") == "slash_command":
                    command = event.get("command", "unknown")
                    command_counts[command] = command_counts.get(command, 0) + 1
            
            return {
                "total_commands": len([e for e in slack_events if e.get("event_type") == "slash_command"]),
                "by_command": command_counts,
                "recent_24h": len([e for e in slack_events if e.get("event_type") == "slash_command" and is_recent_event(e, 24)]),
            }
        except Exception as e:
            return {"error": f"Error getting Slack command stats: {e}"}
    
    return {"error": "Event logger not available"}


def is_recent_event(event: Dict[str, Any], hours: int) -> bool:
    """Check if an event is within the specified hours."""
    try:
        event_time = datetime.fromisoformat(event.get("timestamp", ""))
        cutoff_time = datetime.now() - timedelta(hours=hours)
        return event_time > cutoff_time
    except Exception:
        return False


# Dashboard HTML template
DASHBOARD_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>GPT-Cursor Runner Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: #f5f5f5; padding: 20px; margin: 10px 0; border-radius: 5px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .stat { background: white; padding: 15px; border-radius: 5px; text-align: center; }
        .stat h3 { margin: 0 0 10px 0; color: #333; }
        .stat .value { font-size: 24px; font-weight: bold; color: #007cba; }
        .events { max-height: 400px; overflow-y: auto; }
        .event { background: white; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .event .timestamp { color: #666; font-size: 12px; }
        .event .type { font-weight: bold; color: #007cba; }
    </style>
</head>
<body>
    <div class="container">
        <h1>GPT-Cursor Runner Dashboard</h1>
        
        <div class="card">
            <h2>System Statistics</h2>
            <div class="stats" id="stats"></div>
        </div>
        
        <div class="card">
            <h2>Recent Events</h2>
            <div class="events" id="events"></div>
        </div>
    </div>
    
    <script>
        function loadStats() {
            fetch('/api/dashboard/stats')
                .then(response => response.json())
                .then(data => {
                    const statsDiv = document.getElementById('stats');
                    statsDiv.innerHTML = '';
                    
                    if (data.events) {
                        statsDiv.innerHTML += `
                            <div class="stat">
                                <h3>Total Events</h3>
                                <div class="value">${data.events.total}</div>
                            </div>
                            <div class="stat">
                                <h3>Last 24h</h3>
                                <div class="value">${data.events.recent_24h}</div>
                            </div>
                        `;
                    }
                })
                .catch(error => console.error('Error loading stats:', error));
        }
        
        function loadEvents() {
            fetch('/api/dashboard/events')
                .then(response => response.json())
                .then(data => {
                    const eventsDiv = document.getElementById('events');
                    eventsDiv.innerHTML = '';
                    
                    if (data.events) {
                        data.events.forEach(event => {
                            eventsDiv.innerHTML += `
                                <div class="event">
                                    <div class="timestamp">${event.timestamp}</div>
                                    <div class="type">${event.type}</div>
                                    <div>${JSON.stringify(event, null, 2)}</div>
                                </div>
                            `;
                        });
                    }
                })
                .catch(error => console.error('Error loading events:', error));
        }
        
        // Load data on page load
        loadStats();
        loadEvents();
        
        // Refresh every 30 seconds
        setInterval(() => {
            loadStats();
            loadEvents();
        }, 30000);
    </script>
</body>
</html>
"""