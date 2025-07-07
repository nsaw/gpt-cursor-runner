#!/usr/bin/env python3
"""
UI Dashboard for GPT-Cursor Runner.

Provides Flask routes for visualizing patch applications, Slack events, and system metrics.
"""

import os
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
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
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/dashboard/events')
    def dashboard_events():
        """Get recent events for dashboard."""
        try:
            limit = request.args.get('limit', 20, type=int)
            event_type = request.args.get('type')
            
            if not event_logger:
                return jsonify({"error": "Event logging not available"}), 500
            
            events = event_logger.get_recent_events(limit, event_type)
            return jsonify({"events": events})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/dashboard/patches')
    def dashboard_patches():
        """Get recent patch data."""
        try:
            patches = get_recent_patches()
            return jsonify({"patches": patches})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/dashboard/metrics')
    def dashboard_metrics():
        """Get patch metrics."""
        try:
            if not PatchMetrics:
                return jsonify({"error": "Patch metrics not available"}), 500
            
            metrics = PatchMetrics()
            stats = metrics.get_summary_stats()
            return jsonify(stats)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

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
    
    return patches

def is_recent_file(filepath: str, hours: int) -> bool:
    """Check if file was modified within the last N hours."""
    try:
        stat = os.stat(filepath)
        modified_time = datetime.fromtimestamp(stat.st_mtime)
        return datetime.now() - modified_time < timedelta(hours=hours)
    except:
        return False

def is_recent_event(event: Dict[str, Any], hours: int) -> bool:
    """Check if event occurred within the last N hours."""
    try:
        timestamp = event.get("timestamp")
        if isinstance(timestamp, str):
            event_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        else:
            event_time = datetime.fromtimestamp(timestamp)
        
        return datetime.now() - event_time < timedelta(hours=hours)
    except:
        return False

def get_uptime() -> str:
    """Get system uptime."""
    try:
        with open('/proc/uptime', 'r') as f:
            uptime_seconds = float(f.readline().split()[0])
            uptime = timedelta(seconds=uptime_seconds)
            return str(uptime)
    except:
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
    </div>

    <script>
        function refreshDashboard() {
            loadStats();
            loadEvents();
            loadPatches();
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
        
        // Load data on page load
        refreshDashboard();
        
        // Auto-refresh every 30 seconds
        setInterval(refreshDashboard, 30000);
    </script>
</body>
</html>
""" 