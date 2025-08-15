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
import time
from datetime import datetime
from typing import Dict, Any
from flask import Flask, jsonify
from flask_cors import CORS

# Import existing monitors (commented out for now to avoid import issues)
# from .status import daemon_monitor, log_monitor

app = Flask(__name__)
CORS(app)

# Configuration
ORCHESTRATOR_LOG_DIR = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs"
DAEMON_SCRIPTS_DIR = "/Users/sawyer/gitSync/gpt-cursor-runner/src-nextgen/ghost/shell"


class OrchestratorMonitor:
    def __init__(self):
        self.orchestration_state = {}
        self.last_check = {}
        self.cache_duration = 10  # Cache results for 10 seconds

    def get_orchestration_state(self) -> Dict[str, Any]:
        """Get current orchestration state from Phase 5 daemons"""
        current_time = time.time()

        # Check cache first"""
        if "orchestration" in self.last_check:
            cached_time, cached_state = self.last_check["orchestration"]
            if current_time - cached_time < self.cache_duration:
                return cached_state

        state = {
            "sentinel": self._get_sentinel_state(),
            "watchdog": self._get_watchdog_state(),
            "executor": self._get_executor_state(),
            "selfcheck": self._get_selfcheck_state(),
            "lifecycle": self._get_lifecycle_state(),
            "lastUpdate": datetime.now().isoformat(),
        }

        # Cache the result
        self.last_check["orchestration"] = (current_time, state)

        return state

    def _get_sentinel_state(self) -> Dict[str, Any]:
        """Get sentinel guard orchestration state"""
        try:
            log_file = os.path.join(ORCHESTRATOR_LOG_DIR, "sentinel-status.log")
            if not os.path.exists(log_file):
                return {
                    "status": "unknown",
                    "monitoring": False,
                    "lastCheck": datetime.now().isoformat(),
                    "error": "Log file not found",
                }

            # Read last 5 lines to get recent state
            with open(log_file, "r", encoding="utf-8") as f:
                lines = f.readlines()[-5:]

            # Parse sentinel state
            monitoring = any("🟢" in line for line in lines)
            errors = [line.strip() for line in lines if "❌" in line]

            return {
                "status": "active" if monitoring else "inactive",
                "monitoring": monitoring,
                "lastCheck": datetime.now().isoformat(),
                "recentErrors": errors[:3],
                "error": None if monitoring else "Sentinel not monitoring",
            }

        except Exception as e:
            return {
                "status": "error",
                "monitoring": False,
                "lastCheck": datetime.now().isoformat(),
                "error": str(e),
            }

    def _get_watchdog_state(self) -> Dict[str, Any]:
        """Get watchdog loop orchestration state"""
        try:
            log_file = os.path.join(ORCHESTRATOR_LOG_DIR, "watchdog-restarts.log")
            if not os.path.exists(log_file):
                return {
                    "status": "unknown",
                    "restartCount": 0,
                    "lastRestart": None,
                    "lastCheck": datetime.now().isoformat(),
                    "error": "Log file not found",
                }

            # Read last 10 lines to get restart stats
            with open(log_file, "r", encoding="utf-8") as f:
                lines = f.readlines()[-10:]

            # Parse restart statistics
            restart_count = len([line for line in lines if "✅" in line])
            failed_count = len([line for line in lines if "❌" in line])

            # Get last restart timestamp
            last_restart = None
            for line in reversed(lines):
                if "✅" in line and "[" in line and "]" in line:
                    try:
                        timestamp_str = line[line.index("[") + 1 : line.index("]")]
                        last_restart = timestamp_str
                        break
                    except:
                        continue

            return {
                "status": "active" if restart_count > 0 or failed_count > 0 else "idle",
                "restartCount": restart_count,
                "failedCount": failed_count,
                "lastRestart": last_restart,
                "lastCheck": datetime.now().isoformat(),
                "error": None,
            }

        except Exception as e:
            return {
                "status": "error",
                "restartCount": 0,
                "lastRestart": None,
                "lastCheck": datetime.now().isoformat(),
                "error": str(e),
            }

    def _get_executor_state(self) -> Dict[str, Any]:
        """Get executor unifier orchestration state"""
        try:
            log_file = os.path.join(ORCHESTRATOR_LOG_DIR, "executor-status.log")
            if not os.path.exists(log_file):
                return {
                    "status": "unknown",
                    "activeTasks": 0,
                    "completedTasks": 0,
                    "lastCheck": datetime.now().isoformat(),
                    "error": "Log file not found",
                }

            # Read last 10 lines to get executor state
            with open(log_file, "r", encoding="utf-8") as f:
                lines = f.readlines()[-10:]

            # Parse executor statistics
            active_tasks = len([line for line in lines if "executing" in line.lower()])
            completed_tasks = len(
                [line for line in lines if "completed" in line.lower()]
            )

            return {
                "status": "active" if active_tasks > 0 else "idle",
                "activeTasks": active_tasks,
                "completedTasks": completed_tasks,
                "lastCheck": datetime.now().isoformat(),
                "error": None,
            }

        except Exception as e:
            return {
                "status": "error",
                "activeTasks": 0,
                "completedTasks": 0,
                "lastCheck": datetime.now().isoformat(),
                "error": str(e),
            }

    def _get_selfcheck_state(self) -> Dict[str, Any]:
        """Get self-check core orchestration state"""
        try:
            log_file = os.path.join(ORCHESTRATOR_LOG_DIR, "selfcheck-status.log")
            if not os.path.exists(log_file):
                return {
                    "status": "unknown",
                    "healthChecks": 0,
                    "lastHealthCheck": None,
                    "lastCheck": datetime.now().isoformat(),
                    "error": "Log file not found",
                }

            # Read last 10 lines to get self-check state
            with open(log_file, "r", encoding="utf-8") as f:
                lines = f.readlines()[-10:]

            # Parse self-check statistics
            health_checks = len([line for line in lines if "health" in line.lower()])

            # Get last health check timestamp
            last_health_check = None
            for line in reversed(lines):
                if "health" in line.lower() and "[" in line and "]" in line:
                    try:
                        timestamp_str = line[line.index("[") + 1 : line.index("]")]
                        last_health_check = timestamp_str
                        break
                    except:
                        continue

            return {
                "status": "active" if health_checks > 0 else "idle",
                "healthChecks": health_checks,
                "lastHealthCheck": last_health_check,
                "lastCheck": datetime.now().isoformat(),
                "error": None,
            }

        except Exception as e:
            return {
                "status": "error",
                "healthChecks": 0,
                "lastHealthCheck": None,
                "lastCheck": datetime.now().isoformat(),
                "error": str(e),
            }

    def _get_lifecycle_state(self) -> Dict[str, Any]:
        """Get lifecycle governor orchestration state"""
        try:"""
            log_file = os.path.join(ORCHESTRATOR_LOG_DIR, "lifecycle-status.log")
            if not os.path.exists(log_file):
                return {
                    "status": "unknown",
                    "managedDaemons": 0,
                    "startupOrder": [],
                    "lastCheck": datetime.now().isoformat(),
                    "error": "Log file not found",
                }

            # Read last 10 lines to get lifecycle state
            with open(log_file, "r", encoding="utf-8") as f:
                lines = f.readlines()[-10:]

            # Parse lifecycle statistics
            managed_daemons = len(
                [line for line in lines if "managing" in line.lower()]
            )
            startup_order = []

            # Extract startup order if available
            for line in lines:
                if "startup" in line.lower() and "order" in line.lower():
                    # Try to extract daemon names from startup order
                    if "[" in line and "]" in line:
                        try:
                            order_str = line[line.index("[") + 1 : line.index("]")]
                            startup_order = [
                                name.strip() for name in order_str.split(",")
                            ]
                        except:
                            pass
                    break

            return {
                "status": "active" if managed_daemons > 0 else "idle",
                "managedDaemons": managed_daemons,
                "startupOrder": startup_order,
                "lastCheck": datetime.now().isoformat(),
                "error": None,
            }

        except Exception as e:
            return {
                "status": "error",
                "managedDaemons": 0,
                "startupOrder": [],
                "lastCheck": datetime.now().isoformat(),
                "error": str(e),
            }


# Initialize orchestrator monitor
orchestrator_monitor = OrchestratorMonitor()


@app.route("/api/orchestrator/status", methods=["GET"])
def get_orchestrator_status():
    """Get overall orchestration status with all Phase 5 daemon states"""
    try:
        orchestration_state = orchestrator_monitor.get_orchestration_state()

        # Calculate overall orchestration health
        active_count = sum(
            1
            for component in orchestration_state.values()
            if isinstance(component, dict) and component.get("status") == "active"
        )
        error_count = sum(
            1
            for component in orchestration_state.values()
            if isinstance(component, dict) and component.get("status") == "error"
        )

        total_components = 5  # sentinel, watchdog, executor, selfcheck, lifecycle

        if active_count == total_components:
            overall_health = "healthy"
        elif active_count >= total_components * 0.7 and error_count == 0:
            overall_health = "warning"
        else:
            overall_health = "critical"

        return jsonify(
            {
                "status": "success",
                "data": {
                    "orchestration": orchestration_state,
                    "overallHealth": overall_health,
                    "activeComponents": active_count,
                    "errorComponents": error_count,
                    "totalComponents": total_components,
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


@app.route("/api/orchestrator/component/<component_name>", methods=["GET"])
def get_component_status(component_name: str):
    """Get status for a specific orchestration component"""
    try:
        orchestration_state = orchestrator_monitor.get_orchestration_state()

        if component_name not in orchestration_state:
            return (
                jsonify(
                    {
                        "status": "error",
                        "error": f"Unknown component: {component_name}",
                        "timestamp": datetime.now().isoformat(),
                    }
                ),
                400,
            )

        component_state = orchestration_state[component_name]

        return jsonify(
            {
                "status": "success",
                "data": component_state,
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


@app.route("/api/orchestrator/health", methods=["GET"])
def get_orchestrator_health():
    """Get orchestration health summary"""
    try:
        orchestration_state = orchestrator_monitor.get_orchestration_state()

        # Calculate health metrics
        active_count = sum(
            1
            for component in orchestration_state.values()"""
            if isinstance(component, dict) and component.get("status") == "active"
        )
        error_count = sum(
            1
            for component in orchestration_state.values()
            if isinstance(component, dict) and component.get("status") == "error"
        )

        total_components = 5
        health_percentage = (
            (active_count / total_components) * 100 if total_components > 0 else 0
        )

        return jsonify(
            {
                "status": "success",
                "data": {
                    "healthPercentage": round(health_percentage, 1),
                    "activeComponents": active_count,
                    "errorComponents": error_count,
                    "totalComponents": total_components,
                    "lastUpdate": datetime.now().isoformat(),
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


if __name__ == "__main__":
    # Ensure log directory exists
    os.makedirs(ORCHESTRATOR_LOG_DIR, exist_ok=True)

    print("[orchestrator-api] Starting orchestrator API server...")
    print(f"[orchestrator-api] Log directory: {ORCHESTRATOR_LOG_DIR}")
    print("[orchestrator-api] Monitoring Phase 5 orchestration components")

    app.run(host="0.0.0.0", port=5002, debug=False)
