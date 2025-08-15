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
import os
import json
import time
import subprocess
from datetime import datetime
from typing import Dict, List, Any
from flask import Flask, jsonify, request, Response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Configuration
LOG_DIR = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs"
DAEMON_NAMES = [
    "ghostSentinelGuard",
    "ghostWatchdogLoop",
    "ghostExecutorUnifier",
    "ghostSelfCheckCore",
    "ghostLifecycleGovernor",
]


class DaemonMonitor:
    def __init__(self):
        self.last_check = {}
        self.cache_duration = 5  # Cache results for 5 seconds

    def is_process_running(self, daemon_name: str) -> Dict[str, Any]:
        """Check if a daemon process is running using non-blocking patterns"""
        try:
            # Use non-blocking pattern to check process"""
            cmd = f"ps aux | grep -E '{daemon_name}\\.ts|{daemon_name}\\.js' | grep -v grep | head -1"
            result = subprocess.run(
                cmd, shell=True, capture_output=True, text=True, timeout=5
            )

            if result.returncode == 0 and result.stdout.strip():
                # Extract PID from output
                parts = result.stdout.strip().split()
                pid = parts[1] if len(parts) > 1 else "unknown"

                return {
                    "running": True,
                    "pid": pid,
                    "error": None,
                    "lastCheck": datetime.now().isoformat(),
                }
            else:
                return {
                    "running": False,
                    "pid": None,
                    "error": "Process not found",
                    "lastCheck": datetime.now().isoformat(),
                }

        except subprocess.TimeoutExpired:
            return {
                "running": False,
                "pid": None,
                "error": "Check timeout",
                "lastCheck": datetime.now().isoformat(),
            }
        except Exception as e:
            return {
                "running": False,
                "pid": None,
                "error": str(e),
                "lastCheck": datetime.now().isoformat(),
            }

    def get_daemon_status(self, daemon_name: str) -> Dict[str, Any]:
        """Get cached or fresh status for a daemon"""
        current_time = time.time()

        # Check cache first
        if daemon_name in self.last_check:
            cached_time, cached_status = self.last_check[daemon_name]
            if current_time - cached_time < self.cache_duration:
                return cached_status

        # Get fresh status
        status = self.is_process_running(daemon_name)
        status["name"] = daemon_name

        # Cache the result
        self.last_check[daemon_name] = (current_time, status)

        return status

    def get_all_daemon_status(self) -> Dict[str, Any]:
        """Get status for all daemons"""
        daemons = []
        running_count = 0

        for daemon_name in DAEMON_NAMES:
            status = self.get_daemon_status(daemon_name)
            daemons.append(status)
            if status["running"]:
                running_count += 1

        # Calculate overall health
        total_daemons = len(DAEMON_NAMES)
        if running_count == total_daemons:
            overall_health = "healthy"
        elif running_count >= total_daemons * 0.7:  # 70% threshold
            overall_health = "warning"
        else:
            overall_health = "critical"

        return {
            "daemons": daemons,
            "overallHealth": overall_health,
            "runningCount": running_count,
            "totalCount": total_daemons,
            "lastUpdate": datetime.now().isoformat(),
        }


