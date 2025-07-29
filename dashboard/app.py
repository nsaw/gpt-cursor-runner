#!/usr/bin/env python3
"""
GHOST RUNNER Dashboard
Flask-based web dashboard for real-time monitoring
Simple, dark, modern UI with no authentication required
"""

from flask import Flask, render_template, jsonify
import json
import os
import time
import requests
from datetime import datetime
import subprocess
import threading

app = Flask(__name__)

# Configuration
CONFIG = {
    'LOG_FILE': '/Users/sawyer/gitSync/gpt-cursor-runner/logs/unified-monitor.log',
    'HEARTBEAT_FILE': '/Users/sawyer/gitSync/.cursor-cache/CYOPS/.heartbeat/.unified-monitor.json',
    'TUNNELS_FILE': '/Users/sawyer/gitSync/.cursor-cache/.docs/TUNNELS.json',
    'CYOPS_PATCHES': '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches',
    'CYOPS_SUMMARIES': '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries',
    'MAIN_PATCHES': '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches',
    'MAIN_SUMMARIES': '/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries',
    'TELEMETRY_API_URL': 'http://localhost:8788'
}

class DashboardData:
    def __init__(self):
        self.last_update = None
        self.data = {}
        self.update_interval = 30  # seconds
        self.telemetry_data = {}
        
    def load_unified_monitor_data(self):
        """Load data from unified system monitor"""
        try:
            if os.path.exists(CONFIG['HEARTBEAT_FILE']):
                with open(CONFIG['HEARTBEAT_FILE'], 'r') as f:
                    data = json.load(f)
                    self.data['unified_monitor'] = data
                    return True
        except Exception as e:
            print(f"Error loading unified monitor data: {e}")
        return False
    
    def load_recent_logs(self):
        """Load last 10 log entries"""
        try:
            if os.path.exists(CONFIG['LOG_FILE']):
                with open(CONFIG['LOG_FILE'], 'r') as f:
                    lines = f.readlines()
                    recent_lines = lines[-10:] if len(lines) > 10 else lines
                    logs = []
                    for line in recent_lines:
                        try:
                            log_entry = json.loads(line.strip())
                            logs.append(log_entry)
                        except:
                            logs.append({'message': line.strip(), 'timestamp': datetime.now().isoformat()})
                    self.data['recent_logs'] = logs
                    return True
        except Exception as e:
            print(f"Error loading recent logs: {e}")
        return False
    
    def load_patch_status(self):
        """Load patch status for both systems"""
        try:
            patch_data = {}
            
            # CYOPS patches
            if os.path.exists(CONFIG['CYOPS_PATCHES']):
                cyops_patches = [f for f in os.listdir(CONFIG['CYOPS_PATCHES']) 
                               if f.endswith('.json') and not f.startswith('.')]
                cyops_summaries = [f for f in os.listdir(CONFIG['CYOPS_SUMMARIES']) 
                                 if f.endswith('.md') and not f.startswith('.')]
                patch_data['CYOPS'] = {
                    'pending': len(cyops_patches),
                    'completed': len(cyops_summaries),
                    'patches': cyops_patches[:5],  # Show last 5
                    'summaries': cyops_summaries[:5]  # Show last 5
                }
            
            # MAIN patches
            if os.path.exists(CONFIG['MAIN_PATCHES']):
                main_patches = [f for f in os.listdir(CONFIG['MAIN_PATCHES']) 
                              if f.endswith('.json') and not f.startswith('.')]
                main_summaries = [f for f in os.listdir(CONFIG['MAIN_SUMMARIES']) 
                                if f.endswith('.md') and not f.startswith('.')]
                patch_data['MAIN'] = {
                    'pending': len(main_patches),
                    'completed': len(main_summaries),
                    'patches': main_patches[:5],  # Show last 5
                    'summaries': main_summaries[:5]  # Show last 5
                }
            
            self.data['patch_status'] = patch_data
            return True
        except Exception as e:
            print(f"Error loading patch status: {e}")
        return False
    
    def load_tunnel_status(self):
        """Load tunnel status from TUNNELS.json"""
        try:
            if os.path.exists(CONFIG['TUNNELS_FILE']):
                with open(CONFIG['TUNNELS_FILE'], 'r') as f:
                    tunnels_data = json.load(f)
                    
                    tunnels = []
                    
                    # Add DNS records
                    if 'dns_records' in tunnels_data:
                        for record in tunnels_data['dns_records']:
                            if record['status'] != 'INACTIVE' and record['dns_target']:
                                tunnels.append({
                                    'name': f"{record['subdomain']}.{record['domain']}",
                                    'type': 'dns_record',
                                    'status': record['status'],
                                    'dns_target': record['dns_target']
                                })
                    
                    # Add ngrok
                    if 'ngrok' in tunnels_data and tunnels_data['ngrok']['domain']:
                        tunnels.append({
                            'name': 'ngrok-tunnel',
                            'type': 'ngrok',
                            'status': 'ACTIVE',
                            'domain': tunnels_data['ngrok']['domain']
                        })
                    
                    self.data['tunnels'] = tunnels
                    return True
        except Exception as e:
            print(f"Error loading tunnel status: {e}")
        return False
    
    def check_process_health(self):
        """Check critical process health"""
        try:
            processes = [
                'ghost-bridge.js',
                'heartbeat-loop.js',
                'doc-daemon.js',
                'dual-m'
            ]
            
            process_status = {}
            for process in processes:
                try:
                    result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
                    is_running = process in result.stdout
                    process_status[process] = {
                        'running': is_running,
                        'status': 'HEALTHY' if is_running else 'STOPPED'
                    }
                except Exception as e:
                    process_status[process] = {
                        'running': False,
                        'status': 'ERROR',
                        'error': str(e)
                    }
            
            self.data['process_health'] = process_status
            return True
        except Exception as e:
            print(f"Error checking process health: {e}")
        return False
    
    def load_telemetry_data(self):
        """Load data from telemetry API"""
        try:
            # Health check
            health_response = requests.get(
                f"{CONFIG['TELEMETRY_API_URL']}/health", timeout=5
            )
            if health_response.status_code == 200:
                self.telemetry_data['health'] = health_response.json()
            
            # Metrics
            metrics_response = requests.get(
                f"{CONFIG['TELEMETRY_API_URL']}/metrics", timeout=5
            )
            if metrics_response.status_code == 200:
                self.telemetry_data['metrics'] = metrics_response.json()
            
            # Alerts
            alerts_response = requests.get(
                f"{CONFIG['TELEMETRY_API_URL']}/alerts", timeout=5
            )
            if alerts_response.status_code == 200:
                self.telemetry_data['alerts'] = alerts_response.json()
            
            # Components
            components_response = requests.get(
                f"{CONFIG['TELEMETRY_API_URL']}/components", timeout=5
            )
            if components_response.status_code == 200:
                self.telemetry_data['components'] = components_response.json()
            
            # Trends
            trends_response = requests.get(
                f"{CONFIG['TELEMETRY_API_URL']}/trends", timeout=5
            )
            if trends_response.status_code == 200:
                self.telemetry_data['trends'] = trends_response.json()
            
            # Anomalies
            anomalies_response = requests.get(
                f"{CONFIG['TELEMETRY_API_URL']}/anomalies", timeout=5
            )
            if anomalies_response.status_code == 200:
                self.telemetry_data['anomalies'] = anomalies_response.json()
            
            # API Stats
            stats_response = requests.get(
                f"{CONFIG['TELEMETRY_API_URL']}/stats", timeout=5
            )
            if stats_response.status_code == 200:
                self.telemetry_data['api_stats'] = stats_response.json()
            
            self.data['telemetry'] = self.telemetry_data
            return True
        except requests.exceptions.RequestException as e:
            print(f"Error loading telemetry data: {e}")
            self.data['telemetry'] = {'error': str(e)}
        except Exception as e:
            print(f"Error loading telemetry data: {e}")
            self.data['telemetry'] = {'error': str(e)}
        return False

    def update_data(self):
        """Update all dashboard data"""
        success = True
        success &= self.load_unified_monitor_data()
        success &= self.load_recent_logs()
        success &= self.load_patch_status()
        success &= self.load_tunnel_status()
        success &= self.check_process_health()
        success &= self.load_telemetry_data()
        
        self.last_update = datetime.now()
        self.data['last_update'] = self.last_update.isoformat()
        self.data['update_success'] = success
        
        return success

