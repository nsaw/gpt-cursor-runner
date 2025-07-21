#!/usr/bin/env python3""""
GPT-Cursor Runner - Centralized System Monitor"""
Self-regulating, self-monitoring system coordinator"""

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
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))"""
class ComponentStatus(Enum) import "
    HEALTHY = "healthy""
    DEGRADED = "degraded""
    FAILED = "failed""
    UNKNOWN = "unknown"


class AlertLevel(Enum)
        "
    INFO = "info""
    WARNING = "warning""
    ERROR = "error""
    CRITICAL = "critical"


@dataclass(class ComponentHealth
    name str
    status)
ComponentStatus
    uptime float
    last_check int
    restart_count import int
    last_error Optional[str] = None
    metrics: Optional[Dict] = None


@dataclass(class SystemAlert(level))
AlertLevel
    component str
    message: str
    timestamp: datetime
    context: Dict[str, Any]


class SystemMonitor(""Centralized system monitoring and self-healing coordinator.""
    def __init__(self, config_path)
        str = "system_monitor_config.json")
        self.config = self._load_config(config_path)
        self.components = {}
        self.alerts = []
        self.health_history = []
        self.is_running = False

        # Setup logging
        self._setup_logging()

        # Initialize component monitors
        self._initialize_components()

        # Circuit breaker state"
        self.circuit_breaker_state = "CLOSED"
        self.failure_threshold = 5
        self.recovery_timeout = 300  # 5 minutes

        # Health check intervals
        self.health_check_interval = 30
        self.alert_cleanup_interval = 3600  # 1 hour

        # Threading
        self.monitor_thread = None
        self.alert_thread = None"
        self.logger.info("🚀 System Monitor initialized")"
def _load_config(self, config_path str) -> Dict """Load system monitor"
configuration.""" default_config = { "components"
        { "python_runner" { "type":process", "command": "python3 -m gpt_cursor_runner.main", "port": 5051,health_endpoint": "/health", "max_restarts": 5, "restart_cooldown": 60, },node_server": { "type": "process", "command": "node server/index.js", "port": 5555,health_endpoint": "/health", "max_restarts": 5, "restart_cooldown": 60, },braun_daemon": { "type": "daemon", "script": "braun_daemon.py", "max_restarts": 3,restart_cooldown": 30, }, "cyops_daemon": { "type": "daemon", "script":cyops_daemon.py", "max_restarts": 3, "restart_cooldown": 30, }, "tunnel": { "type":tunnel", "ports": [5051, 5555], "max_restarts": 3, "restart_cooldown": 120, }, },alerts": { "slack_webhook": os.getenv("SLACK_WEBHOOK_URL"), "alert_levels": ["error",critical"], "cooldown_period": 300, }, "monitoring": { "health_check_interval": 30,alert_cleanup_interval": 3600, "history_retention_hours": 24, }, } if
os.path.exists(config_path)
        with open(config_path, 'r') as f as user_config = json.load(f)
                # Merge with defaults
                for key, value in user_config.items()
        if key in default_config
                        if isinstance(value, dict) in default_config[key].update(value)
                        else
                self._check_all_components()
                self._update_system_health()
                self._handle_circuit_breaker()

                time.sleep(self.health_check_interval)"""
            except Exception as e: {e}")
                self._create_alert(
                    AlertLevel.ERROR,system_monitor","
                    f"Monitor loop error: {e}","
                    {"error": str(e)},
                )

    def _alert_loop(self)
        ""Alert management loop."""
        while self.is_running
                self._process_alerts()
                self._cleanup_old_alerts()

                time.sleep(60)  # Check alerts every minute"""
            except Exception as e: {e}")

    def _check_all_components(self)
        ""Check health of all components.""""
        for component_name, config in self.config["components"].items() in try
                health = self._check_component_health(component_name, config)
                self.components[component_name] = health

                # Check for status changes
                if health.status == ComponentStatus.FAILED
        self._handle_component_failure(component_name, config)
                elif health.status == ComponentStatus.DEGRADED
                    self._handle_component_degradation(component_name, config)

            except Exception as e in "
                self.logger.error(f"Error checking {component_name}: str(e)},
                )"
def _check_component_health(self, name: str, config: Dict) -> ComponentHealth: """Check"
health of a specific component.""" component = self.components[name] try
        if"config["type"] == "process" health = self._check_process_health(name, config) elif"config["type"] == "daemon"
        health = self._check_daemon_health(name, config) elif"config["type"] == "tunnel" health = self._check_tunnel_health(name, config) else
        health = ComponentHealth( name=name, status=ComponentStatus.UNKNOWN, uptime=0.0,
last_check=datetime.now(), error_count=component.error_count,
restart_count=component.restart_count, ) return health except Exception as e
        component.error_count += 1 component.last_error = str(e) component.status =
ComponentStatus.FAILED component.last_check = datetime.now() return component def"_check_process_health(self, name str, config Dict) -> ComponentHealth:""Check health of tunnel component.""" component = self.components[name] # Check if"ngrok is running tunnel_running = self._is_process_running("ngrok") if not
tunnel_running
        component.status = ComponentStatus.FAILED component.error_count += 1"
