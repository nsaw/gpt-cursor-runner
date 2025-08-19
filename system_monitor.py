# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
#!/usr/bin/env python3
"""
GPT-Cursor Runner - Centralized System Monitor
Self-regulating, self-monitoring system coordinator
"""

import os
import sys
import logging
import threading
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


class ComponentStatus:
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    FAILED = "failed"
    UNKNOWN = "unknown"


class AlertLevel:
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class ComponentHealth:
    def __init__(
        self,
        name: str,
        status: str,
        uptime: float,
        last_check: int,
        restart_count: int,
        last_error: Optional[str] = None,
        metrics: Optional[Dict[str, Any]] = None,
    ):
        self.name = name
        self.status = status
        self.uptime = uptime
        self.last_check = last_check
        self.restart_count = restart_count
        self.last_error = last_error
        self.metrics = metrics or {}


class SystemAlert:
    def __init__(
        self,
        level: str,
        component: str,
        message: str,
        timestamp: datetime,
        context: Dict[str, Any],
    ):
        self.level = level
        self.component = component
        self.message = message
        self.timestamp = timestamp
        self.context = context


class SystemMonitor:
    """Centralized system monitoring and self-healing coordinator."""

    def __init__(self, config_path: str = "system_monitor_config.json") -> None:
        self.config = self._load_config(config_path)
        self.components: Dict[str, ComponentHealth] = {}
        self.alerts: List[SystemAlert] = []
        self.health_history: List[Dict[str, Any]] = []
        self.is_running = False

        # Setup logging
        self._setup_logging()

        # Initialize component monitors
        self._initialize_components()

        # Circuit breaker state
        self.circuit_breaker_state = "CLOSED"
        self.failure_threshold = 5
        self.recovery_timeout = 300  # 5 minutes

        # Health check intervals
        self.health_check_interval = 30
        self.alert_cleanup_interval = 3600  # 1 hour

        # Threading
        self.monitor_thread = None
        self.alert_thread = None

        self.logger.info("🚀 System Monitor initialized")

    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load system monitor configuration."""
        default_config = {
            "components": {
                "python_runner": {
                    "type": "process",
                    "command": "python3 -m gpt_cursor_runner.main",
                    "port": 5051,
                    "health_endpoint": "/health",
                    "max_restarts": 5,
                    "restart_cooldown": 60,
                },
                "node_server": {
                    "type": "process",
                    "command": "node server/index.js",
                    "port": 5555,
                    "health_endpoint": "/health",
                    "max_restarts": 5,
                    "restart_cooldown": 60,
                },
                "braun_daemon": {
                    "type": "daemon",
                    "script": "braun_daemon.py",
                    "max_restarts": 3,
                    "restart_cooldown": 30,
                },
                "cyops_daemon": {
                    "type": "daemon",
                    "script": "cyops_daemon.py",
                    "max_restarts": 3,
                    "restart_cooldown": 30,
                },
                "tunnel": {
                    "type": "tunnel",
                    "ports": [5051, 5555],
                    "max_restarts": 3,
                    "restart_cooldown": 120,
                },
            },
            "alerts": {
                "slack_webhook": os.getenv("SLACK_WEBHOOK_URL"),
                "alert_levels": ["error", "critical"],
                "cooldown_period": 300,
            },
            "monitoring": {
                "health_check_interval": 30,
                "alert_cleanup_interval": 3600,
                "history_retention_hours": 24,
            },
        }

        if os.path.exists(config_path):
            with open(config_path, "r") as f:
                import json

                user_config = json.load(f)
                # Merge with defaults
                for key, value in user_config.items():
                    if key in default_config:
                        if isinstance(value, dict) and isinstance(
                            default_config[key], dict
                        ):
                            default_config[key].update(value)
                        else:
                            default_config[key] = value

        return default_config

    def _setup_logging(self) -> None:
        """Setup logging configuration."""
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            handlers=[
                logging.FileHandler("system_monitor.log"),
                logging.StreamHandler(),
            ],
        )
        self.logger = logging.getLogger(__name__)

    def _initialize_components(self) -> None:
        """Initialize component monitors."""
        for name, config in self.config["components"].items():
            self.components[name] = ComponentHealth(
                name=name,
                status=ComponentStatus.UNKNOWN,
                uptime=0.0,
                last_check=int(time.time()),
                restart_count=0,
            )

    def start(self) -> None:
        """Start the system monitor."""
        self.is_running = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop)
        self.alert_thread = threading.Thread(target=self._alert_loop)

        self.monitor_thread.start()
        self.alert_thread.start()

        self.logger.info("🚀 System Monitor started")

    def stop(self) -> None:
        """Stop the system monitor."""
        self.is_running = False
        if self.monitor_thread:
            self.monitor_thread.join()
        if self.alert_thread:
            self.alert_thread.join()

        self.logger.info("🛑 System Monitor stopped")

    def _monitor_loop(self) -> None:
        """Main monitoring loop."""
        while self.is_running:
            try:
                self._check_all_components()
                self._update_system_health()
                self._handle_circuit_breaker()

                time.sleep(self.health_check_interval)
            except Exception as e:
                self.logger.error(f"Error in monitor loop: {e}")
                self._create_alert(
                    AlertLevel.ERROR,
                    "system_monitor",
                    f"Monitor loop error: {e}",
                    {"error": str(e)},
                )

    def _check_all_components(self) -> None:
        """Check health of all components."""
        for name, config in self.config["components"].items():
            try:
                if config["type"] == "process":
                    self._check_process_component(name, config)
                elif config["type"] == "daemon":
                    self._check_daemon_component(name, config)
                elif config["type"] == "tunnel":
                    self._check_tunnel_component(name, config)
            except Exception as e:
                self.logger.error(f"Error checking component {name}: {e}")
                self._update_component_status(
                    name, ComponentStatus.FAILED, error=str(e)
                )

    def _check_process_component(self, name: str, config: Dict[str, Any]) -> None:
        """Check process component health."""
        try:
            # Check if process is running
            if "port" in config:
                import requests

                response = requests.get(
                    f"http://localhost:{config['port']}{config.get('health_endpoint', '/health')}",
                    timeout=5,
                )
                if response.status_code == 200:
                    self._update_component_status(name, ComponentStatus.HEALTHY)
                else:
                    self._update_component_status(name, ComponentStatus.DEGRADED)
            else:
                # Basic process check
                self._update_component_status(name, ComponentStatus.HEALTHY)
        except Exception as e:
            self._update_component_status(name, ComponentStatus.FAILED, error=str(e))

    def _check_daemon_component(self, name: str, config: Dict[str, Any]) -> None:
        """Check daemon component health."""
        try:
            # Check if daemon script is running
            import subprocess

            result = subprocess.run(
                ["pgrep", "-f", config["script"]], capture_output=True, text=True
            )
            if result.returncode == 0:
                self._update_component_status(name, ComponentStatus.HEALTHY)
            else:
                self._update_component_status(name, ComponentStatus.FAILED)
        except Exception as e:
            self._update_component_status(name, ComponentStatus.FAILED, error=str(e))

    def _check_tunnel_component(self, name: str, config: Dict[str, Any]) -> None:
        """Check tunnel component health."""
        try:
            # Check if tunnel ports are accessible
            import socket

            for port in config.get("ports", []):
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                result = sock.connect_ex(("localhost", port))
                sock.close()
                if result != 0:
                    self._update_component_status(name, ComponentStatus.FAILED)
                    return

            self._update_component_status(name, ComponentStatus.HEALTHY)
        except Exception as e:
            self._update_component_status(name, ComponentStatus.FAILED, error=str(e))

    def _update_component_status(
        self, name: str, status: str, error: Optional[str] = None
    ) -> None:
        """Update component status."""
        if name in self.components:
            self.components[name].status = status
            self.components[name].last_check = int(time.time())
            if error:
                self.components[name].last_error = error

    def _update_system_health(self) -> None:
        """Update overall system health."""
        healthy_count = sum(
            1 for c in self.components.values() if c.status == ComponentStatus.HEALTHY
        )
        total_count = len(self.components)

        if healthy_count == total_count:
            system_status = ComponentStatus.HEALTHY
        elif healthy_count > total_count * 0.5:
            system_status = ComponentStatus.DEGRADED
        else:
            system_status = ComponentStatus.FAILED

        # Update health history
        self.health_history.append(
            {
                "timestamp": datetime.now(),
                "status": system_status,
                "healthy_components": healthy_count,
                "total_components": total_count,
            }
        )

    def _handle_circuit_breaker(self) -> None:
        """Handle circuit breaker logic."""
        failed_components = sum(
            1 for c in self.components.values() if c.status == ComponentStatus.FAILED
        )

        if failed_components >= self.failure_threshold:
            if self.circuit_breaker_state == "CLOSED":
                self.circuit_breaker_state = "OPEN"
                self.logger.warning(
                    "🚨 Circuit breaker opened - too many failed components"
                )
        elif failed_components < self.failure_threshold * 0.5:
            if self.circuit_breaker_state == "OPEN":
                self.circuit_breaker_state = "CLOSED"
                self.logger.info("✅ Circuit breaker closed - system recovered")

    def _create_alert(
        self, level: str, component: str, message: str, context: Dict[str, Any]
    ) -> None:
        """Create a new system alert."""
        alert = SystemAlert(
            level=level,
            component=component,
            message=message,
            timestamp=datetime.now(),
            context=context,
        )
        self.alerts.append(alert)

        # Send to external systems if configured
        if level in [AlertLevel.ERROR, AlertLevel.CRITICAL]:
            self._send_slack_alert(alert)

    def _send_slack_alert(self, alert: SystemAlert) -> None:
        """Send alert to Slack if configured."""
        webhook_url = self.config.get("alerts", {}).get("slack_webhook")
        if webhook_url:
            try:
                import requests

                payload = {
                    "text": f"🚨 {alert.level.upper()}: {alert.component} - {alert.message}",
                    "attachments": [
                        {
                            "fields": [
                                {
                                    "title": "Component",
                                    "value": alert.component,
                                    "short": True,
                                },
                                {"title": "Level", "value": alert.level, "short": True},
                                {
                                    "title": "Time",
                                    "value": alert.timestamp.strftime(
                                        "%Y-%m-%d %H:%M:%S"
                                    ),
                                    "short": True,
                                },
                            ]
                        }
                    ],
                }
                requests.post(webhook_url, json=payload, timeout=5)
            except Exception as e:
                self.logger.error(f"Failed to send Slack alert: {e}")

    def _alert_loop(self) -> None:
        """Alert processing loop."""
        while self.is_running:
            try:
                # Clean up old alerts
                current_time = datetime.now()
                self.alerts = [
                    alert
                    for alert in self.alerts
                    if (current_time - alert.timestamp).total_seconds()
                    < self.alert_cleanup_interval
                ]

                time.sleep(self.alert_cleanup_interval)
            except Exception as e:
                self.logger.error(f"Error in alert loop: {e}")

    def get_system_status(self) -> Dict[str, Any]:
        """Get current system status."""
        return {
            "status": "running" if self.is_running else "stopped",
            "circuit_breaker": self.circuit_breaker_state,
            "components": {
                name: {
                    "status": comp.status,
                    "uptime": comp.uptime,
                    "last_check": comp.last_check,
                    "restart_count": comp.restart_count,
                    "last_error": comp.last_error,
                }
                for name, comp in self.components.items()
            },
            "alerts_count": len(self.alerts),
            "health_history": self.health_history[-10:],  # Last 10 entries
        }


if __name__ == "__main__":
    monitor = SystemMonitor()
    try:
        monitor.start()
        # Keep running until interrupted
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        monitor.stop()
        print("System monitor stopped by user")
