#!/usr/bin/env python3
"""
UI Dashboard for GPT-Cursor Runner.

Provides Flask routes for visualizing patch applications, Slack events, and system metrics.
"""

import os
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List
from flask import render_template_string, jsonify, request
import glob

# Import event logger
try:
    from .event_logger import event_logger
except ImportError:
    event_logger = None

# Import patch metrics
try:
    from .patch_metrics import PatchMetrics
except ImportError:
    PatchMetrics = None

# Import notification system
try:
    from .slack_proxy import create_slack_proxy
    slack_proxy = create_slack_proxy()
except ImportError:
    slack_proxy = None

from .patch_runner import patch_runner_health_check

def create_dashboard_routes(app):
    """Create dashboard routes for the Flask app."""
    
    @app.route('/dashboard')
    def dashboard():
        """Main dashboard page."""
        return render_template_string(DASHBOARD_HTML)
    
    @app.route('/api/dashboard/stats')
    def dashboard_stats():
        """Get dashboard statistics."""
        try:
            stats = get_dashboard_stats()
            return jsonify(stats)
        except Exception as e:
            error_msg = f"Error getting dashboard stats: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(error_msg, context="/api/dashboard/stats")
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500
    
    @app.route('/api/dashboard/events')
    def dashboard_events():
        """Get recent events for dashboard."""
        try:
            limit = request.args.get('limit', 20, type=int)
            event_type = request.args.get('type')
            
            if not event_logger:
                return jsonify({"error": "Event logging not available"}), 500
            
            events = event_logger.get_recent_events(limit, event_type if isinstance(event_type, str) and event_type else None)
            return jsonify({"events": events})
        except Exception as e:
            error_msg = f"Error getting dashboard events: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(error_msg, context="/api/dashboard/events")
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500
    
    @app.route('/api/dashboard/patches')
    def dashboard_patches():
        """Get recent patch data."""
        try:
            patches = get_recent_patches()
            return jsonify({"patches": patches})
        except Exception as e:
            error_msg = f"Error getting dashboard patches: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(error_msg, context="/api/dashboard/patches")
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500
    
    @app.route('/api/dashboard/metrics')
    def dashboard_metrics():
        """Get patch metrics."""
        try:
            if not PatchMetrics:
                return jsonify({"error": "Patch metrics not available"}), 500
            
            from .patch_metrics import metrics_tracker
            stats = metrics_tracker.get_summary()
            return jsonify(stats)
        except Exception as e:
            error_msg = f"Error getting dashboard metrics: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(error_msg, context="/api/dashboard/metrics")
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500
    
    @app.route('/api/dashboard/tunnels')
    def dashboard_tunnels():
        """Get tunnel status and information."""
        try:
            tunnels = get_tunnel_status()
            return jsonify({"tunnels": tunnels})
        except Exception as e:
            error_msg = f"Error getting tunnel status: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(error_msg, context="/api/dashboard/tunnels")
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500
    
    @app.route('/api/dashboard/agents')
    def dashboard_agents():
        """Get agent status and information."""
        try:
            agents = get_agent_status()
            return jsonify({"agents": agents})
        except Exception as e:
            error_msg = f"Error getting agent status: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(error_msg, context="/api/dashboard/agents")
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500
    
    @app.route('/api/dashboard/queues')
    def dashboard_queues():
        """Get queue status and information."""
        try:
            queues = get_queue_status()
            return jsonify({"queues": queues})
        except Exception as e:
            error_msg = f"Error getting queue status: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(error_msg, context="/api/dashboard/queues")
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500
    
    @app.route('/api/dashboard/slack-commands')
    def dashboard_slack_commands():
        """Get Slack command usage statistics."""
        try:
            commands = get_slack_command_stats()
            return jsonify({"commands": commands})
        except Exception as e:
            error_msg = f"Error getting Slack command stats: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(error_msg, context="/api/dashboard/slack-commands")
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500

    @app.route('/api/dashboard/patch-health')
    def dashboard_patch_health():
        """Get patch runner health status."""
        try:
            health = patch_runner_health_check()
            return jsonify(health)
        except Exception as e:
            return jsonify({"status": "fail", "message": str(e)})