# Global dashboard data instance
dashboard_data = DashboardData()

@app.route('/')
def index():
    """Main dashboard page - serve rich UI"""
    return render_template('index.html')

@app.route('/monitor')
def monitor():
    """Monitor dashboard page - serve rich UI instead of basic JSON"""
    return render_template('index.html')  # Use the rich dashboard UI

@app.route('/api/status')
def get_status():
    """API endpoint for dashboard data"""
    dashboard_data.update_data()
    return jsonify(dashboard_data.data)

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'ghost-runner-dashboard'
    })

@app.route('/api/daemon-status')
def get_daemon_status():
    """Get live daemon status from disk and process checks"""
    try:
        # Check daemon processes
        daemon_status = {}
        processes = ['summary-monitor', 'patch-executor', 'doc-daemon', 'dualMonitor', 'ghost-bridge']
        
        for process in processes:
            try:
                result = subprocess.run(['pgrep', '-f', process], 
                                      capture_output=True, text=True, timeout=5)
                daemon_status[process] = 'running' if result.returncode == 0 else 'stopped'
            except subprocess.TimeoutExpired:
                daemon_status[process] = 'timeout'
            except Exception:
                daemon_status[process] = 'unknown'
        
        return jsonify({
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'daemon_status': daemon_status
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/patch-status')
def get_patch_status():
    """Get patch status for both systems"""
    try:
        dashboard_data.load_patch_status()
        return jsonify({
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'patchStatus': dashboard_data.data.get('patch_status', {})
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/tunnel-status')
def get_tunnel_status():
    """Get tunnel status"""
    try:
        dashboard_data.load_tunnel_status()
        return jsonify({
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'tunnelStatus': dashboard_data.data.get('tunnels', [])
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/system-health')
def get_system_health():
    """Get system resource health"""
    try:
        # Get system metrics
        import psutil
        
        memory = psutil.virtual_memory()
        cpu = psutil.cpu_percent(interval=1)
        disk = psutil.disk_usage('/').percent
        
        return jsonify({
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'resourceHealth': {
                'memory': memory.percent,
                'cpu': cpu,
                'disk': disk
            }
        })
    except ImportError:
        # Fallback if psutil not available
        return jsonify({
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'resourceHealth': {
                'memory': 0,
                'cpu': 0,
                'disk': 0
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/validate-process')
def validate_process():
    """Validate if a specific process is running"""
    try:
        from flask import request
        process_name = request.args.get('name', '')
        
        if not process_name:
            return jsonify({
                'status': 'error',
                'error': 'Process name required',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        try:
            result = subprocess.run(['pgrep', '-f', process_name], 
                                  capture_output=True, text=True, timeout=5)
            is_running = result.returncode == 0
            
            return jsonify({
                'status': 'success',
                'timestamp': datetime.now().isoformat(),
                'running': is_running,
                'process': process_name
            })
        except subprocess.TimeoutExpired:
            return jsonify({
                'status': 'success',
                'timestamp': datetime.now().isoformat(),
                'running': False,
                'process': process_name
            })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/recent-logs')
def get_recent_logs():
    """Get recent log entries"""
    try:
        dashboard_data.load_recent_logs()
        return jsonify({
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'recentLogs': dashboard_data.data.get('recent_logs', [])
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@app.route('/api/telemetry/health')
def get_telemetry_health():
    """Get telemetry API health status"""
    try:
        dashboard_data.load_telemetry_data()
        telemetry = dashboard_data.data.get('telemetry', {})
        health = telemetry.get('health', {})
        return jsonify({
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'telemetryHealth': health
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@app.route('/api/telemetry/metrics')
def get_telemetry_metrics():
    """Get telemetry metrics data"""
    try:
        dashboard_data.load_telemetry_data()
        telemetry = dashboard_data.data.get('telemetry', {})
        metrics = telemetry.get('metrics', {})
        return jsonify({
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'telemetryMetrics': metrics
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@app.route('/api/telemetry/alerts')
def get_telemetry_alerts():
    """Get telemetry alerts data"""
    try:
        dashboard_data.load_telemetry_data()
        telemetry = dashboard_data.data.get('telemetry', {})
        alerts = telemetry.get('alerts', {})
        return jsonify({
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'telemetryAlerts': alerts
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@app.route('/api/telemetry/components')
def get_telemetry_components():
    """Get telemetry components data"""
    try:
        dashboard_data.load_telemetry_data()
        telemetry = dashboard_data.data.get('telemetry', {})
        components = telemetry.get('components', {})
        return jsonify({
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'telemetryComponents': components
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@app.route('/api/telemetry/trends')
def get_telemetry_trends():
    """Get telemetry trends data"""
    try:
        dashboard_data.load_telemetry_data()
        telemetry = dashboard_data.data.get('telemetry', {})
        trends = telemetry.get('trends', {})
        return jsonify({
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'telemetryTrends': trends
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@app.route('/api/telemetry/anomalies')
def get_telemetry_anomalies():
    """Get telemetry anomalies data"""
    try:
        dashboard_data.load_telemetry_data()
        telemetry = dashboard_data.data.get('telemetry', {})
        anomalies = telemetry.get('anomalies', {})
        return jsonify({
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'telemetryAnomalies': anomalies
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@app.route('/api/telemetry/stats')
def get_telemetry_stats():
    """Get telemetry API statistics"""
    try:
        dashboard_data.load_telemetry_data()
        telemetry = dashboard_data.data.get('telemetry', {})
        stats = telemetry.get('api_stats', {})
        return jsonify({
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'telemetryStats': stats
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@app.route('/api/telemetry/all')
def get_all_telemetry():
    """Get all telemetry data"""
    try:
        dashboard_data.load_telemetry_data()
        telemetry = dashboard_data.data.get('telemetry', {})
        return jsonify({
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'telemetry': telemetry
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

def start_background_updates():
    """Start background data updates"""
    def update_loop():
        while True:
            try:
                dashboard_data.update_data()
                time.sleep(dashboard_data.update_interval)
            except Exception as e:
                print(f"Error in background update: {e}")
                time.sleep(60)  # Wait longer on error
    
    thread = threading.Thread(target=update_loop, daemon=True)
    thread.start()

if __name__ == '__main__':
    # Start background updates
    start_background_updates()
    
    # Initial data load
    dashboard_data.update_data()
    
    print("🚀 Starting GHOST RUNNER Dashboard...")
    print("📊 Dashboard will be available at: http://localhost:5001")
    print("🔗 API endpoints:")
    print("   - /api/status - Dashboard data")
    print("   - /api/health - Health check")
    print("")
    print("⚙️  Configuration:")
    print(f"   - Log file: {CONFIG['LOG_FILE']}")
    print(f"   - Heartbeat: {CONFIG['HEARTBEAT_FILE']}")
    print(f"   - Tunnels: {CONFIG['TUNNELS_FILE']}")
    print("")
    
    # Run Flask app
    app.run(host='0.0.0.0', port=5001, debug=False) 