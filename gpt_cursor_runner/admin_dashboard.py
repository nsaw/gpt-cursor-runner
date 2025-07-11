#!/usr/bin/env python3
"""
Admin Dashboard for GPT-Cursor Runner.

Provides comprehensive monitoring and management interface with remote access capabilities.
Includes agent queue execution, patch processing, summary generation, and service health monitoring.
"""

import os
import json
import time
import threading
import subprocess
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from flask import render_template_string, jsonify, request, Response, redirect
import psutil
import glob

# Import existing components
try:
    from .event_logger import event_logger
except ImportError:
    event_logger = None

try:
    from .patch_metrics import PatchMetrics
except ImportError:
    PatchMetrics = None

class HealthMonitor:
    """Monitors health of various services and components."""
    
    def __init__(self):
        self.health_checks = {
            "ghost_runner": self._check_ghost_runner_health,
            "tunnel": self._check_tunnel_health,
            "fly_bot": self._check_fly_bot_health,
            "database": self._check_database_health,
            "webhook_endpoint": self._check_webhook_health,
            "slack_integration": self._check_slack_health
        }
        self.last_health_check = {}
        self.health_cache = {}
        self.cache_duration = 30  # seconds
    
    def _check_ghost_runner_health(self) -> Dict[str, Any]:
        """Check Ghost Runner delivery service health."""
        try:
            # Check if ghost runner process is running
            ghost_processes = []
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    if 'ghost' in proc.info['name'].lower() or any('ghost' in str(cmd).lower() for cmd in proc.info['cmdline'] or []):
                        ghost_processes.append({
                            'pid': proc.info['pid'],
                            'name': proc.info['name'],
                            'status': proc.status()
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            
            # Check for ghost runner logs
            ghost_logs = []
            log_patterns = ['ghost*.log', 'runner*.log', 'delivery*.log']
            for pattern in log_patterns:
                for log_file in glob.glob(pattern):
                    try:
                        stat = os.stat(log_file)
                        ghost_logs.append({
                            'file': log_file,
                            'size': stat.st_size,
                            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat()
                        })
                    except:
                        pass
            
            return {
                'status': 'healthy' if ghost_processes else 'unhealthy',
                'processes': ghost_processes,
                'logs': ghost_logs,
                'last_check': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'last_check': datetime.now().isoformat()
            }
    
    def _check_tunnel_health(self) -> Dict[str, Any]:
        """Check tunnel service health."""
        try:
            # Check for common tunnel processes
            tunnel_processes = []
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    if any(tunnel_name in proc.info['name'].lower() for tunnel_name in ['ngrok', 'localtunnel', 'cloudflared']):
                        tunnel_processes.append({
                            'pid': proc.info['pid'],
                            'name': proc.info['name'],
                            'status': proc.status()
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            
            # Check tunnel endpoints
            tunnel_endpoints = []
            try:
                # Check common tunnel ports
                for port in [4040, 8080, 3000]:
                    try:
                        response = requests.get(f'http://localhost:{port}/api/tunnel/status', timeout=5)
                        if response.status_code == 200:
                            tunnel_endpoints.append({
                                'port': port,
                                'status': 'active',
                                'response': response.json()
                            })
                    except:
                        pass
            except:
                pass
            
            return {
                'status': 'healthy' if tunnel_processes or tunnel_endpoints else 'unhealthy',
                'processes': tunnel_processes,
                'endpoints': tunnel_endpoints,
                'last_check': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'last_check': datetime.now().isoformat()
            }
    
    def _check_fly_bot_health(self) -> Dict[str, Any]:
        """Check Fly Bot health."""
        try:
            # Check for fly bot processes
            fly_processes = []
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    if 'fly' in proc.info['name'].lower() or any('fly' in str(cmd).lower() for cmd in proc.info['cmdline'] or []):
                        fly_processes.append({
                            'pid': proc.info['pid'],
                            'name': proc.info['name'],
                            'status': proc.status()
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            
            # Check fly.io deployment status
            fly_status = 'unknown'
            try:
                result = subprocess.run(['flyctl', 'status'], capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    fly_status = 'deployed'
                else:
                    fly_status = 'not_deployed'
            except:
                fly_status = 'flyctl_not_available'
            
            return {
                'status': 'healthy' if fly_processes else 'unhealthy',
                'processes': fly_processes,
                'deployment_status': fly_status,
                'last_check': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'last_check': datetime.now().isoformat()
            }
    
    def _check_database_health(self) -> Dict[str, Any]:
        """Check database health."""
        try:
            # Check for database files
            db_files = []
            for pattern in ['*.db', '*.sqlite', '*.json']:
                for db_file in glob.glob(pattern):
                    try:
                        stat = os.stat(db_file)
                        db_files.append({
                            'file': db_file,
                            'size': stat.st_size,
                            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat()
                        })
                    except:
                        pass
            
            return {
                'status': 'healthy' if db_files else 'no_database_files',
                'files': db_files,
                'last_check': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'last_check': datetime.now().isoformat()
            }
    
    def _check_webhook_health(self) -> Dict[str, Any]:
        """Check webhook endpoint health."""
        try:
            # Test webhook endpoint
            webhook_url = os.getenv('WEBHOOK_URL', 'http://localhost:5000/webhook')
            try:
                response = requests.post(webhook_url, json={'test': True}, timeout=5)
                webhook_status = 'healthy' if response.status_code < 500 else 'error'
            except:
                webhook_status = 'unreachable'
            
            return {
                'status': webhook_status,
                'url': webhook_url,
                'last_check': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'last_check': datetime.now().isoformat()
            }
    
    def _check_slack_health(self) -> Dict[str, Any]:
        """Check Slack integration health."""
        try:
            # Check Slack environment variables
            slack_vars = {
                'SLACK_BOT_TOKEN': bool(os.getenv('SLACK_BOT_TOKEN')),
                'SLACK_SIGNING_SECRET': bool(os.getenv('SLACK_SIGNING_SECRET')),
                'SLACK_APP_TOKEN': bool(os.getenv('SLACK_APP_TOKEN'))
            }
            
            # Check recent Slack events
            slack_events = []
            if event_logger:
                slack_events = event_logger.get_slack_events(5)
            
            return {
                'status': 'healthy' if all(slack_vars.values()) else 'missing_config',
                'environment_vars': slack_vars,
                'recent_events': len(slack_events),
                'last_check': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'last_check': datetime.now().isoformat()
            }
    
    def get_all_health_status(self) -> Dict[str, Any]:
        """Get health status for all services."""
        current_time = time.time()
        
        # Check cache
        if (current_time - self.last_health_check.get('all', 0)) < self.cache_duration:
            return self.health_cache.get('all', {})
        
        health_status = {}
        for service_name, check_func in self.health_checks.items():
            health_status[service_name] = check_func()
        
        # Cache results
        self.health_cache['all'] = health_status
        self.last_health_check['all'] = current_time
        
        return health_status

class AgentQueueMonitor:
    """Monitors agent queue execution and status."""
    
    def __init__(self):
        self.queue_stats = {
            'total_processed': 0,
            'currently_queued': 0,
            'failed_tasks': 0,
            'average_processing_time': 0,
            'last_processed': None
        }
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get current queue statistics."""
        # Analyze recent events to determine queue status
        if event_logger:
            recent_events = event_logger.get_recent_events(100)
            
            # Count different types of events
            patch_events = [e for e in recent_events if e.get('type') == 'patch_event']
            system_events = [e for e in recent_events if e.get('type') == 'system_event']
            
            # Calculate processing times
            processing_times = []
            for event in patch_events:
                if 'result' in event and 'processing_time' in event['result']:
                    processing_times.append(event['result']['processing_time'])
            
            avg_time = sum(processing_times) / len(processing_times) if processing_times else 0
            
            return {
                'total_processed': len(patch_events),
                'currently_queued': 0,  # Would need queue system integration
                'failed_tasks': len([e for e in patch_events if e.get('result', {}).get('status') == 'failed']),
                'average_processing_time': avg_time,
                'last_processed': patch_events[-1]['timestamp'] if patch_events else None,
                'recent_activity': len(recent_events)
            }
        
        return self.queue_stats

class SummaryTracker:
    """Tracks summary generation and delivery."""
    
    def __init__(self):
        self.summary_stats = {
            'total_generated': 0,
            'last_generated': None,
            'delivery_success_rate': 0,
            'average_generation_time': 0
        }
    
    def get_summary_stats(self) -> Dict[str, Any]:
        """Get summary generation statistics."""
        if event_logger:
            recent_events = event_logger.get_recent_events(100)
            
            # Look for summary-related events
            summary_events = [e for e in recent_events if 'summary' in e.get('event_type', '').lower()]
            
            return {
                'total_generated': len(summary_events),
                'last_generated': summary_events[-1]['timestamp'] if summary_events else None,
                'delivery_success_rate': 100,  # Would need delivery tracking
                'average_generation_time': 0,  # Would need timing data
                'recent_summaries': summary_events[:5]
            }
        
        return self.summary_stats

def create_admin_dashboard_routes(app):
    """Create admin dashboard routes for the Flask app."""
    
    # Import admin config
    try:
        from .admin_config import admin_config
    except ImportError:
        admin_config = None
    
    # Initialize monitors
    health_monitor = HealthMonitor()
    agent_monitor = AgentQueueMonitor()
    summary_tracker = SummaryTracker()
    
    @app.route('/admin')
    def admin_dashboard():
        """Main admin dashboard page."""
        if admin_config:
            # Check authentication
            auth_token = request.cookies.get('admin_token') or request.headers.get('X-Admin-Token')
            if not auth_token or not admin_config.verify_session_token(auth_token):
                return redirect('/admin/login')
        
        return render_template_string(ADMIN_DASHBOARD_HTML)
    
    @app.route('/api/admin/health')
    def admin_health():
        """Get comprehensive health status."""
        try:
            health_status = health_monitor.get_all_health_status()
            return jsonify(health_status)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/admin/queue')
    def admin_queue():
        """Get agent queue statistics."""
        try:
            queue_stats = agent_monitor.get_queue_stats()
            return jsonify(queue_stats)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/admin/summary')
    def admin_summary():
        """Get summary generation statistics."""
        try:
            summary_stats = summary_tracker.get_summary_stats()
            return jsonify(summary_stats)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/admin/patches')
    def admin_patches():
        """Get detailed patch processing statistics."""
        try:
            patches = get_detailed_patch_stats()
            return jsonify(patches)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/admin/system')
    def admin_system():
        """Get comprehensive system statistics."""
        try:
            system_stats = get_system_stats()
            return jsonify(system_stats)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/admin/events/stream')
    def admin_events_stream():
        """Stream real-time events."""
        def generate():
            while True:
                if event_logger:
                    events = event_logger.get_recent_events(5)
                    yield f"data: {json.dumps({'events': events, 'timestamp': datetime.now().isoformat()})}\n\n"
                time.sleep(5)
        
        return Response(generate(), mimetype='text/event-stream')

def get_detailed_patch_stats() -> Dict[str, Any]:
    """Get detailed patch processing statistics."""
    stats = {
        "total_patches": 0,
        "successful_patches": 0,
        "failed_patches": 0,
        "pending_patches": 0,
        "average_processing_time": 0,
        "last_patch_processed": None,
        "patch_types": {},
        "target_files": {}
    }
    
    patches_dir = "patches"
    if os.path.exists(patches_dir):
        patch_files = glob.glob(os.path.join(patches_dir, "*.json"))
        stats["total_patches"] = len(patch_files)
        
        # Analyze patch files
        for filepath in patch_files:
            try:
                with open(filepath, 'r') as f:
                    patch_data = json.load(f)
                
                # Count by type
                patch_type = patch_data.get("role", "unknown")
                stats["patch_types"][patch_type] = stats["patch_types"].get(patch_type, 0) + 1
                
                # Count by target file
                target_file = patch_data.get("target_file", "unknown")
                stats["target_files"][target_file] = stats["target_files"].get(target_file, 0) + 1
                
                # Check status
                if patch_data.get("status") == "success":
                    stats["successful_patches"] += 1
                elif patch_data.get("status") == "failed":
                    stats["failed_patches"] += 1
                else:
                    stats["pending_patches"] += 1
                
                # Track last processed
                if not stats["last_patch_processed"]:
                    stat = os.stat(filepath)
                    stats["last_patch_processed"] = datetime.fromtimestamp(stat.st_mtime).isoformat()
                    
            except Exception as e:
                stats["failed_patches"] += 1
    
    return stats

def get_system_stats() -> Dict[str, Any]:
    """Get comprehensive system statistics."""
    try:
        # CPU and memory
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('.')
        
        # Network
        network = psutil.net_io_counters()
        
        # Process info
        current_process = psutil.Process()
        
        # System uptime
        uptime = datetime.now() - datetime.fromtimestamp(psutil.boot_time())
        
        return {
            "cpu": {
                "usage_percent": cpu_percent,
                "count": psutil.cpu_count()
            },
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "used": memory.used,
                "percent": memory.percent
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": (disk.used / disk.total) * 100
            },
            "network": {
                "bytes_sent": network.bytes_sent,
                "bytes_recv": network.bytes_recv,
                "packets_sent": network.packets_sent,
                "packets_recv": network.packets_recv
            },
            "process": {
                "pid": current_process.pid,
                "memory_percent": current_process.memory_percent(),
                "cpu_percent": current_process.cpu_percent(),
                "create_time": datetime.fromtimestamp(current_process.create_time()).isoformat()
            },
            "system": {
                "uptime": str(uptime),
                "boot_time": datetime.fromtimestamp(psutil.boot_time()).isoformat()
            }
        }
    except Exception as e:
        return {"error": str(e)}

# HTML template for the admin dashboard
ADMIN_DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GPT-Cursor Runner Admin Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #0f172a;
            color: #e2e8f0;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .header {
            background: #1e293b;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .header h1 {
            margin: 0;
            color: #f8fafc;
            font-size: 2.5em;
        }
        .header p {
            margin: 10px 0 0 0;
            color: #94a3b8;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: #1e293b;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            border-left: 4px solid #3b82f6;
        }
        .stat-card.healthy { border-left-color: #10b981; }
        .stat-card.warning { border-left-color: #f59e0b; }
        .stat-card.error { border-left-color: #ef4444; }
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            color: #3b82f6;
        }
        .stat-label {
            color: #94a3b8;
            font-size: 0.9em;
            margin-top: 5px;
        }
        .section {
            background: #1e293b;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .section h2 {
            margin-top: 0;
            color: #f8fafc;
            border-bottom: 2px solid #334155;
            padding-bottom: 10px;
        }
        .health-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        .health-item {
            background: #334155;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
        }
        .health-item.healthy { border-left-color: #10b981; }
        .health-item.warning { border-left-color: #f59e0b; }
        .health-item.error { border-left-color: #ef4444; }
        .health-status {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.8em;
            letter-spacing: 0.5px;
        }
        .health-status.healthy { color: #10b981; }
        .health-status.warning { color: #f59e0b; }
        .health-status.error { color: #ef4444; }
        .refresh-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .refresh-btn:hover {
            background: #2563eb;
        }
        .loading {
            text-align: center;
            color: #94a3b8;
            padding: 20px;
        }
        .event-stream {
            max-height: 400px;
            overflow-y: auto;
            background: #334155;
            border-radius: 8px;
            padding: 15px;
        }
        .event-item {
            padding: 10px;
            border-bottom: 1px solid #475569;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
        }
        .event-item:last-child {
            border-bottom: none;
        }
        .event-time {
            color: #64748b;
            font-size: 0.8em;
        }
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin-top: 15px;
        }
        .metric-item {
            background: #475569;
            padding: 10px;
            border-radius: 6px;
            text-align: center;
        }
        .metric-value {
            font-size: 1.2em;
            font-weight: bold;
            color: #3b82f6;
        }
        .metric-label {
            font-size: 0.8em;
            color: #94a3b8;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 GPT-Cursor Runner Admin Dashboard</h1>
            <p>Comprehensive monitoring and management interface</p>
            <button class="refresh-btn" onclick="refreshAdminDashboard()">🔄 Refresh All</button>
        </div>
        
        <div class="stats-grid" id="stats-grid">
            <div class="loading">Loading statistics...</div>
        </div>
        
        <div class="section">
            <h2>🏥 Service Health</h2>
            <div id="health-grid" class="health-grid">
                <div class="loading">Loading health status...</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📊 Agent Queue & Processing</h2>
            <div id="queue-stats" class="metric-grid">
                <div class="loading">Loading queue statistics...</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📝 Summary Generation</h2>
            <div id="summary-stats" class="metric-grid">
                <div class="loading">Loading summary statistics...</div>
            </div>
        </div>
        
        <div class="section">
            <h2>🔧 Patch Processing</h2>
            <div id="patch-stats" class="metric-grid">
                <div class="loading">Loading patch statistics...</div>
            </div>
        </div>
        
        <div class="section">
            <h2>💻 System Resources</h2>
            <div id="system-stats" class="metric-grid">
                <div class="loading">Loading system statistics...</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📡 Real-time Events</h2>
            <div id="event-stream" class="event-stream">
                <div class="loading">Connecting to event stream...</div>
            </div>
        </div>
    </div>

    <script>
        let eventSource = null;
        
        function refreshAdminDashboard() {
            loadStats();
            loadHealthStatus();
            loadQueueStats();
            loadSummaryStats();
            loadPatchStats();
            loadSystemStats();
            startEventStream();
        }
        
        async function loadStats() {
            try {
                const response = await fetch('/api/admin/health');
                const health = await response.json();
                
                const statsGrid = document.getElementById('stats-grid');
                const totalServices = Object.keys(health).length;
                const healthyServices = Object.values(health).filter(h => h.status === 'healthy').length;
                const errorServices = Object.values(health).filter(h => h.status === 'error').length;
                
                statsGrid.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-number">${totalServices}</div>
                        <div class="stat-label">Total Services</div>
                    </div>
                    <div class="stat-card healthy">
                        <div class="stat-number">${healthyServices}</div>
                        <div class="stat-label">Healthy Services</div>
                    </div>
                    <div class="stat-card error">
                        <div class="stat-number">${errorServices}</div>
                        <div class="stat-label">Error Services</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${new Date().toLocaleTimeString()}</div>
                        <div class="stat-label">Last Updated</div>
                    </div>
                `;
            } catch (error) {
                console.error('Error loading stats:', error);
            }
        }
        
        async function loadHealthStatus() {
            try {
                const response = await fetch('/api/admin/health');
                const health = await response.json();
                
                const healthGrid = document.getElementById('health-grid');
                healthGrid.innerHTML = Object.entries(health).map(([service, status]) => `
                    <div class="health-item ${status.status}">
                        <div class="health-status ${status.status}">${status.status.toUpperCase()}</div>
                        <div style="margin-top: 10px;"><strong>${service.replace('_', ' ').toUpperCase()}</strong></div>
                        <div style="font-size: 0.8em; color: #94a3b8; margin-top: 5px;">
                            Last check: ${new Date(status.last_check).toLocaleTimeString()}
                        </div>
                    </div>
                `).join('');
            } catch (error) {
                console.error('Error loading health status:', error);
            }
        }
        
        async function loadQueueStats() {
            try {
                const response = await fetch('/api/admin/queue');
                const queue = await response.json();
                
                const queueStats = document.getElementById('queue-stats');
                queueStats.innerHTML = `
                    <div class="metric-item">
                        <div class="metric-value">${queue.total_processed || 0}</div>
                        <div class="metric-label">Total Processed</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${queue.currently_queued || 0}</div>
                        <div class="metric-label">Currently Queued</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${queue.failed_tasks || 0}</div>
                        <div class="metric-label">Failed Tasks</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${(queue.average_processing_time || 0).toFixed(2)}s</div>
                        <div class="metric-label">Avg Processing Time</div>
                    </div>
                `;
            } catch (error) {
                console.error('Error loading queue stats:', error);
            }
        }
        
        async function loadSummaryStats() {
            try {
                const response = await fetch('/api/admin/summary');
                const summary = await response.json();
                
                const summaryStats = document.getElementById('summary-stats');
                summaryStats.innerHTML = `
                    <div class="metric-item">
                        <div class="metric-value">${summary.total_generated || 0}</div>
                        <div class="metric-label">Total Generated</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${summary.delivery_success_rate || 0}%</div>
                        <div class="metric-label">Delivery Success Rate</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${(summary.average_generation_time || 0).toFixed(2)}s</div>
                        <div class="metric-label">Avg Generation Time</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${summary.last_generated ? new Date(summary.last_generated).toLocaleTimeString() : 'Never'}</div>
                        <div class="metric-label">Last Generated</div>
                    </div>
                `;
            } catch (error) {
                console.error('Error loading summary stats:', error);
            }
        }
        
        async function loadPatchStats() {
            try {
                const response = await fetch('/api/admin/patches');
                const patches = await response.json();
                
                const patchStats = document.getElementById('patch-stats');
                patchStats.innerHTML = `
                    <div class="metric-item">
                        <div class="metric-value">${patches.total_patches || 0}</div>
                        <div class="metric-label">Total Patches</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${patches.successful_patches || 0}</div>
                        <div class="metric-label">Successful</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${patches.failed_patches || 0}</div>
                        <div class="metric-label">Failed</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${patches.last_patch_processed ? new Date(patches.last_patch_processed).toLocaleTimeString() : 'Never'}</div>
                        <div class="metric-label">Last Processed</div>
                    </div>
                `;
            } catch (error) {
                console.error('Error loading patch stats:', error);
            }
        }
        
        async function loadSystemStats() {
            try {
                const response = await fetch('/api/admin/system');
                const system = await response.json();
                
                const systemStats = document.getElementById('system-stats');
                if (system.error) {
                    systemStats.innerHTML = `<div class="loading">Error loading system stats: ${system.error}</div>`;
                    return;
                }
                
                systemStats.innerHTML = `
                    <div class="metric-item">
                        <div class="metric-value">${system.cpu.usage_percent.toFixed(1)}%</div>
                        <div class="metric-label">CPU Usage</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${system.memory.percent.toFixed(1)}%</div>
                        <div class="metric-label">Memory Usage</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${system.disk.percent.toFixed(1)}%</div>
                        <div class="metric-label">Disk Usage</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${system.process.memory_percent.toFixed(1)}%</div>
                        <div class="metric-label">Process Memory</div>
                    </div>
                `;
            } catch (error) {
                console.error('Error loading system stats:', error);
            }
        }
        
        function startEventStream() {
            if (eventSource) {
                eventSource.close();
            }
            
            eventSource = new EventSource('/api/admin/events/stream');
            const eventStream = document.getElementById('event-stream');
            
            eventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    const events = data.events || [];
                    
                    if (events.length > 0) {
                        eventStream.innerHTML = events.map(event => `
                            <div class="event-item">
                                <div><strong>${event.type || 'Unknown'}</strong></div>
                                <div class="event-time">${event.timestamp || 'Unknown time'}</div>
                                <div>${JSON.stringify(event.data || {}).substring(0, 100)}...</div>
                            </div>
                        `).join('');
                    }
                } catch (error) {
                    console.error('Error parsing event stream:', error);
                }
            };
            
            eventSource.onerror = function(error) {
                console.error('Event stream error:', error);
                eventStream.innerHTML = '<div class="loading">Event stream disconnected. Retrying...</div>';
            };
        }
        
        // Load data on page load
        refreshAdminDashboard();
        
        // Auto-refresh every 30 seconds
        setInterval(refreshAdminDashboard, 30000);
    </script>
</body>
</html>
"""