def get_dashboard_stats() -> Dict[str, Any]:
    """Get comprehensive dashboard statistics."""
    stats = {
        "timestamp": datetime.now().isoformat(),
        "patches": {},
        "events": {},
        "slack": {},
        "system": {}
    }
    
    # Patch statistics
    patches_dir = "patches"
    if os.path.exists(patches_dir):
        patch_files = glob.glob(os.path.join(patches_dir, "*.json"))
        stats["patches"] = {
            "total": len(patch_files),
            "recent_24h": len([f for f in patch_files if is_recent_file(f, 24)]),
            "recent_7d": len([f for f in patch_files if is_recent_file(f, 7 * 24)])
        }
    
    # Event statistics
    if event_logger:
        try:
            events = event_logger.get_recent_events(1000)  # Get all recent events
            event_counts = {}
            for event in events:
                event_type = event.get("type", "unknown")
                event_counts[event_type] = event_counts.get(event_type, 0) + 1
            
            stats["events"] = {
                "total": len(events),
                "by_type": event_counts,
                "recent_24h": len([e for e in events if is_recent_event(e, 24)]),
                "recent_7d": len([e for e in events if is_recent_event(e, 7 * 24)])
            }
        except Exception as e:
            stats["events"]["error"] = str(e)
            try:
                if slack_proxy:
                    slack_proxy.notify_error(f"Error getting event stats: {e}", context="get_dashboard_stats")
            except Exception:
                pass
    
    # Slack statistics
    if event_logger:
        try:
            slack_events = event_logger.get_recent_events(1000, "slack")
            stats["slack"] = {
                "total_events": len(slack_events),
                "commands": len([e for e in slack_events if e.get("subtype") == "slash_command"]),
                "mentions": len([e for e in slack_events if e.get("subtype") == "app_mention"]),
                "recent_24h": len([e for e in slack_events if is_recent_event(e, 24)])
            }
        except Exception as e:
            stats["slack"]["error"] = str(e)
            try:
                if slack_proxy:
                    slack_proxy.notify_error(f"Error getting Slack stats: {e}", context="get_dashboard_stats")
            except Exception:
                pass
    
    # System statistics
    stats["system"] = {
        "uptime": get_uptime(),
        "memory_usage": get_memory_usage(),
        "disk_usage": get_disk_usage()
    }
    
    return stats

def get_recent_patches(limit: int = 10) -> List[Dict[str, Any]]:
    """Get recent patch data."""
    patches = []
    patches_dir = "patches"
    
    if not os.path.exists(patches_dir):
        return patches
    
    patch_files = glob.glob(os.path.join(patches_dir, "*.json"))
    patch_files.sort(key=os.path.getmtime, reverse=True)
    
    for filepath in patch_files[:limit]:
        try:
            with open(filepath, 'r') as f:
                patch_data = json.load(f)
            
            # Add file metadata
            stat = os.stat(filepath)
            patch_data["file_metadata"] = {
                "filename": os.path.basename(filepath),
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
            }
            
            patches.append(patch_data)
        except Exception as e:
            patches.append({
                "error": f"Error reading {filepath}: {str(e)}",
                "filepath": filepath
            })
            try:
                if slack_proxy:
                    slack_proxy.notify_error(f"Error reading patch file: {e}", context=filepath)
            except Exception:
                pass
    
    return patches