class LogMonitor:
    def __init__(self):
        self.log_files = {
            "sentinel": os.path.join(LOG_DIR, "sentinel-status.log"),
            "watchdog": os.path.join(LOG_DIR, "watchdog-restarts.log"),
            "executor": os.path.join(LOG_DIR, "executor-status.log"),
            "selfcheck": os.path.join(LOG_DIR, "selfcheck-status.log"),
            "lifecycle": os.path.join(LOG_DIR, "lifecycle-status.log"),
        }

    def get_log_entries(self, log_type: str, lines: int = 100) -> List[Dict[str, Any]]:
        """Get recent log entries from a specific log file"""
        try:
            log_file = self.log_files.get(log_type)
            if not log_file or not os.path.exists(log_file):
                return []

            # Read last N lines safely"""
            with open(log_file, "r", encoding="utf-8") as f:
                all_lines = f.readlines()
                recent_lines = (
                    all_lines[-lines:] if len(all_lines) > lines else all_lines
                )

            entries = []
            for line in recent_lines:
                line = line.strip()
                if line:
                    # Parse timestamp if present
                    timestamp = None
                    if line.startswith("[") and "]" in line:
                        try:
                            timestamp_str = line[1 : line.index("]")]
                            timestamp = datetime.fromisoformat(
                                timestamp_str.replace("Z", "+00:00")
                            ).isoformat()
                        except:
                            timestamp = datetime.now().isoformat()
                    else:
                        timestamp = datetime.now().isoformat()

                    entries.append(
                        {"timestamp": timestamp, "message": line, "type": log_type}
                    )

            return entries

        except Exception as e:
            return [
                {
                    "timestamp": datetime.now().isoformat(),
                    "message": f"Error reading log: {str(e)}",
                    "type": log_type,
                    "error": True,
                }
            ]

    def get_all_logs(self, lines: int = 50) -> Dict[str, Any]:
        """Get recent logs from all log files"""
        all_logs = {}

        for log_type in self.log_files.keys():
            all_logs[log_type] = self.get_log_entries(log_type, lines)

        return {"logs": all_logs, "lastUpdate": datetime.now().isoformat()}

    def get_error_logs(self, lines: int = 100) -> List[Dict[str, Any]]:
        """Get error logs from all files"""
        error_entries = []

        for log_type, log_file in self.log_files.items():
            if os.path.exists(log_file):
                try:
                    with open(log_file, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if line and any(
                                error_indicator in line.lower()
                                for error_indicator in [
                                    "error",
                                    "failed",
                                    "❌",
                                    "exception",
                                ]
                            ):
                                error_entries.append(
                                    {
                                        "timestamp": datetime.now().isoformat(),
                                        "message": line,
                                        "type": log_type,
                                        "error": True,
                                    }
                                )
                except Exception as e:
                    error_entries.append(
                        {
                            "timestamp": datetime.now().isoformat(),
                            "message": f"Error reading {log_type} log: {str(e)}",
                            "type": log_type,
                            "error": True,
                        }
                    )

        # Sort by timestamp and return recent entries
        error_entries.sort(key=lambda x: x["timestamp"], reverse=True)
        return error_entries[:lines]


# Initialize monitors
daemon_monitor = DaemonMonitor()
log_monitor = LogMonitor()


@app.route("/api/status", methods=["GET"])
def get_status():
    """Get overall system status with daemon health and recent logs"""
    try:
        daemon_status = daemon_monitor.get_all_daemon_status()
        recent_logs = log_monitor.get_all_logs(lines=20)

        return jsonify(
            {
                "status": "success",
                "data": {
                    "daemons": daemon_status,
                    "logs": recent_logs,
                    "timestamp": datetime.now().isoformat(),
                },
            }
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/api/status/daemons", methods=["GET"])
def get_daemon_status():
    """Get detailed daemon status only"""
    try:
        daemon_status = daemon_monitor.get_all_daemon_status()

        return jsonify(
            {
                "status": "success",
                "data": daemon_status,
                "timestamp": datetime.now().isoformat(),
            }
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/api/status/daemon/<daemon_name>", methods=["GET"])
def get_single_daemon_status(daemon_name: str):
    """Get status for a specific daemon"""
    try:
        if daemon_name not in DAEMON_NAMES:
            return (
                jsonify(
                    {
                        "status": "error",
                        "error": f"Unknown daemon: {daemon_name}",
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                400,
            )

        daemon_status = daemon_monitor.get_daemon_status(daemon_name)

        return jsonify(
            {
                "status": "success",
                "data": daemon_status,
                "timestamp": datetime.now().isoformat(),
            }
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/api/logs", methods=["GET"])
def get_logs():
    """Get logs with optional filtering"""
    try:
        log_type = request.args.get("type", "all")
        lines = int(request.args.get("lines", 50))

        if log_type == "all":
            logs_data = log_monitor.get_all_logs(lines=lines)
        elif log_type == "errors":
            error_logs = log_monitor.get_error_logs(lines=lines)
            logs_data = {
                "logs": {"errors": error_logs},
                "lastUpdate": datetime.now().isoformat(),
            }
        elif log_type in log_monitor.log_files:
            entries = log_monitor.get_log_entries(log_type, lines)
            logs_data = {
                "logs": {log_type: entries},
                "lastUpdate": datetime.now().isoformat(),
            }
        else:
            return (
                jsonify(
                    {
                        "status": "error",
                        "error": f"Unknown log type: {log_type}",
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                400,
            )

        return jsonify(
            {
                "status": "success",
                "data": logs_data,
                "timestamp": datetime.now().isoformat(),
            }
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            500,
        )


@app.route("/api/logs/stream", methods=["GET"])
def stream_logs():
    """Stream logs in real-time using Server-Sent Events"""

    def generate():
        while True:
            try:
                log_type = request.args.get("type", "all")
                lines = int(request.args.get("lines", 10))

                if log_type == "all":
                    logs_data = log_monitor.get_all_logs(lines=lines)
                elif log_type == "errors":
                    error_logs = log_monitor.get_error_logs(lines=lines)
                    logs_data = {
                        "logs": {"errors": error_logs},
                        "lastUpdate": datetime.now().isoformat(),
                    }
                elif log_type in log_monitor.log_files:
                    entries = log_monitor.get_log_entries(log_type, lines)
                    logs_data = {
                        "logs": {log_type: entries},
                        "lastUpdate": datetime.now().isoformat(),
                    }
                else:
                    yield f"data: {json.dumps({'error': f'Unknown log type: {log_type}'})}\n\n"
                    break

                yield f"data: {json.dumps(logs_data)}\n\n"
                time.sleep(5)  # Update every 5 seconds

            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                break

    return Response(generate(), mimetype="text/plain")


@app.route("/api/health", methods=["GET"])
def health_check():
    """Simple health check endpoint"""
    return jsonify(
        {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "3.6.2",
        }
    )


if __name__ == "__main__":
    # Ensure log directory exists
    os.makedirs(LOG_DIR, exist_ok=True)

    print("[status-api] Starting status API server...")
    print(f"[status-api] Log directory: {LOG_DIR}")
    print(f"[status-api] Monitoring daemons: {DAEMON_NAMES}")

    app.run(host="0.0.0.0", port=5001, debug=False)