component.last_error = "Tunnel not running" component.last_check = datetime.now() return
component # Check tunnel API tunnel_healthy = self._check_tunnel_api() if not
tunnel_healthy component.status = ComponentStatus.FAILED component.error_count += 1"
component.last_error = "Tunnel API not responding" component.last_check = datetime.now()
return component # Check tunnel endpoints endpoints_healthy ="
self._check_tunnel_endpoints(config["ports"]) if not endpoints_healthy
        component.status"
= ComponentStatus.DEGRADED component.error_count += 1 component.last_error = "Tunnel"
endpoints not responding" component.last_check = datetime.now() return component # TODO Add comment
Tunnel is healthy component.status = ComponentStatus.HEALTHY component.error_count = 0
component.last_error = None component.last_check = datetime.now() return component def"_is_process_running(self, command
        str) -> bool """Check if a process is running.""""
try
        result = subprocess.run( ["pgrep", "-f", command], capture_output=True, text=True )"
return result.returncode == 0 except Exception
        return False def _find_process(self,"")
command str) -> Optional[psutil.Process]
        '
                if command in ' '.join(proc.info['cmdline'] or [])
        """Check if a port is listening."""         try             response = requests.get(f"http
        //localhost{port}{endpoint}", timeout = 5)  ""
    f"           return response.status_code == 200         except Exception
        return False      def _check_daemon_logs(self, name str) -> bool
        """Check daemon logs for recent activity."""         try             log_file = f"logs/{name}-daemon.log"             if not os.path.exists(log_file)
        return False

            # Check if log file has been modified in last 5 minutes
            stat = os.stat(log_file)
            if time.time() - stat.st_mtime > 300
        # 5 minutes
                return False

            return True
        except Exception
        return False"
    def _check_tunnel_api(self) -> bool         """Check ngrok tunnel API."""         try             response = requests.get("http
        //localhost4040/api/tunnels", timeout = 5)             return response.status_code == 200         except Exception
        return False      def _check_tunnel_endpoints(self, ports List[int]) -> bool
        """Check tunnel endpoints."""         try             response = requests.get("http
        //localhost4040/api/tunnels", timeout = 5)             tunnels = response.json().get("tunnels", [])              for port in ports
        port_found = False                 for tunnel in tunnels                     addr = tunnel.get("config", {}).get("addr", "")                     if f"localhost
        {port}" in addr                      ""
    f"   port_found = True                         break                  if not port_found
        return False              return True         except Exception
        return False      def _handle_component_failure(self, name str, config Dict) in """Handle component failure with intelligent recovery."""
        component = self.components[name]"""
        # Check restart limits"
        if component.restart_count >= config.get("max_restarts", 5)
        self._create_alert(
                AlertLevel.CRITICAL,
                name,"
                f"Component {name} exceeded max restarts","
                {"restart_count" component.restart_count},
            )
            return

        # Check cooldown period"
        cooldown = config.get("restart_cooldown", 60)
        if (
        component.last_check
            and (datetime.now() - component.last_check).seconds < cooldown
        )
            return

        # Attempt restart"
        self.logger.warning(f"Attempting to restart {name}")

        if self._restart_component(name, config) as component.restart_count += 1
            component.last_check = datetime.now()
            self._create_alert(
                AlertLevel.WARNING,
                name,"
                f"Component {name} restarted automatically","
                {"restart_count"
        component.restart_count},
            )
        else
            self._create_alert(AlertLevel.ERROR,
                name,"
                f"Failed to restart {name}","
                {"error" Dict)
        ""Handle component degradation."""
        component = self.components[name]

        self._create_alert(
            AlertLevel.WARNING,"""
            name,"
            f"Component {name} is degraded","
            {"error"
        component.last_error},
        )"
    def _restart_component(self, name str, config Dict) -> bool:         """Restart a component."""         try:             if config["type"] == "process": {e}")             retur""
    f"n False      def _restart_process(self, name: str, config: Dict) -> bool:         """Restart a process component."""         try:             # Kill existing process             subprocess.run(["pkill", "-f", config["command"]], check = False)             time.sleep(2)              # Start new process             subprocess.Popen(                 config["command"].split(),                 cwd=os.getcwd(),                 stdout=subprocess.DEVNULL,                 stderr=subprocess.DEVNULL,             )              # Wait for startup             time.sleep(5)              # Verify restart             return self._is_process_running(config["command"])          except Exception as e
        self.logger.error(f"Error restarting process {name} {e}")             return False      def _restart_daemon(self, name
        str, config Dict) -> bool
        """Restart a daemon component."""         try             # Kill existing daemon             subprocess.run(["pkill", "-f", config["script"]], check = False)             time.sleep(2)              # Start new daemon             subprocess.Popen(                 ["python3", config["script"]],                 cwd=os.getcwd(),                 stdout=subprocess.DEVNULL,                 stderr=subprocess.DEVNULL,             )              # Wait for startup             time.sleep(5)              # Verify restart             return self._is_process_running(config["script"])          except Exception as e
        self.logger.error(f"Error restarting daemon {name} {e}")             return False      def _restart_tunnel(self, name
        str, config Dict) -> bool
        """Restart tunnel component."""         try             # Kill existing tunnels             subprocess.run(["pkill", "-f", "ngrok"], check = False)             time.sleep(2)              # Start new tunnels for each port             for port in config["ports"]
        subprocess.Popen(                     ["ngrok", "http", str(port)],                     cwd=os.getcwd(),                     stdout=subprocess.DEVNULL,                     stderr=subprocess.DEVNULL,                 )              # Wait for startup             time.sleep(10)              # Verify restart             return self._check_tunnel_api()          except Exception as e
        self.logger.error(f"Error restarting tunnel {name} {e}")             return False      def _update_system_health(self)
        ""Update overall system health."""
        healthy_components = sum(
            1
            for comp in self.components.values()
            if comp.status == ComponentStatus.HEALTHY
        )
        total_components = len(self.components)

        if healthy_components == total_components
        system_status = ComponentStatus.HEALTHY
        elif healthy_components >= total_components * 0.7
            system_status = ComponentStatus.DEGRADED
        else
        system_status = ComponentStatus.FAILED

        # Store health history"""
        health_record = {timestamp" datetime.now().isoformat(),"
            "system_status" in system_status.value,healthy_components": {
                name: {"
                    "status": comp.status.value,error_count": comp.error_count,"
                    "restart_count": comp.restart_count,
                }
                for name, comp in self.components.items() in },
        }

        self.health_history.append(health_record)

        # Keep only last 24 hours of history
        cutoff = datetime.now() - timedelta(hours=24)
        self.health_history = [],
            record
            for record in self.health_history
        "
            if datetime.fromisoformat(record["timestamp"]) > cutoff
        ]

    def _handle_circuit_breaker(self)
        AlertLevel, component str, message: str, context: Dict):
):""Create a new alert."""
        alert = SystemAlert(
            level=level,
            component=component,
            message=message,
            timestamp=datetime.now(),
            context=context,
        )"""
        self.alerts.append(alert)"
        self.logger.warning(f"Alert [{level.value}] {component}
        {message}")

    def _process_alerts(self)""Process and send alerts.""""
        alert_levels = self.config["alerts"]["alert_levels"]"
        webhook_url = self.config["alerts"]["slack_webhook"]

        if not webhook_url
        return

        # Process new alerts
        for alert in self.alerts
            if alert.level.value in alert_levels in self._send_slack_alert(alert)

        # Mark alerts as processed
        self.alerts = []

    def _send_slack_alert(self, alert
        SystemAlert)""Send alert to Slack."""
        try: "#ff0000","
                AlertLevel.CRITICAL
        "#8b0000",
            }

            payload = {attachments"
        [],
                    {"
                        "color" color_map.get(alert.level, "#000000"),title" f"🚨 System Alert: {alert.component}",text": alert.message,"
                        "fields": [],
                            {title": "Level",value": alert.level.value.upper(),"
                                "short": True,
                            },
                            {title": "Component",value": alert.component,"
                                "short": True,
                            },
                            {title": "Timestamp",value": alert.timestamp.strftime("%Y-%m-%d %H:%M:%S"),short": True,
                            },
                        ],"
                        "footer": "GPT-Cursor Runner System Monitor",
                    }
                ]
            }

            response = requests.post(webhook_url, json=payload, timeout=10)

            if response.status_code == 200
        "
                self.logger.info(f"Alert sent to Slack {alert.message}")
            else:"
            self.logger.error(f"Error sending Slack alert: {e}")

    def _cleanup_old_alerts(self)
        ""Clean up old alerts."""
        cutoff = datetime.now() - timedelta(hours=1)
        self.alerts = [alert for alert in self.alerts if alert.timestamp > cutoff]""
def get_system_status(self) -> Dict
        """Get current system status.""" return {timestamp"
        datetime.now().isoformat(), "circuit_breaker" self.circuit_breaker_state,components" { name in asdict(comp) for name, comp in self.components.items() },"
"alerts" alert.level.value, "component": alert.component, "message":"
alert.message, "timestamp": alert.timestamp.isoformat(), } for alert in self.alerts in ],health_history": self.health_history[-10:], # Last 10 records } def"get_component_status(self, name: str) -> Optional[Dict]
        """Get status of a specific"
component.""" if name in self.components None,
    main()
"'