def is_recent_file(filepath: str, hours: int) -> bool:
    """Check if file was modified within the last N hours."""
    try:
        stat = os.stat(filepath)
        modified_time = datetime.fromtimestamp(stat.st_mtime)
        return datetime.now() - modified_time < timedelta(hours=hours)
    except Exception as e:
        if event_logger:
            event_logger.log_system_event("dashboard_is_recent_file_error", {"error": str(e), "filepath": filepath})
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error in is_recent_file: {e}", context=filepath)
        except Exception:
            pass
        return False

def is_recent_event(event: Dict[str, Any], hours: int) -> bool:
    """Check if event occurred within the last N hours."""
    try:
        timestamp = event.get("timestamp")
        if isinstance(timestamp, str):
            event_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        elif timestamp is not None:
            event_time = datetime.fromtimestamp(timestamp)
        else:
            return False
        return datetime.now() - event_time < timedelta(hours=hours)
    except Exception as e:
        if event_logger:
            event_logger.log_system_event("dashboard_is_recent_event_error", {"error": str(e), "event": event})
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error in is_recent_event: {e}", context=str(event))
        except Exception:
            pass
        return False

def get_uptime() -> str:
    """Get system uptime."""
    try:
        with open('/proc/uptime', 'r') as f:
            uptime_seconds = float(f.readline().split()[0])
            uptime = timedelta(seconds=uptime_seconds)
            return str(uptime)
    except Exception as e:
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error in get_uptime: {e}")
        except Exception:
            pass
        return "Unknown"

def get_memory_usage() -> Dict[str, Any]:
    """Get memory usage statistics."""
    try:
        import psutil
        memory = psutil.virtual_memory()
        return {
            "total": memory.total,
            "available": memory.available,
            "percent": memory.percent,
            "used": memory.used
        }
    except ImportError:
        return {"error": "psutil not available"}
    except Exception as e:
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error getting memory usage: {e}")
        except Exception:
            pass
        return {"error": str(e)}

def get_disk_usage() -> Dict[str, Any]:
    """Get disk usage statistics."""
    try:
        import psutil
        disk = psutil.disk_usage('.')
        return {
            "total": disk.total,
            "used": disk.used,
            "free": disk.free,
            "percent": (disk.used / disk.total) * 100
        }
    except ImportError:
        return {"error": "psutil not available"}
    except Exception as e:
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error getting disk usage: {e}")
        except Exception:
            pass
        return {"error": str(e)}

def get_tunnel_status() -> Dict[str, Any]:
    """Get tunnel status and information."""
    try:
        # Check for common tunnel processes
        import psutil
        tunnels = {
            "ngrok": {"status": "unknown", "processes": []},
            "cloudflared": {"status": "unknown", "processes": []},
            "expo": {"status": "unknown", "processes": []}
        }
        
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                proc_info = proc.info
                name = proc_info['name'].lower()
                cmdline = ' '.join(proc_info['cmdline'] or [])
                
                if 'ngrok' in name or 'ngrok' in cmdline:
                    tunnels["ngrok"]["processes"].append({
                        "pid": proc_info['pid'],
                        "cmdline": cmdline
                    })
                    tunnels["ngrok"]["status"] = "running"
                
                elif 'cloudflared' in name or 'cloudflared' in cmdline:
                    tunnels["cloudflared"]["processes"].append({
                        "pid": proc_info['pid'],
                        "cmdline": cmdline
                    })
                    tunnels["cloudflared"]["status"] = "running"
                
                elif 'expo' in name or 'expo' in cmdline:
                    tunnels["expo"]["processes"].append({
                        "pid": proc_info['pid'],
                        "cmdline": cmdline
                    })
                    tunnels["expo"]["status"] = "running"
                    
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        # Check for tunnel configuration files
        tunnel_configs = {
            "ngrok": os.path.exists("ngrok.yml") or os.path.exists(".ngrok2/ngrok.yml"),
            "cloudflared": os.path.exists("cloudflared.yml") or os.path.exists(".cloudflared/config.yml"),
            "expo": os.path.exists("app.json") or os.path.exists("expo.json")
        }
        
        for tunnel_type, has_config in tunnel_configs.items():
            if has_config and tunnels[tunnel_type]["status"] == "unknown":
                tunnels[tunnel_type]["status"] = "configured"
        
        return tunnels
        
    except ImportError:
        return {"error": "psutil not available"}
    except Exception as e:
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error getting tunnel status: {e}")
        except Exception:
            pass
        return {"error": str(e)}

