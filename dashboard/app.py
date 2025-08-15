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
"""
GHOST RUNNER Dashboard
Flask-based web dashboard for real-time monitoring
Simple, dark, modern UI with no authentication required
"""

from flask import Flask, render_template, jsonify, redirect, request
import json
import os
import time
import requests  # type: ignore
from datetime import datetime
import subprocess
import threading
from typing import Dict, Any, Optional

app = Flask(__name__)

# Configuration
CONFIG = {
    "LOG_FILE": "/Users/sawyer/gitSync/gpt-cursor-runner/logs/unified-monitor.log",
    "HEARTBEAT_FILE": "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.heartbeat/.unified-monitor.json",
    "TUNNELS_FILE": "/Users/sawyer/gitSync/.cursor-cache/.docs/TUNNELS.json",
    "CYOPS_PATCHES": "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches",
    "CYOPS_SUMMARIES": "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries",
    "MAIN_PATCHES": "/Users/sawyer/gitSync/.cursor-cache/MAIN/patches",
    "MAIN_SUMMARIES": "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries",
    "TELEMETRY_API_URL": "http://localhost:8788",
}

# Tunnel Failover Configuration
TUNNEL_FAILOVER = {
    "dashboard": {
        "primary": "https://gpt-cursor-runner.thoughtmarks.app",
        "secondary": "https://health-thoughtmarks.thoughtmarks.app",
        "tertiary": "https://ghost-thoughtmarks.thoughtmarks.app",
        "local": "http://localhost:8787",
    },
    "slack": {
        "primary": "https://slack.thoughtmarks.app",
        "secondary": "https://webhook-thoughtmarks.thoughtmarks.app",
        "tertiary": "https://ghost-thoughtmarks.thoughtmarks.app",
        "local": "http://localhost:5051",
    },
    "expo": {
        "primary": "https://expo-thoughtmarks.thoughtmarks.app",
        "secondary": "https://deciding-externally-caiman.ngrok-free.app",
        "tertiary": "https://dev-thoughtmarks.thoughtmarks.app",
        "local": "http://localhost:9091",
    },
}


