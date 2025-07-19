#!/usr/bin/env python3
"""
GPT-Cursor Runner - Centralized System Monitor
Self-regulating, self-monitoring system coordinator
"""

import os
import sys
import time
import json
import logging
import subprocess
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import requests
import psutil
import signal

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


class ComponentStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    FAILED = "failed"
    UNKNOWN = "unknown"


class AlertLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class ComponentHealth:
    name: str
    status: ComponentStatus
    uptime: float
    last_check: datetime
    error_count: int
    restart_count: int
    last_error: Optional[str] = None
    metrics: Optional[Dict] = None


@dataclass
class SystemAlert:
    level: AlertLevel
    component: str
    message: str
    timestamp: datetime
    context: Dict[str, Any]


class SystemMonitor:
    """Centralized system monitoring and self-healing coordinator."""

    def __init__(self, config_path: str = "system_monitor_config.json"):
        self.config = self._load_config(config_path)
        self.components = {}
        self.alerts = []
        self.health_history = []
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

    def _load_config(self, config_path: str) -> Dict:
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
            with open(config_path, 'r') as f:
                user_config = json.load(f)
                # Merge with defaults
                for key, value in user_config.items():
                    if key in default_config:
                        if isinstance(value, dict):
                            default_config[key].update(value)
                        else:
                            default_config[key] = value
                    else:
                        default_config[key] = value

        return default_config

    def _setup_logging(self):
        """Setup structured logging."""
        log_dir = "logs"
        os.makedirs(log_dir, exist_ok=True)

        self.logger = logging.getLogger("SystemMonitor")
        self.logger.setLevel(logging.INFO)

        # File handler
        fh = logging.FileHandler(f"{log_dir}/system_monitor.log")
        fh.setLevel(logging.INFO)

        # Console handler
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)

        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        fh.setFormatter(formatter)
        ch.setFormatter(formatter)

        self.logger.addHandler(fh)
        self.logger.addHandler(ch)

    def _initialize_components(self):
        """Initialize component health tracking."""
        for name, config in self.config["components"].items():
            self.components[name] = ComponentHealth(
                name=name,
                status=ComponentStatus.UNKNOWN,
                uptime=0.0,
                last_check=datetime.now(),
                error_count=0,
                restart_count=0,
            )

    def start(self):
        """Start the system monitor."""
        if self.is_running:
            self.logger.warning("System monitor already running")
            return

        self.is_running = True
        self.logger.info("🚀 Starting System Monitor")

        # Start monitoring thread
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()

        # Start alert management thread
        self.alert_thread = threading.Thread(target=self._alert_loop, daemon=True)
        self.alert_thread.start()

        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        self.logger.info("✅ System Monitor started successfully")

    def stop(self):
        """Stop the system monitor."""
        self.is_running = False
        self.logger.info("🛑 Stopping System Monitor")

        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)

        if self.alert_thread:
            self.alert_thread.join(timeout=5)

        self.logger.info("✅ System Monitor stopped")

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        self.logger.info(f"Received signal {signum}, shutting down...")
        self.stop()
        sys.exit(0)

    def _monitor_loop(self):
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

    def _alert_loop(self):
        """Alert management loop."""
        while self.is_running:
            try:
                self._process_alerts()
                self._cleanup_old_alerts()

                time.sleep(60)  # Check alerts every minute

            except Exception as e:
                self.logger.error(f"Error in alert loop: {e}")

    def _check_all_components(self):
        """Check health of all components."""
        for component_name, config in self.config["components"].items():
            try:
                health = self._check_component_health(component_name, config)
                self.components[component_name] = health

                # Check for status changes
                if health.status == ComponentStatus.FAILED:
                    self._handle_component_failure(component_name, config)
                elif health.status == ComponentStatus.DEGRADED:
                    self._handle_component_degradation(component_name, config)

            except Exception as e:
                self.logger.error(f"Error checking {component_name}: {e}")
                self._create_alert(
                    AlertLevel.ERROR,
                    component_name,
                    f"Health check error: {e}",
                    {"error": str(e)},
                )

    def _check_component_health(self, name: str, config: Dict) -> ComponentHealth:
        """Check health of a specific component."""
        component = self.components[name]

        try:
            if config["type"] == "process":
                health = self._check_process_health(name, config)
            elif config["type"] == "daemon":
                health = self._check_daemon_health(name, config)
            elif config["type"] == "tunnel":
                health = self._check_tunnel_health(name, config)
            else:
                health = ComponentHealth(
                    name=name,
                    status=ComponentStatus.UNKNOWN,
                    uptime=0.0,
                    last_check=datetime.now(),
                    error_count=component.error_count,
                    restart_count=component.restart_count,
                )

            return health

        except Exception as e:
            component.error_count += 1
            component.last_error = str(e)
            component.status = ComponentStatus.FAILED
            component.last_check = datetime.now()
            return component

    def _check_process_health(self, name: str, config: Dict) -> ComponentHealth:
        """Check health of a process-based component."""
        component = self.components[name]

        # Check if process is running
        process_running = self._is_process_running(config["command"])

        if not process_running:
            component.status = ComponentStatus.FAILED
            component.error_count += 1
            component.last_error = "Process not running"
            component.last_check = datetime.now()
            return component

        # Check port availability
        port_healthy = self._check_port_health(config["port"])

        if not port_healthy:
            component.status = ComponentStatus.DEGRADED
            component.error_count += 1
            component.last_error = "Port not responding"
            component.last_check = datetime.now()
            return component

        # Check HTTP health endpoint
        if "health_endpoint" in config:
            http_healthy = self._check_http_health(
                config["port"], config["health_endpoint"]
            )

            if not http_healthy:
                component.status = ComponentStatus.DEGRADED
                component.error_count += 1
                component.last_error = "Health endpoint not responding"
                component.last_check = datetime.now()
                return component

        # Component is healthy
        component.status = ComponentStatus.HEALTHY
        component.error_count = 0
        component.last_error = None
        component.last_check = datetime.now()

        # Calculate uptime
        try:
            process = self._find_process(config["command"])
            if process:
                component.uptime = time.time() - process.create_time()
        except Exception:
            component.uptime = 0.0

        return component

    def _check_daemon_health(self, name: str, config: Dict) -> ComponentHealth:
        """Check health of a daemon component."""
        component = self.components[name]

        # Check if daemon process is running
        daemon_running = self._is_process_running(config["script"])

        if not daemon_running:
            component.status = ComponentStatus.FAILED
            component.error_count += 1
            component.last_error = "Daemon not running"
            component.last_check = datetime.now()
            return component

        # Check daemon log for recent activity
        log_healthy = self._check_daemon_logs(name)

        if not log_healthy:
            component.status = ComponentStatus.DEGRADED
            component.error_count += 1
            component.last_error = "No recent daemon activity"
            component.last_check = datetime.now()
            return component

        # Daemon is healthy
        component.status = ComponentStatus.HEALTHY
        component.error_count = 0
        component.last_error = None
        component.last_check = datetime.now()

        # Calculate uptime
        try:
            process = self._find_process(config["script"])
            if process:
                component.uptime = time.time() - process.create_time()
        except Exception:
            component.uptime = 0.0

        return component

    def _check_tunnel_health(self, name: str, config: Dict) -> ComponentHealth:
        """Check health of tunnel component."""
        component = self.components[name]

        # Check if ngrok is running
        tunnel_running = self._is_process_running("ngrok")

        if not tunnel_running:
            component.status = ComponentStatus.FAILED
            component.error_count += 1
            component.last_error = "Tunnel not running"
            component.last_check = datetime.now()
            return component

        # Check tunnel API
        tunnel_healthy = self._check_tunnel_api()

        if not tunnel_healthy:
            component.status = ComponentStatus.FAILED
            component.error_count += 1
            component.last_error = "Tunnel API not responding"
            component.last_check = datetime.now()
            return component

        # Check tunnel endpoints
        endpoints_healthy = self._check_tunnel_endpoints(config["ports"])

        if not endpoints_healthy:
            component.status = ComponentStatus.DEGRADED
            component.error_count += 1
            component.last_error = "Tunnel endpoints not responding"
            component.last_check = datetime.now()
            return component

        # Tunnel is healthy
        component.status = ComponentStatus.HEALTHY
        component.error_count = 0
        component.last_error = None
        component.last_check = datetime.now()

        return component

    def _is_process_running(self, command: str) -> bool:
        """Check if a process is running."""
        try:
            result = subprocess.run(
                ["pgrep", "-f", command], capture_output=True, text=True
            )
            return result.returncode == 0
        except Exception:
            return False

    def _find_process(self, command: str) -> Optional[psutil.Process]:
        """Find a process by command."""
        try:
            for proc in psutil.process_iter(['pid', 'cmdline']):
                if command in ' '.join(proc.info['cmdline'] or []):
                    return proc
        except Exception:
            pass
        return None

    def _check_port_health(self, port: int) -> bool:
        """Check if a port is listening."""
        try:
            import socket

            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex(('localhost', port))
            sock.close()
            return result == 0
        except Exception:
            return False

    def _check_http_health(self, port: int, endpoint: str) -> bool:
        """Check HTTP health endpoint."""
        try:
            response = requests.get(f"http://localhost:{port}{endpoint}", timeout=5)
            return response.status_code == 200
        except Exception:
            return False

    def _check_daemon_logs(self, name: str) -> bool:
        """Check daemon logs for recent activity."""
        try:
            log_file = f"logs/{name}-daemon.log"
            if not os.path.exists(log_file):
                return False

            # Check if log file has been modified in last 5 minutes
            stat = os.stat(log_file)
            if time.time() - stat.st_mtime > 300:  # 5 minutes
                return False

            return True
        except Exception:
            return False

    def _check_tunnel_api(self) -> bool:
        """Check ngrok tunnel API."""
        try:
            response = requests.get("http://localhost:4040/api/tunnels", timeout=5)
            return response.status_code == 200
        except Exception:
            return False

    def _check_tunnel_endpoints(self, ports: List[int]) -> bool:
        """Check tunnel endpoints."""
        try:
            response = requests.get("http://localhost:4040/api/tunnels", timeout=5)
            tunnels = response.json().get("tunnels", [])

            for port in ports:
                port_found = False
                for tunnel in tunnels:
                    addr = tunnel.get("config", {}).get("addr", "")
                    if f"localhost:{port}" in addr:
                        port_found = True
                        break

                if not port_found:
                    return False

            return True
        except Exception:
            return False

    def _handle_component_failure(self, name: str, config: Dict):
        """Handle component failure with intelligent recovery."""
        component = self.components[name]

        # Check restart limits
        if component.restart_count >= config.get("max_restarts", 5):
            self._create_alert(
                AlertLevel.CRITICAL,
                name,
                f"Component {name} exceeded max restarts",
                {"restart_count": component.restart_count},
            )
            return

        # Check cooldown period
        cooldown = config.get("restart_cooldown", 60)
        if (
            component.last_check
            and (datetime.now() - component.last_check).seconds < cooldown
        ):
            return

        # Attempt restart
        self.logger.warning(f"Attempting to restart {name}")

        if self._restart_component(name, config):
            component.restart_count += 1
            component.last_check = datetime.now()
            self._create_alert(
                AlertLevel.WARNING,
                name,
                f"Component {name} restarted automatically",
                {"restart_count": component.restart_count},
            )
        else:
            self._create_alert(
                AlertLevel.ERROR,
                name,
                f"Failed to restart {name}",
                {"error": component.last_error},
            )

    def _handle_component_degradation(self, name: str, config: Dict):
        """Handle component degradation."""
        component = self.components[name]

        self._create_alert(
            AlertLevel.WARNING,
            name,
            f"Component {name} is degraded",
            {"error": component.last_error},
        )

    def _restart_component(self, name: str, config: Dict) -> bool:
        """Restart a component."""
        try:
            if config["type"] == "process":
                return self._restart_process(name, config)
            elif config["type"] == "daemon":
                return self._restart_daemon(name, config)
            elif config["type"] == "tunnel":
                return self._restart_tunnel(name, config)
            else:
                return False
        except Exception as e:
            self.logger.error(f"Error restarting {name}: {e}")
            return False

    def _restart_process(self, name: str, config: Dict) -> bool:
        """Restart a process component."""
        try:
            # Kill existing process
            subprocess.run(["pkill", "-f", config["command"]], check=False)
            time.sleep(2)

            # Start new process
            subprocess.Popen(
                config["command"].split(),
                cwd=os.getcwd(),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

            # Wait for startup
            time.sleep(5)

            # Verify restart
            return self._is_process_running(config["command"])

        except Exception as e:
            self.logger.error(f"Error restarting process {name}: {e}")
            return False

    def _restart_daemon(self, name: str, config: Dict) -> bool:
        """Restart a daemon component."""
        try:
            # Kill existing daemon
            subprocess.run(["pkill", "-f", config["script"]], check=False)
            time.sleep(2)

            # Start new daemon
            subprocess.Popen(
                ["python3", config["script"]],
                cwd=os.getcwd(),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

            # Wait for startup
            time.sleep(5)

            # Verify restart
            return self._is_process_running(config["script"])

        except Exception as e:
            self.logger.error(f"Error restarting daemon {name}: {e}")
            return False

    def _restart_tunnel(self, name: str, config: Dict) -> bool:
        """Restart tunnel component."""
        try:
            # Kill existing tunnels
            subprocess.run(["pkill", "-f", "ngrok"], check=False)
            time.sleep(2)

            # Start new tunnels for each port
            for port in config["ports"]:
                subprocess.Popen(
                    ["ngrok", "http", str(port)],
                    cwd=os.getcwd(),
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )

            # Wait for startup
            time.sleep(10)

            # Verify restart
            return self._check_tunnel_api()

        except Exception as e:
            self.logger.error(f"Error restarting tunnel {name}: {e}")
            return False

    def _update_system_health(self):
        """Update overall system health."""
        healthy_components = sum(
            1
            for comp in self.components.values()
            if comp.status == ComponentStatus.HEALTHY
        )
        total_components = len(self.components)

        if healthy_components == total_components:
            system_status = ComponentStatus.HEALTHY
        elif healthy_components >= total_components * 0.7:
            system_status = ComponentStatus.DEGRADED
        else:
            system_status = ComponentStatus.FAILED

        # Store health history
        health_record = {
            "timestamp": datetime.now().isoformat(),
            "system_status": system_status.value,
            "healthy_components": healthy_components,
            "total_components": total_components,
            "components": {
                name: {
                    "status": comp.status.value,
                    "error_count": comp.error_count,
                    "restart_count": comp.restart_count,
                }
                for name, comp in self.components.items()
            },
        }

        self.health_history.append(health_record)

        # Keep only last 24 hours of history
        cutoff = datetime.now() - timedelta(hours=24)
        self.health_history = [
            record
            for record in self.health_history
            if datetime.fromisoformat(record["timestamp"]) > cutoff
        ]

    def _handle_circuit_breaker(self):
        """Handle circuit breaker logic."""
        failed_components = sum(
            1
            for comp in self.components.values()
            if comp.status == ComponentStatus.FAILED
        )

        if failed_components >= self.failure_threshold:
            if self.circuit_breaker_state == "CLOSED":
                self.circuit_breaker_state = "OPEN"
                self._create_alert(
                    AlertLevel.CRITICAL,
                    "system_monitor",
                    "Circuit breaker opened - too many component failures",
                    {"failed_components": failed_components},
                )
        elif failed_components == 0:
            if self.circuit_breaker_state == "OPEN":
                self.circuit_breaker_state = "CLOSED"
                self._create_alert(
                    AlertLevel.INFO,
                    "system_monitor",
                    "Circuit breaker closed - system recovered",
                    {"failed_components": failed_components},
                )

    def _create_alert(
        self, level: AlertLevel, component: str, message: str, context: Dict
    ):
        """Create a new alert."""
        alert = SystemAlert(
            level=level,
            component=component,
            message=message,
            timestamp=datetime.now(),
            context=context,
        )

        self.alerts.append(alert)
        self.logger.warning(f"Alert [{level.value}] {component}: {message}")

    def _process_alerts(self):
        """Process and send alerts."""
        alert_levels = self.config["alerts"]["alert_levels"]
        webhook_url = self.config["alerts"]["slack_webhook"]

        if not webhook_url:
            return

        # Process new alerts
        for alert in self.alerts:
            if alert.level.value in alert_levels:
                self._send_slack_alert(alert)

        # Mark alerts as processed
        self.alerts = []

    def _send_slack_alert(self, alert: SystemAlert):
        """Send alert to Slack."""
        try:
            color_map = {
                AlertLevel.INFO: "#36a64f",
                AlertLevel.WARNING: "#ffa500",
                AlertLevel.ERROR: "#ff0000",
                AlertLevel.CRITICAL: "#8b0000",
            }

            payload = {
                "attachments": [
                    {
                        "color": color_map.get(alert.level, "#000000"),
                        "title": f"🚨 System Alert: {alert.component}",
                        "text": alert.message,
                        "fields": [
                            {
                                "title": "Level",
                                "value": alert.level.value.upper(),
                                "short": True,
                            },
                            {
                                "title": "Component",
                                "value": alert.component,
                                "short": True,
                            },
                            {
                                "title": "Timestamp",
                                "value": alert.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                                "short": True,
                            },
                        ],
                        "footer": "GPT-Cursor Runner System Monitor",
                    }
                ]
            }

            response = requests.post(webhook_url, json=payload, timeout=10)

            if response.status_code == 200:
                self.logger.info(f"Alert sent to Slack: {alert.message}")
            else:
                self.logger.error(
                    f"Failed to send alert to Slack: {response.status_code}"
                )

        except Exception as e:
            self.logger.error(f"Error sending Slack alert: {e}")

    def _cleanup_old_alerts(self):
        """Clean up old alerts."""
        cutoff = datetime.now() - timedelta(hours=1)
        self.alerts = [alert for alert in self.alerts if alert.timestamp > cutoff]

    def get_system_status(self) -> Dict:
        """Get current system status."""
        return {
            "timestamp": datetime.now().isoformat(),
            "circuit_breaker": self.circuit_breaker_state,
            "components": {
                name: asdict(comp) for name, comp in self.components.items()
            },
            "alerts": [
                {
                    "level": alert.level.value,
                    "component": alert.component,
                    "message": alert.message,
                    "timestamp": alert.timestamp.isoformat(),
                }
                for alert in self.alerts
            ],
            "health_history": self.health_history[-10:],  # Last 10 records
        }

    def get_component_status(self, name: str) -> Optional[Dict]:
        """Get status of a specific component."""
        if name in self.components:
            return asdict(self.components[name])
        return None


def main():
    """Main entry point."""
    monitor = SystemMonitor()

    try:
        monitor.start()

        # Keep main thread alive
        while monitor.is_running:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n🛑 Shutting down System Monitor...")
    finally:
        monitor.stop()


if __name__ == "__main__":
    main()