def get_agent_status() -> Dict[str, Any]:
    """Get agent status and information."""
    try:
        agents = {
            "gpt_cursor_runner": {"status": "unknown", "processes": []},
            "slack_handler": {"status": "unknown", "processes": []},
            "dashboard": {"status": "unknown", "processes": []}
        }
        
        # Check for Python processes
        import psutil
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                proc_info = proc.info
                name = proc_info['name'].lower()
                cmdline = ' '.join(proc_info['cmdline'] or [])
                
                if 'python' in name and ('gpt_cursor_runner' in cmdline or 'main.py' in cmdline):
                    agents["gpt_cursor_runner"]["processes"].append({
                        "pid": proc_info['pid'],
                        "cmdline": cmdline
                    })
                    agents["gpt_cursor_runner"]["status"] = "running"
                
                elif 'python' in name and 'slack_handler' in cmdline:
                    agents["slack_handler"]["processes"].append({
                        "pid": proc_info['pid'],
                        "cmdline": cmdline
                    })
                    agents["slack_handler"]["status"] = "running"
                    
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        # Check for dashboard process (Flask app)
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                proc_info = proc.info
                cmdline = ' '.join(proc_info['cmdline'] or [])
                
                if 'python' in proc_info['name'].lower() and ('flask' in cmdline or 'dashboard' in cmdline):
                    agents["dashboard"]["processes"].append({
                        "pid": proc_info['pid'],
                        "cmdline": cmdline
                    })
                    agents["dashboard"]["status"] = "running"
                    
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        return agents
        
    except ImportError:
        return {"error": "psutil not available"}
    except Exception as e:
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error getting agent status: {e}")
        except Exception:
            pass
        return {"error": str(e)}

def get_queue_status() -> Dict[str, Any]:
    """Get queue status and information."""
    try:
        queues = {
            "patch_queue": {"status": "unknown", "count": 0, "items": []},
            "event_queue": {"status": "unknown", "count": 0, "items": []},
            "slack_queue": {"status": "unknown", "count": 0, "items": []}
        }
        
        # Check patch queue (patches directory)
        patches_dir = "patches"
        if os.path.exists(patches_dir):
            patch_files = glob.glob(os.path.join(patches_dir, "*.json"))
            queues["patch_queue"]["count"] = len(patch_files)
            queues["patch_queue"]["status"] = "active" if patch_files else "empty"
            
            # Get recent patch items
            for filepath in sorted(patch_files, key=os.path.getmtime, reverse=True)[:5]:
                try:
                    with open(filepath, 'r') as f:
                        patch_data = json.load(f)
                    queues["patch_queue"]["items"].append({
                        "id": patch_data.get("id", "unknown"),
                        "target_file": patch_data.get("target_file", "unknown"),
                        "status": patch_data.get("status", "unknown"),
                        "timestamp": os.path.getmtime(filepath)
                    })
                except Exception:
                    continue
        
        # Check event queue (if event logger is available)
        if event_logger:
            try:
                recent_events = event_logger.get_recent_events(10)
                queues["event_queue"]["count"] = len(recent_events)
                queues["event_queue"]["status"] = "active" if recent_events else "empty"
                
                for event in recent_events[:5]:
                    queues["event_queue"]["items"].append({
                        "type": event.get("type", "unknown"),
                        "timestamp": event.get("timestamp", "unknown"),
                        "user_id": event.get("user_id", "unknown")
                    })
            except Exception:
                queues["event_queue"]["status"] = "error"
        
        # Check Slack queue (Slack events)
        if event_logger:
            try:
                slack_events = event_logger.get_recent_events(100, "slack")
                queues["slack_queue"]["count"] = len(slack_events)
                queues["slack_queue"]["status"] = "active" if slack_events else "empty"
                
                for event in slack_events[:5]:
                    queues["slack_queue"]["items"].append({
                        "type": event.get("type", "unknown"),
                        "subtype": event.get("subtype", "unknown"),
                        "timestamp": event.get("timestamp", "unknown"),
                        "user_id": event.get("user_id", "unknown")
                    })
            except Exception:
                queues["slack_queue"]["status"] = "error"
        
        return queues
        
    except Exception as e:
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error getting queue status: {e}")
        except Exception:
            pass
        return {"error": str(e)}