class DashboardData:
    def __init__(self) -> None:
        self.last_update: Optional[datetime] = None
        self.data: Dict[str, Any] = {}
        self.update_interval: int = 30  # seconds
        self.telemetry_data: Dict[str, Any] = {}

    def load_unified_monitor_data(self) -> bool:
        """Load data from unified system monitor"""
        try:
            if os.path.exists(CONFIG["HEARTBEAT_FILE"]):
                with open(CONFIG["HEARTBEAT_FILE"], "r") as f:
                    data = json.load(f)
                    self.data["unified_monitor"] = data
                    return True
        except Exception as e:
            print(f"Error loading unified monitor data: {e}")
        return False

    def load_recent_logs(self) -> bool:
        """Load last 10 log entries"""
        try:
            if os.path.exists(CONFIG["LOG_FILE"]):
                with open(CONFIG["LOG_FILE"], "r") as f:
                    lines = f.readlines()
                    recent_lines = lines[-10:] if len(lines) > 10 else lines
                    logs = []
                    for line in recent_lines:
                        try:
                            log_entry = json.loads(line.strip())
                            logs.append(log_entry)
                        except Exception:
                            logs.append(
                                {
                                    "message": line.strip(),
                                    "timestamp": datetime.now().isoformat(),
                                }
                            )
                    self.data["recent_logs"] = logs
                    return True
        except Exception as e:
            print(f"Error loading recent logs: {e}")
        return False

    def load_patch_status(self) -> bool:
        """Load patch status for both systems"""
        try:
            patch_data = {}

            # CYOPS patches
            if os.path.exists(CONFIG["CYOPS_PATCHES"]):
                cyops_patches = [
                    f
                    for f in os.listdir(CONFIG["CYOPS_PATCHES"])
                    if f.endswith(".json") and not f.startswith(".")
                ]
                cyops_summaries = [
                    f
                    for f in os.listdir(CONFIG["CYOPS_SUMMARIES"])
                    if f.endswith(".md") and not f.startswith(".")
                ]
                patch_data["CYOPS"] = {
                    "pending": len(cyops_patches),
                    "completed": len(cyops_summaries),
                    "patches": cyops_patches[:5],  # Show last 5
                    "summaries": cyops_summaries[:5],  # Show last 5
                }

            # MAIN patches
            if os.path.exists(CONFIG["MAIN_PATCHES"]):
                main_patches = [
                    f
                    for f in os.listdir(CONFIG["MAIN_PATCHES"])
                    if f.endswith(".json") and not f.startswith(".")
                ]
                main_summaries = [
                    f
                    for f in os.listdir(CONFIG["MAIN_SUMMARIES"])
                    if f.endswith(".md") and not f.startswith(".")
                ]
                patch_data["MAIN"] = {
                    "pending": len(main_patches),
                    "completed": len(main_summaries),
                    "patches": main_patches[:5],  # Show last 5
                    "summaries": main_summaries[:5],  # Show last 5
                }

            self.data["patch_status"] = patch_data
            return True
        except Exception as e:
            print(f"Error loading patch status: {e}")
        return False

    def load_tunnel_status(self) -> bool:
        """Load tunnel status from TUNNELS.json"""
        try:
            if os.path.exists(CONFIG["TUNNELS_FILE"]):
                with open(CONFIG["TUNNELS_FILE"], "r") as f:
                    tunnel_data = json.load(f)
                    self.data["tunnel_status"] = tunnel_data
                    return True
        except Exception as e:
            print(f"Error loading tunnel status: {e}")
        return False

    def check_process_health(self) -> bool:
        """Check PM2 process health"""
        try:
            # Get PM2 process list
            result = subprocess.run(
                ["pm2", "jlist"], capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                processes = json.loads(result.stdout)
                process_status = {}
                for proc in processes:
                    name = proc.get("name", "unknown")
                    status = proc.get("pm2_env", {}).get("status", "unknown")
                    process_status[name] = {
                        "status": status,
                        "uptime": proc.get("pm2_env", {}).get("pm_uptime", 0),
                        "memory": proc.get("monit", {}).get("memory", 0),
                        "cpu": proc.get("monit", {}).get("cpu", 0),
                    }
                self.data["process_health"] = process_status
                return True
        except Exception as e:
            print(f"Error checking process health: {e}")
        return False

    def load_agent_status(self) -> bool:
        """Load agent status from PM2"""
        try:
            # Get PM2 process list
            result = subprocess.run(
                ["pm2", "jlist"], capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                processes = json.loads(result.stdout)

                # Map PM2 process names to agent names
                process_mapping = {
                    "summary-monitor": "summary-monitor",
                    "patch-executor": "patch-executor",
                    "enhanced-doc-daemon": "enhanced-doc-daemon",
                    "dual-monitor": "dual-monitor",
                    "ghost-bridge": "ghost-bridge",
                    "alert-engine-daemon": "alert-engine-daemon",
                    "autonomous-decision-daemon": "autonomous-decision-daemon",
                    "dashboard-uplink": "dashboard-uplink",
                    "ghost-relay": "ghost-relay",
                    "ghost-runner": "ghost-runner",
                    "ghost-viewer": "ghost-viewer",
                    "metrics-aggregator-daemon": "metrics-aggregator-daemon",
                    "telemetry-orchestrator-daemon": "telemetry-orchestrator-daemon",
                    "flask-dashboard": "flask-dashboard",
                }

                agent_status = {"CYOPS": {"processes": {}}, "MAIN": {"processes": {}}}

                for proc in processes:
                    name = proc.get("name", "unknown")
                    status = proc.get("pm2_env", {}).get("status", "unknown")

                    # Determine which agent this process belongs to
                    if name in process_mapping:
                        agent_status["CYOPS"]["processes"][name] = status
                    else:
                        # Assume unknown processes belong to MAIN
                        agent_status["MAIN"]["processes"][name] = status

                self.data["agent_status"] = agent_status
                return True
        except Exception as e:
            print(f"Error loading agent status: {e}")
        return False

    def load_telemetry_data(self) -> bool:
        """Load telemetry data from API"""
        try:
            response = requests.get(f"{CONFIG['TELEMETRY_API_URL']}/health", timeout=5)
            if response.status_code == 200:
                self.telemetry_data = response.json()
                self.data["telemetry"] = self.telemetry_data
                return True
        except Exception as e:
            print(f"Error loading telemetry data: {e}")
        return False

    def update_data(self) -> None:
        """Update all dashboard data"""
        self.load_unified_monitor_data()
        self.load_recent_logs()
        self.load_patch_status()
        self.load_tunnel_status()
        self.check_process_health()
        self.load_agent_status()
        self.load_telemetry_data()
        self.last_update = datetime.now()


# Global dashboard data instance
dashboard_data = DashboardData()


@app.route("/")
def index() -> str:
    return render_template("index.html")


@app.route("/monitor")
def monitor() -> str:
    return render_template("monitor-enhanced.html")


@app.route("/api/status")
def get_status() -> Any:
    dashboard_data.update_data()
    return jsonify(dashboard_data.data)


@app.route("/api/health")
def health_check() -> Any:
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})