def get_slack_command_stats() -> Dict[str, Any]:
    """Get Slack command usage statistics."""
    try:
        commands = {}
        
        if event_logger:
            try:
                # Get all Slack events
                slack_events = event_logger.get_recent_events(1000, "slack")
                
                # Count command usage
                for event in slack_events:
                    if event.get("subtype") == "slash_command":
                        command = event.get("command", "unknown")
                        commands[command] = commands.get(command, 0) + 1
                
                # Sort by usage count
                sorted_commands = sorted(commands.items(), key=lambda x: x[1], reverse=True)
                
                return {
                    "total_commands": len(slack_events),
                    "unique_commands": len(commands),
                    "command_usage": dict(sorted_commands[:10]),  # Top 10 commands
                    "recent_24h": len([e for e in slack_events if is_recent_event(e, 24)]),
                    "recent_7d": len([e for e in slack_events if is_recent_event(e, 7 * 24)])
                }
                
            except Exception as e:
                return {"error": f"Error processing Slack events: {str(e)}"}
        else:
            return {"error": "Event logger not available"}
            
    except Exception as e:
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error getting Slack command stats: {e}")
        except Exception:
            pass
        return {"error": str(e)}

# HTML template for the dashboard
DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GPT-Cursor Runner Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #2563eb;
        }
        .stat-label {
            color: #6b7280;
            font-size: 0.9em;
            margin-top: 5px;
        }
        .section {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section h2 {
            margin-top: 0;
            color: #1f2937;
        }
        .event-list {
            max-height: 400px;
            overflow-y: auto;
        }
        .event-item {
            padding: 10px;
            border-bottom: 1px solid #e5e7eb;
        }
        .event-item:last-child {
            border-bottom: none;
        }
        .event-time {
            color: #6b7280;
            font-size: 0.8em;
        }
        .refresh-btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-bottom: 20px;
        }
        .refresh-btn:hover {
            background: #1d4ed8;
        }
        .loading {
            text-align: center;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 GPT-Cursor Runner Dashboard</h1>
            <p>Real-time monitoring of patches, events, and system status</p>
            <button class="refresh-btn" onclick="refreshDashboard()">🔄 Refresh</button>
        </div>
        
        <div class="stats-grid" id="stats-grid">
            <div class="loading">Loading statistics...</div>
        </div>
        
        <div class="section">
            <h2>📊 Recent Events</h2>
            <div id="events-list" class="event-list">
                <div class="loading">Loading events...</div>
            </div>
        </div>
        
        <div class="section">
            <h2>🔧 Recent Patches</h2>
            <div id="patches-list" class="event-list">
                <div class="loading">Loading patches...</div>
            </div>
        </div>
        
        <div class="section">
            <h2>🌐 Tunnel Status</h2>
            <div id="tunnels-list" class="event-list">
                <div class="loading">Loading tunnel status...</div>
            </div>
        </div>
        
        <div class="section">
            <h2>🤖 Agent Status</h2>
            <div id="agents-list" class="event-list">
                <div class="loading">Loading agent status...</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📋 Queue Status</h2>
            <div id="queues-list" class="event-list">
                <div class="loading">Loading queue status...</div>
            </div>
        </div>
        
        <div class="section">
            <h2>💬 Slack Commands</h2>
            <div id="slack-commands-list" class="event-list">
                <div class="loading">Loading Slack command stats...</div>
            </div>
        </div>

        <div class="section"><h2>🩺 Patch Runner Health</h2><div id="patch-health-status" class="event-list"><div class="loading">Loading patch health...</div></div></div>
    </div>

    <script>
        function refreshDashboard() {
            loadStats();
            loadEvents();
            loadPatches();
            loadTunnels();
            loadAgents();
            loadQueues();
            loadSlackCommands();
            loadPatchHealth();
        }
        
        async function loadStats() {
            try {
                const response = await fetch('/api/dashboard/stats');
                const stats = await response.json();
                
                const statsGrid = document.getElementById('stats-grid');
                statsGrid.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-number">${stats.patches.total || 0}</div>
                        <div class="stat-label">Total Patches</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.events.total || 0}</div>
                        <div class="stat-label">Total Events</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.slack.total_events || 0}</div>
                        <div class="stat-label">Slack Events</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.patches.recent_24h || 0}</div>
                        <div class="stat-label">Patches (24h)</div>
                    </div>
                `;
            } catch (error) {
                console.error('Error loading stats:', error);
            }
        }
        
        async function loadEvents() {
            try {
                const response = await fetch('/api/dashboard/events?limit=10');
                const data = await response.json();
                
                const eventsList = document.getElementById('events-list');
                if (data.events && data.events.length > 0) {
                    eventsList.innerHTML = data.events.map(event => `
                        <div class="event-item">
                            <div><strong>${event.type || 'Unknown'}</strong></div>
                            <div class="event-time">${event.timestamp || 'Unknown time'}</div>
                            <div>${JSON.stringify(event.data || {}).substring(0, 100)}...</div>
                        </div>
                    `).join('');
                } else {
                    eventsList.innerHTML = '<div class="loading">No recent events</div>';
                }
            } catch (error) {
                console.error('Error loading events:', error);
            }
        }
        
        async function loadPatches() {
            try {
                const response = await fetch('/api/dashboard/patches');
                const data = await response.json();
                
                const patchesList = document.getElementById('patches-list');
                if (data.patches && data.patches.length > 0) {
                    patchesList.innerHTML = data.patches.map(patch => `
                        <div class="event-item">
                            <div><strong>${patch.id || 'Unknown'}</strong></div>
                            <div class="event-time">${patch.metadata?.timestamp || 'Unknown time'}</div>
                            <div>${patch.description || 'No description'}</div>
                            <div><small>Target: ${patch.target_file || 'Unknown'}</small></div>
                        </div>
                    `).join('');
                } else {
                    patchesList.innerHTML = '<div class="loading">No recent patches</div>';
                }
            } catch (error) {
                console.error('Error loading patches:', error);
            }
        }
        
        async function loadTunnels() {
            try {
                const response = await fetch('/api/dashboard/tunnels');
                const data = await response.json();
                
                const tunnelsList = document.getElementById('tunnels-list');
                if (data.tunnels && !data.tunnels.error) {
                    const tunnels = data.tunnels;
                    tunnelsList.innerHTML = Object.entries(tunnels).map(([name, info]) => {
                        const status = info.status || 'unknown';
                        const statusColor = status === 'running' ? '🟢' : status === 'configured' ? '🟡' : '🔴';
                        return `
                            <div class="event-item">
                                <div><strong>${name.toUpperCase()}</strong> ${statusColor}</div>
                                <div class="event-time">Status: ${status}</div>
                                <div>Processes: ${info.processes ? info.processes.length : 0}</div>
                            </div>
                        `;
                    }).join('');
                } else {
                    tunnelsList.innerHTML = '<div class="loading">No tunnel information available</div>';
                }
            } catch (error) {
                console.error('Error loading tunnels:', error);
            }
        }
        
        async function loadAgents() {
            try {
                const response = await fetch('/api/dashboard/agents');
                const data = await response.json();
                
                const agentsList = document.getElementById('agents-list');
                if (data.agents && !data.agents.error) {
                    const agents = data.agents;
                    agentsList.innerHTML = Object.entries(agents).map(([name, info]) => {
                        const status = info.status || 'unknown';
                        const statusColor = status === 'running' ? '🟢' : '🔴';
                        return `
                            <div class="event-item">
                                <div><strong>${name.replace(/_/g, ' ').toUpperCase()}</strong> ${statusColor}</div>
                                <div class="event-time">Status: ${status}</div>
                                <div>Processes: ${info.processes ? info.processes.length : 0}</div>
                            </div>
                        `;
                    }).join('');
                } else {
                    agentsList.innerHTML = '<div class="loading">No agent information available</div>';
                }
            } catch (error) {
                console.error('Error loading agents:', error);
            }
        }
        
        async function loadQueues() {
            try {
                const response = await fetch('/api/dashboard/queues');
                const data = await response.json();
                
                const queuesList = document.getElementById('queues-list');
                if (data.queues && !data.queues.error) {
                    const queues = data.queues;
                    queuesList.innerHTML = Object.entries(queues).map(([name, info]) => {
                        const status = info.status || 'unknown';
                        const statusColor = status === 'active' ? '🟢' : status === 'empty' ? '🟡' : '🔴';
                        return `
                            <div class="event-item">
                                <div><strong>${name.replace(/_/g, ' ').toUpperCase()}</strong> ${statusColor}</div>
                                <div class="event-time">Status: ${status}</div>
                                <div>Items: ${info.count || 0}</div>
                            </div>
                        `;
                    }).join('');
                } else {
                    queuesList.innerHTML = '<div class="loading">No queue information available</div>';
                }
            } catch (error) {
                console.error('Error loading queues:', error);
            }
        }
        
        async function loadSlackCommands() {
            try {
                const response = await fetch('/api/dashboard/slack-commands');
                const data = await response.json();
                
                const commandsList = document.getElementById('slack-commands-list');
                if (data.commands && !data.commands.error) {
                    const commands = data.commands;
                    commandsList.innerHTML = `
                        <div class="event-item">
                            <div><strong>Total Commands:</strong> ${commands.total_commands || 0}</div>
                            <div><strong>Unique Commands:</strong> ${commands.unique_commands || 0}</div>
                            <div><strong>Recent (24h):</strong> ${commands.recent_24h || 0}</div>
                            <div><strong>Recent (7d):</strong> ${commands.recent_7d || 0}</div>
                        </div>
                    `;
                    
                    if (commands.command_usage) {
                        const usageList = Object.entries(commands.command_usage).map(([cmd, count]) => `
                            <div class="event-item">
                                <div><strong>${cmd}</strong></div>
                                <div class="event-time">Used ${count} times</div>
                            </div>
                        `).join('');
                        commandsList.innerHTML += usageList;
                    }
                } else {
                    commandsList.innerHTML = '<div class="loading">No Slack command information available</div>';
                }
            } catch (error) {
                console.error('Error loading Slack commands:', error);
            }
        }

        async function loadPatchHealth() {
            try {
                const response = await fetch('/api/dashboard/patch-health');
                const health = await response.json();
                const healthDiv = document.getElementById('patch-health-status');
                healthDiv.innerHTML = `<div class="event-item"><div><strong>Status:</strong> ${health.status}</div><div>${health.message}</div></div>`;
            } catch (error) {
                console.error('Error loading patch health:', error);
            }
        }
        
        // Load data on page load
        refreshDashboard();
        
        // Auto-refresh every 30 seconds
        setInterval(refreshDashboard, 30000);
    </script>
</body>
</html>
""" 