@app.route("/health")
def health_check_alias() -> Any:
    """Alias to /api/health for standard health probes"""
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})


@app.route("/api/daemon-status")
def get_daemon_status() -> Any:
    """Get daemon status from PM2"""
    try:
        # Get PM2 process list
        result = subprocess.run(
            ["pm2", "jlist"], capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            processes = json.loads(result.stdout)

            # Map PM2 process names to daemon names
            process_mapping = {
                "summary-monitor": "summary-monitor",
                "patch-executor": "patch-executor",
                "enhanced-doc-daemon": "enhanced-doc-daemon",
                "dual-monitor": "dual-monitor",
                "ghost-bridge": "ghost-bridge",
                "alert-engine-daemon": "alert-engine-daemon",
                "autonomous-decision-daemon": "autonomous-decision-daemon",
                "dashboard-uplink": "dashboard-uplink",
                "ghost-relay": "ghost-relay",
                "ghost-runner": "ghost-runner",
                "ghost-viewer": "ghost-viewer",
                "metrics-aggregator-daemon": "metrics-aggregator-daemon",
                "telemetry-orchestrator-daemon": "telemetry-orchestrator-daemon",
                "flask-dashboard": "flask-dashboard",
            }

            daemon_status = {}

            for proc in processes:
                name = proc.get("name", "unknown")
                status = proc.get("pm2_env", {}).get("status", "unknown")

                if name in process_mapping:
                    daemon_status[name] = {
                        "status": status,
                        "uptime": proc.get("pm2_env", {}).get("pm_uptime", 0),
                        "memory": proc.get("monit", {}).get("memory", 0),
                        "cpu": proc.get("monit", {}).get("cpu", 0),
                        "restarts": proc.get("pm2_env", {}).get("restart_time", 0),
                    }

            return jsonify(
                {
                    "daemons": daemon_status,
                    "total_daemons": len(daemon_status),
                    "running_daemons": len(
                        [d for d in daemon_status.values() if d["status"] == "online"]
                    ),
                    "timestamp": datetime.now().isoformat(),
                }
            )
        else:
            return (
                jsonify(
                    {
                        "error": "Failed to get PM2 status",
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )
    except Exception as e:
        return (
            jsonify(
                {
                    "error": f"Error getting daemon status: {str(e)}",
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/api/patch-status")
def get_patch_status() -> Any:
    dashboard_data.load_patch_status()
    return jsonify(dashboard_data.data.get("patch_status", {}))


@app.route("/api/tunnel-status")
def get_tunnel_status() -> Any:
    dashboard_data.load_tunnel_status()
    return jsonify(dashboard_data.data.get("tunnel_status", {}))


@app.route("/api/manager-status")
def get_manager_status() -> Any:
    """Get manager status for both CYOPS and MAIN agents"""
    try:
        # Get PM2 process list
        result = subprocess.run(
            ["pm2", "jlist"], capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            processes = json.loads(result.stdout)

            # Define manager processes for each agent
            cyops_managers = [
                "summary-monitor",
                "patch-executor",
                "enhanced-doc-daemon",
                "dual-monitor",
                "ghost-bridge",
                "alert-engine-daemon",
                "autonomous-decision-daemon",
                "dashboard-uplink",
            ]

            main_managers = [
                "ghost-relay",
                "ghost-runner",
                "ghost-viewer",
                "metrics-aggregator-daemon",
                "telemetry-orchestrator-daemon",
                "flask-dashboard",
            ]

            manager_status = {
                "CYOPS": {"managers": {}, "status": "unknown"},
                "MAIN": {"managers": {}, "status": "unknown"},
            }

            cyops_running = 0
            main_running = 0

            for proc in processes:
                name = proc.get("name", "unknown")
                status = proc.get("pm2_env", {}).get("status", "unknown")

                if name in cyops_managers:
                    manager_status["CYOPS"]["managers"][name] = {
                        "status": status,
                        "uptime": proc.get("pm2_env", {}).get("pm_uptime", 0),
                        "memory": proc.get("monit", {}).get("memory", 0),
                        "cpu": proc.get("monit", {}).get("cpu", 0),
                    }
                    if status == "online":
                        cyops_running += 1

                elif name in main_managers:
                    manager_status["MAIN"]["managers"][name] = {
                        "status": status,
                        "uptime": proc.get("pm2_env", {}).get("pm_uptime", 0),
                        "memory": proc.get("monit", {}).get("memory", 0),
                        "cpu": proc.get("monit", {}).get("cpu", 0),
                    }
                    if status == "online":
                        main_running += 1

            # Determine overall status
            if cyops_running == len(cyops_managers):
                manager_status["CYOPS"]["status"] = "healthy"
            elif cyops_running > 0:
                manager_status["CYOPS"]["status"] = "degraded"
            else:
                manager_status["CYOPS"]["status"] = "down"

            if main_running == len(main_managers):
                manager_status["MAIN"]["status"] = "healthy"
            elif main_running > 0:
                manager_status["MAIN"]["status"] = "degraded"
            else:
                manager_status["MAIN"]["status"] = "down"

            return jsonify(
                {
                    "manager_status": manager_status,
                    "summary": {
                        "cyops_managers": len(cyops_managers),
                        "cyops_running": cyops_running,
                        "main_managers": len(main_managers),
                        "main_running": main_running,
                    },
                    "timestamp": datetime.now().isoformat(),
                }
            )
        else:
            return (
                jsonify(
                    {
                        "error": "Failed to get PM2 status",
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )
    except Exception as e:
        return (
            jsonify(
                {
                    "error": f"Error getting manager status: {str(e)}",
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/api/system-health")
def get_system_health() -> Any:
    """Get comprehensive system health information"""
    import psutil  # type: ignore

    try:
        # CPU information
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()

        # Memory information
        memory = psutil.virtual_memory()
        memory_info = {
            "total": memory.total,
            "available": memory.available,
            "used": memory.used,
            "percent": memory.percent,
        }

        # Disk information
        disk = psutil.disk_usage("/")
        disk_info = {
            "total": disk.total,
            "used": disk.used,
            "free": disk.free,
            "percent": (disk.used / disk.total) * 100,
        }

        # Network information
        network = psutil.net_io_counters()
        network_info = {
            "bytes_sent": network.bytes_sent,
            "bytes_recv": network.bytes_recv,
            "packets_sent": network.packets_sent,
            "packets_recv": network.packets_recv,
        }

        # Process count
        process_count = len(psutil.pids())

        return jsonify(
            {
                "cpu": {
                    "percent": cpu_percent,
                    "count": cpu_count,
                },
                "memory": memory_info,
                "disk": disk_info,
                "network": network_info,
                "processes": process_count,
                "timestamp": datetime.now().isoformat(),
            }
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "error": f"Error getting system health: {str(e)}",
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/api/validate-process")
def validate_process() -> Any:
    """Validate that all required processes are running"""
    try:
        # Get PM2 process list
        result = subprocess.run(
            ["pm2", "jlist"], capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            processes = json.loads(result.stdout)

            # Define required processes
            required_processes = [
                "summary-monitor",
                "patch-executor",
                "enhanced-doc-daemon",
                "dual-monitor",
                "ghost-bridge",
                "alert-engine-daemon",
                "autonomous-decision-daemon",
                "dashboard-uplink",
                "ghost-relay",
                "ghost-runner",
                "ghost-viewer",
                "metrics-aggregator-daemon",
                "telemetry-orchestrator-daemon",
                "flask-dashboard",
            ]

            running_processes = [proc.get("name") for proc in processes]
            missing_processes = [
                p for p in required_processes if p not in running_processes
            ]

            validation_result = {
                "valid": len(missing_processes) == 0,
                "total_required": len(required_processes),
                "running": len(running_processes),
                "missing": missing_processes,
                "processes": {},
            }

            for proc in processes:
                name = proc.get("name", "unknown")
                status = proc.get("pm2_env", {}).get("status", "unknown")
                validation_result["processes"][name] = {
                    "status": status,
                    "required": name in required_processes,
                }

            return jsonify(validation_result)
        else:
            return (
                jsonify(
                    {
                        "error": "Failed to get PM2 status",
                        "valid": False,
                    }
                ),
                500,
            )
    except Exception as e:
        return (
            jsonify(
                {
                    "error": f"Error validating processes: {str(e)}",
                    "valid": False,
                }
            ),
            500,
        )


@app.route("/api/recent-logs")
def get_recent_logs() -> Any:
    """Get recent log entries"""
    dashboard_data.load_recent_logs()
    return jsonify(dashboard_data.data.get("recent_logs", []))


@app.route("/api/telemetry/health")
def get_telemetry_health() -> Any:
    """Get telemetry health status"""
    try:
        response = requests.get(f"{CONFIG['TELEMETRY_API_URL']}/health", timeout=5)
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return (
                jsonify(
                    {
                        "status": "unhealthy",
                        "error": f"HTTP {response.status_code}",
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )
    except Exception as e:
        return (
            jsonify(
                {
                    "status": "unhealthy",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/api/telemetry/metrics")
def get_telemetry_metrics() -> Any:
    """Get telemetry metrics"""
    try:
        response = requests.get(f"{CONFIG['TELEMETRY_API_URL']}/metrics", timeout=5)
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return (
                jsonify(
                    {
                        "error": f"HTTP {response.status_code}",
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )
    except Exception as e:
        return (
            jsonify(
                {
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/api/telemetry/alerts")
def get_telemetry_alerts() -> Any:
    """Get telemetry alerts"""
    try:
        response = requests.get(f"{CONFIG['TELEMETRY_API_URL']}/alerts", timeout=5)
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return (
                jsonify(
                    {
                        "error": f"HTTP {response.status_code}",
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )
    except Exception as e:
        return (
            jsonify(
                {
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/api/telemetry/components")
def get_telemetry_components() -> Any:
    """Get telemetry component status"""
    try:
        response = requests.get(f"{CONFIG['TELEMETRY_API_URL']}/components", timeout=5)
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return (
                jsonify(
                    {
                        "error": f"HTTP {response.status_code}",
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )
    except Exception as e:
        return (
            jsonify(
                {
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/api/telemetry/trends")
def get_telemetry_trends() -> Any:
    """Get telemetry trends"""
    try:
        response = requests.get(f"{CONFIG['TELEMETRY_API_URL']}/trends", timeout=5)
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return (
                jsonify(
                    {
                        "error": f"HTTP {response.status_code}",
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )
    except Exception as e:
        return (
            jsonify(
                {
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/api/telemetry/anomalies")
def get_telemetry_anomalies() -> Any:
    """Get telemetry anomalies"""
    try:
        response = requests.get(f"{CONFIG['TELEMETRY_API_URL']}/anomalies", timeout=5)
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return (
                jsonify(
                    {
                        "error": f"HTTP {response.status_code}",
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )
    except Exception as e:
        return (
            jsonify(
                {
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/api/telemetry/stats")
def get_telemetry_stats() -> Any:
    """Get telemetry statistics"""
    try:
        response = requests.get(f"{CONFIG['TELEMETRY_API_URL']}/stats", timeout=5)
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return (
                jsonify(
                    {
                        "error": f"HTTP {response.status_code}",
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )
    except Exception as e:
        return (
            jsonify(
                {
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/api/telemetry/all")
def get_all_telemetry() -> Any:
    """Get all telemetry data"""
    try:
        # Get all telemetry endpoints
        endpoints = [
            "health",
            "metrics",
            "alerts",
            "components",
            "trends",
            "anomalies",
            "stats",
        ]
        telemetry_data = {}

        for endpoint in endpoints:
            try:
                response = requests.get(
                    f"{CONFIG['TELEMETRY_API_URL']}/{endpoint}", timeout=5
                )
                if response.status_code == 200:
                    telemetry_data[endpoint] = response.json()
                else:
                    telemetry_data[endpoint] = {
                        "error": f"HTTP {response.status_code}",
                        "timestamp": datetime.now().isoformat(),
                    }
            except Exception as e:
                telemetry_data[endpoint] = {
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }

        return jsonify(
            {
                "telemetry": telemetry_data,
                "timestamp": datetime.now().isoformat(),
            }
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/api/service-action", methods=["POST"])
def service_action() -> Any:
    """Perform service actions (start, stop, restart)"""
    try:
        from flask import request

        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        action = data.get("action")
        service = data.get("service")

        if not action or not service:
            return jsonify({"error": "Action and service required"}), 400

        if action not in ["start", "stop", "restart", "reload"]:
            return jsonify({"error": "Invalid action"}), 400

        # Execute PM2 command
        result = subprocess.run(
            ["pm2", action, service], capture_output=True, text=True, timeout=30
        )

        if result.returncode == 0:
            return jsonify(
                {
                    "success": True,
                    "action": action,
                    "service": service,
                    "output": result.stdout,
                    "timestamp": datetime.now().isoformat(),
                }
            )
        else:
            return (
                jsonify(
                    {
                        "success": False,
                        "action": action,
                        "service": service,
                        "error": result.stderr,
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )
    except Exception as e:
        return (
            jsonify(
                {
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/api/service-logs")
def get_service_logs() -> Any:
    """Get service logs from PM2"""
    try:
        from flask import request

        service = request.args.get("service", "")
        lines = request.args.get("lines", "50")

        if not service:
            return jsonify({"error": "Service name required"}), 400

        # Get PM2 logs
        result = subprocess.run(
            ["pm2", "logs", service, "--lines", lines, "--nostream"],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode == 0:
            return jsonify(
                {
                    "service": service,
                    "logs": result.stdout.split("\n"),
                    "timestamp": datetime.now().isoformat(),
                }
            )
        else:
            return (
                jsonify(
                    {
                        "error": result.stderr,
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                500,
            )
    except Exception as e:
        return (
            jsonify(
                {
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


# Error Handlers for Tunnel Failover
@app.errorhandler(503)
def handle_cloudflare_error(error: Any) -> Any:
    """Handle Cloudflare Error 1033 and tunnel failures"""
    try:
        # Log the error
        error_log = {
            "error": "Cloudflare Error 1033 or tunnel failure",
            "timestamp": datetime.now().isoformat(),
            "path": request.path,
            "method": request.method,
            "user_agent": request.headers.get("User-Agent", ""),
        }

        # Write to error log
        with open(
            "/Users/sawyer/gitSync/gpt-cursor-runner/logs/tunnel-errors.log", "a"
        ) as f:
            f.write(json.dumps(error_log) + "\n")

        # Determine which tunnel to try based on the request path
        if "/monitor" in request.path or "/api/" in request.path:
            tunnel_config = TUNNEL_FAILOVER["dashboard"]
        elif "/slack/" in request.path or "/webhook" in request.path:
            tunnel_config = TUNNEL_FAILOVER["slack"]
        elif "/expo" in request.path or "/metro" in request.path:
            tunnel_config = TUNNEL_FAILOVER["expo"]
        else:
            tunnel_config = TUNNEL_FAILOVER["dashboard"]

        # Try secondary tunnel
        try:
            secondary_url = f"{tunnel_config['secondary']}{request.path}"
            response = requests.get(secondary_url, timeout=10)
            if response.status_code == 200:
                return redirect(secondary_url, code=302)
        except Exception:
            pass

        # Try tertiary tunnel
        try:
            tertiary_url = f"{tunnel_config['tertiary']}{request.path}"
            response = requests.get(tertiary_url, timeout=10)
            if response.status_code == 200:
                return redirect(tertiary_url, code=302)
        except Exception:
            pass

        # All tunnels failed - return error with retry info
        return (
            jsonify(
                {
                    "error": "All tunnels unavailable",
                    "retry_after": 30,
                    "fallback_urls": [
                        tunnel_config["secondary"],
                        tunnel_config["tertiary"],
                    ],
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            503,
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "error": f"Tunnel failover error: {str(e)}",
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            503,
        )


@app.errorhandler(502)
def handle_bad_gateway(error: Any) -> Any:
    """Handle 502 Bad Gateway (tunnel connectivity issues)"""
    return handle_cloudflare_error(error)


@app.errorhandler(504)
def handle_gateway_timeout(error: Any) -> Any:
    """Handle 504 Gateway Timeout (tunnel timeout issues)"""
    return handle_cloudflare_error(error)


# Tunnel Health Check Endpoint
@app.route("/api/tunnel-health")
def get_tunnel_health() -> Any:
    """Check health of all tunnel endpoints"""
    try:
        tunnel_health = {}

        for service, config in TUNNEL_FAILOVER.items():
            service_health = {}

            for tunnel_type, url in config.items():
                try:
                    response = requests.get(f"{url}/health", timeout=10)
                    service_health[tunnel_type] = {
                        "status": (
                            "healthy" if response.status_code == 200 else "unhealthy"
                        ),
                        "response_time": response.elapsed.total_seconds(),
                        "status_code": response.status_code,
                    }
                except Exception as e:
                    service_health[tunnel_type] = {
                        "status": "unhealthy",
                        "error": str(e),
                        "response_time": None,
                        "status_code": None,
                    }

            tunnel_health[service] = service_health

        return jsonify(
            {"tunnel_health": tunnel_health, "timestamp": datetime.now().isoformat()}
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "error": f"Error checking tunnel health: {str(e)}",
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


def start_background_updates() -> None:
    """Start background thread for updating dashboard data"""

    def update_loop() -> None:
        while True:
            try:
                dashboard_data.update_data()
                time.sleep(dashboard_data.update_interval)
            except Exception as e:
                print(f"Error in background update: {e}")
                time.sleep(60)  # Wait longer on error

    update_thread = threading.Thread(target=update_loop, daemon=True)
    update_thread.start()


if __name__ == "__main__":
    start_background_updates()
    app.run(host="0.0.0.0", port=8787, debug=False)


@app.route("/monitor")
def g2o_monitor_min():
    from flask import render_template

    return render_template("g2o_monitor.html")


# === G2O_NOSTORE_START ===
@app.after_request
def g2o_no_store_headers(resp):
    try:
        path = request.path or ""
        if path.startswith("/api/") or "text/html" in (
            resp.headers.get("Content-Type", "").lower()
        ):
            resp.headers["Cache-Control"] = (
                "no-store, no-cache, must-revalidate, max-age=0"
            )
            resp.headers["Pragma"] = "no-cache"
            resp.headers["Expires"] = "0"
    except Exception:
        pass
    return resp


# === G2O_NOSTORE_END ===

# === G2O MONITOR ROUTE (idempotent) ===
try:
    from flask import jsonify
except Exception:
    pass


@app.route("/g2o/monitor")
def g2o_monitor():
    import os
    import json

    meta = "/Users/sawyer/gitSync/_GPTsync/meta/visual_validation.json"
    png = "/Users/sawyer/gitSync/.cursor-cache/ROOT/.screenshots/g2o-monitor.png"
    data = {"status": "UNKNOWN", "ts": None, "screenshot": None}
    if os.path.exists(meta):
        try:
            with open(meta, "r") as f:
                data = json.load(f)
        except Exception:
            pass
    if os.path.exists(png):
        data["screenshot"] = png
    return jsonify(data)
