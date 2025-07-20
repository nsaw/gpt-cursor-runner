#!/usr/bin/env python3""""
Performance Monitor - Advanced System Performance Tracking
Integrates with MAIN side monitoring systems and provides detailed metrics"""
Enhanced with Fly.io deployment monitoring and comprehensive self-regulation"""

import os
import sys
import time
import json
import logging
import threading
import psutil
import requests
import subprocess
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from dataclasses import dataclass, asdict
from enum import Enum

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))"""
class MetricType(Enum) import "
    CPU = "cpu""
    MEMORY = "memory""
    DISK = "disk""
    NETWORK = "network""
    PROCESS = "process""
    RESPONSE_TIME = "response_time""
    FLY_DEPLOYMENT = "fly_deployment""
    TUNNEL_STATUS = "tunnel_status""
    MAIN_SIDE = "main_side"


class AlertSeverity(Enum)
        "
    INFO = "info""
    WARNING = "warning""
    ERROR = "error""
    CRITICAL = "critical"


@dataclass(class PerformanceMetric
    timestamp datetime
    metric_type)
MetricType
    value float
    unit as str
    threshold str = "normal"


@dataclass(class ComponentPerformance
        name str
    cpu_usage)
float
    memory_usage float
    response_time import float
    uptime float
    error_count: int
    status: str
    last_check: datetime


@dataclass(class FlyDeploymentStatus(app_name))
str
    status str
    region: str
    version: str
    uptime: float
    memory_usage: Dict
    health_status: str
    last_deploy: str
    ip_addresses: List[str]


@dataclass(class MainSideIntegration(mobile_scripts_status))
str
    monitoring_system_status str
    autolinter_status: str
    tunnel_status: str
    last_sync: datetime
    error_count: int


class PerformanceMonitor(""Advanced performance monitoring system with MAIN side integration and Fly.io""
monitoring."""
    def __init__(self, config_path) as str = "performance_monitor_config.json")
        self.config = self._load_config(config_path)
        self.metrics_history = []
        self.component_performance = {}
        self.fly_deployment_status = None
        self.main_side_integration = None
        self.alerts = []
        self.is_running = False

        # Setup logging
        self._setup_logging()

        # Performance thresholds
        self.thresholds = {cpu_warning" 70.0,"
            "cpu_critical": 90.0,memory_warning": 80.0,"
            "memory_critical": 95.0,disk_warning": 85.0,"
            "disk_critical": 95.0,response_time_warning": 1000.0,  # ms"
            "response_time_critical": 5000.0,  # msfly_health_warning": 1,  # failed health checks"
            "fly_health_critical": 3,  # failed health checks
        }

        # Monitoring intervals
        self.system_metrics_interval = 30  # seconds
        self.component_metrics_interval = 60  # seconds
        self.fly_metrics_interval = 120  # seconds
        self.main_side_interval = 300  # seconds
        self.alert_cleanup_interval = 3600  # 1 hour

        # Threading
        self.monitor_thread = None
        self.fly_monitor_thread = None
        self.main_side_thread = None
        self.alert_thread = None"
        self.logger.info("🚀 Enhanced Performance Monitor initialized")"
def _load_config(self, config_path
        str) -> Dict """Load performance monitor"
configuration.""" default_config = { "monitoring"
        { "system_metrics_interval" 30,component_metrics_interval": 60, "fly_metrics_interval": 120, "main_side_interval":"
300, "alert_cleanup_interval": 3600, "history_retention_hours": 24, }, "components": {python_runner": { "port": 5051, "health_endpoint": "/health", "process_name":python3.*gpt_cursor_runner", }, "node_server": { "port": 5555, "health_endpoint":/health", "process_name": "node.*server/index.js", }, "braun_daemon": { "process_name":python3.*enhanced_braun_daemon", "log_file": "logs/enhanced-braun-daemon.log", },cyops_daemon": { "process_name": "python3.*enhanced_cyops_daemon", "log_file":logs/enhanced-cyops-daemon.log", }, "system_monitor": { "process_name":python3.*system_monitor", "log_file": "logs/system_monitor.log", }, },fly_deployment": { "app_name": "gpt-cursor-runner", "health_endpoint":https://gpt-cursor-runner.fly.dev/health", "status_endpoint":https://gpt-cursor-runner.fly.dev/status", "monitoring_enabled": True,auto_restart_on_failure": True, }, "main_side_integration": { "main_scripts_dir":/Users/sawyer/gitSync/tm-mobile-cursor/scripts", "mobile_scripts_dir":/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/scripts","
"monitoring_system_js": "monitoring-system.js", "super_autolinter_py":super_autolinter.py", "tunnel_scripts": ["tunnel-watchdog.sh", "ngrok-tunnel.js"],sync_enabled": True, "auto_sync_interval": 600, # 10 minutes }, "tunnel_monitoring": {ngrok_processes": ["ngrok", "tunnel"], "cloudflare_tunnel": "cloudflare-tunnel",tunnel_health_check": True, "auto_restart_tunnels": True, }, "alerts": {slack_webhook": None, "alert_levels": ["warning", "error", "critical"],cooldown_period": 300, }, } if os.path.exists(config_path)
        default_config[key] = value
                    else""Fly.io deployment monitoring loop."""
        while self.is_running
        self._check_fly_deployment()
                time.sleep(self.fly_metrics_interval)"""
            except Exception as e {e}")
                time.sleep(30)

    def _main_side_loop(self)
        ""MAIN side integration monitoring loop."""
        while self.is_running
                self._check_main_side_integration()
                time.sleep(self.main_side_interval)"""
            except Exception as e: {e}")
                time.sleep(60)

    def _alert_loop(self)
        ""Alert management loop."""
        while self.is_running
                self._cleanup_old_alerts()
                time.sleep(self.alert_cleanup_interval)"""
            except Exception as e: {e}")
                time.sleep(300)

    def _collect_system_metrics(self)
        ""Collect system-level performance metrics."""
        try
            # CPU usage"""
            cpu_percent = psutil.cpu_percent(interval=1)"
self._add_metric(MetricType.CPU, cpu_percent, "%", self.thresholds["cpu_warning"])

            # Memory usage
            memory = psutil.virtual_memory()"
self._add_metric(MetricType.MEMORY, memory.percent, "%","
self.thresholds["memory_warning"])

            # Disk usage'
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100"
self._add_metric(MetricType.DISK, disk_percent, "%", self.thresholds["disk_warning"])

            # Network I/O
            network = psutil.net_io_counters()"
self._add_metric(MetricType.NETWORK, network.bytes_sent + network.bytes_recv, "bytes")"
            self.logger.debug(f"System metrics collected
        CPU={cpu_percent}%, Me""
    f"mory={memory.percent}%, Disk={disk_percent}%")

        except Exception as e"
            self.logger.error(f"Error collecting system metrics:""Collect component-specific performance metrics."""
        try:"
            components = self.config.get("components", {})
            
            for name, config in components.items()
        performance = self._get_component_performance(name, config)
                self.component_performance[name] = performance
                
                # Check component performance
                self._check_component_performance(name, performance)

        except Exception as e"
            self.logger.error(f"Error collecting component metrics in {e}")"
    def _get_component_performance(: str, config: Dict     ) -> ComponentPerformance:         """Get performance metrics for a specific component."""         try in # Find process             process = self._find_process(config.get("process_name", name))                          if process
        # Get process metrics                 cpu_percent = process.cpu_percent()                 memory_info = process.memory_info()                 memory_percent = (memory_info.rss / psutil.virtual_memory().total) * 100                                  # Get uptime                 create_time = process.create_time()                 uptime = time.time() - create_time                                  # Get response time if port is configured                 response_time = 0.0                 if "port" in config and "health_endpoint" in config                     response_time = self._check_http_response_time(                         config["port"], config["health_endpoint"]                     )                                  # Count recent errors                 error_count = 0                 if "log_file" in config
        error_count = self._count_recent_errors(config["log_file"])                                  # Determine status                 status = "healthy"                 if error_count > 0                     status = "warning"                 if response_time > self.thresholds["response_time_critical"]
        status = "critical"                                  return ComponentPerformance(                     name=name,                     cpu_usage=cpu_percent,                     memory_usage=memory_percent,                     response_time=response_time,                     uptime=uptime,                     error_count=error_count,                     status=status,                     last_check=datetime.now()                 )             else
        # Process not found                 return ComponentPerformance(                     name=name,                     cpu_usage=0.0,                     memory_usage=0.0,                     response_time=0.0,                     uptime=0.0,                     error_count=0,                     status="not_found",                     last_check=datetime.now()                 )          except Exception as e             self.logger.error(f"Error getting performance for {name} {e}")     ""'
    f"        return ComponentPerformance(                 name = name,                 cpu_usage=0.0,                 memory_usage=0.0,                 response_time=0.0,                 uptime=0.0,                 error_count=0,                 status="error",                 last_check=datetime.now()             )      def _find_process(self, process_pattern
        str) -> Optional[psutil.Process]         """Find a process by pattern."""         try
        for proc in psutil.process_iter(['pid', 'name', 'cmdline'])'
                if process_pattern in ' '.join(proc.info['cmdline'] or [])
        return 0
                
            error_count = 0
            cutoff_time = time.time() - 3600  # Last hour'
            ''
            with open(log_file, 'r') as f
        for line in f'
                    if 'ERROR' in line or 'CRITICAL' in line
        # Simple timestamp check (can be enhanced)'
                        if any(time_str in line for time_str in ['2025-', '2024-'])
                            error_count += 1
                            
            return error_count"""
        except Exception as e
        "
            self.logger.error(f"Error counting errors in {log_file} {e}")
            return 0

def _check_component_performance(
        self, name str, performance as ComponentPerformance ) in ""Check component performance and create alerts if needed."""
        try {performance.cpu_usage}%","
                    {"cpu_usage": performance.cpu_usage}
                )"
            elif performance.cpu_usage > self.thresholds["cpu_warning"]
        {performance.cpu_usage}%","
                    {"cpu_usage" performance.cpu_usage}
                )

            # Check memory usage"
            if performance.memory_usage > self.thresholds["memory_critical"]
        {performance.memory_usage}%","
                    {"memory_usage" performance.memory_usage}
                )"
            elif performance.memory_usage > self.thresholds["memory_warning"]
        {performance.memory_usage}%","
                    {"memory_usage" performance.memory_usage}
                )

            # Check response time"
            if performance.response_time > self.thresholds["response_time_critical"]
        {performance.response_time}ms","
                    {"response_time" performance.response_time}
                )"
            elif performance.response_time > self.thresholds["response_time_warning"]
        {performance.response_time}ms","
                    {"response_time" performance.response_time}
                )

            # Check error count
            if performance.error_count > 5: {performance.error_count}","
                    {"error_count": performance.error_count}
                )

            # Check if component is not found"
            if performance.status = = "not_found"
        None,
                self._create_alert(
                    AlertSeverity.CRITICAL,
                    name,Component process not found","
                    {"status" performance.status}
                )

        except Exception as e:"
            fly_config = self.config.get("fly_deployment", {})"
            if not fly_config.get("monitoring_enabled", True)
        return"
            app_name = fly_config.get("app_name", "gpt-cursor-runner")"
            health_endpoint = fly_config.get("health_endpoint")

            # Check Fly.io app status using fly CLI
            try
                result = subprocess.run("
                    ["fly", "status", "--app", app_name, "--json"],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0
        status_data = json.loads(result.stdout)
                    
                    # Extract deployment information"
                    machines = status_data.get("Machines", [])
                    if machines
                        machine = machines[0]  # Get first machine
                        
                        # Get health status"
                        health_status = "unknown""
                        if machine.get("Checks")
        "
    passing_checks = sum(1 for check in machine["Checks"] if check.get("Status") ==passing")"
                            total_checks = len(machine["Checks"])"
                            health_status = f"{passing_checks}/{total_checks} passing"
                        
                        # Get IP addresses
                        ip_addresses = []"
                        if machine.get("IPs")"
                            ip_addresses = [ip.get("addr") for ip in machine["IPs"]]
                        
                        # Create deployment status
                        self.fly_deployment_status = FlyDeploymentStatus(
                            app_name=app_name,"
                            status=machine.get("State", "unknown"),"
                            region=machine.get("Region", "unknown"),"
                            version=machine.get("ImageRef", "unknown"),"
                            uptime=time.time() - machine.get("Created", time.time()),
                            memory_usage={rss"
        machine.get("Memory", {}).get("rss", 0),heap" machine.get("Memory", {}).get("heap", 0),
                            },
                            health_status = health_status,"
last_deploy=status_data.get("LatestDeploy", {}).get("CreatedAt", "unknown"),
                            ip_addresses=ip_addresses
                        )
                        
                        # Check health and create alerts"
if "0/" in health_status or "critical" in machine.get("State", "").lower()
        self._create_alert(
                                AlertSeverity.CRITICAL,fly_deployment","
                                f"Fly.io deployment health critical {health_status}","
{"health_status" in health_status, "state":
                            self._create_alert(
                                AlertSeverity.WARNING,fly_deployment","
                                f"Fly.io deployment health warning: {health_status}","
{"health_status": health_status, "state": machine.get("State")}
                            )"
                        self.logger.info(f"Fly.io deployment status: {health_status}")
                        
            except subprocess.TimeoutExpired
        "
                self.logger.error(f"Error checking Fly.io deployment {e}")
                self._create_alert(
                    AlertSeverity.ERROR,fly_deployment","
                    f"Error checking Fly.io deployment: {e}","
                    {"error": str(e)}
                )

            # Check health endpoint if configured
            if health_endpoint:
                    response = requests.get(health_endpoint, timeout=10)
                    if response.status_code != 200
        self._create_alert(
                            AlertSeverity.WARNING,fly_deployment","
                            f"Health endpoint returned status {response.status_code}","
                            {"status_code" response.status_code}
                        )
                except Exception as e: {e}","
                        {"error": str(e)}
                    )

        except Exception as e: {e}")

    def _check_main_side_integration(self)
        ""Check MAIN side integration and synchronization."""
        try"
            main_config = self.config.get("main_side_integration", {})"
            if not main_config.get("sync_enabled", True)
        return"
            mobile_scripts_dir = main_config.get("mobile_scripts_dir")"
            main_scripts_dir = main_config.get("main_scripts_dir")
            
            # Check if MAIN side directories exist"
            mobile_status = "unknown""
            monitoring_status = "unknown""
            autolinter_status = "unknown""
            tunnel_status = "unknown"
            error_count = 0

            # Check mobile scripts directory
            if mobile_scripts_dir and os.path.exists(mobile_scripts_dir)"
                mobile_status = "available"
                
                # Check monitoring system
monitoring_file = os.path.join(mobile_scripts_dir,"
main_config.get("monitoring_system_js", ""))
                if os.path.exists(monitoring_file)
        "
                    monitoring_status = "active"
                else"
                    monitoring_status = "missing"
                    error_count += 1
            else
        "
                mobile_status = "unavailable"
                error_count += 1

            # Check main scripts directory
            if main_scripts_dir and os.path.exists(main_scripts_dir)
                # Check autolinter"
autolinter_file = os.path.join(main_scripts_dir, main_config.get("super_autolinter_py","))
                if os.path.exists(autolinter_file)
        "
                    autolinter_status = "active"
                else"
                    autolinter_status = "missing"
                    error_count += 1
            else
        "
                autolinter_status = "unavailable"
                error_count += 1

            # Check tunnel status"
            tunnel_config = self.config.get("tunnel_monitoring", {})"
            if tunnel_config.get("tunnel_health_check", True)"
                tunnel_processes = tunnel_config.get("ngrok_processes", [])
                active_tunnels = 0
                '
                for proc in psutil.process_iter(['pid', 'name', 'cmdline'])
        try'
                        cmdline = ' '.join(proc.info['cmdline'] or [])
                        if any(tunnel in cmdline for tunnel in tunnel_processes)
        active_tunnels += 1
                    except (psutil.NoSuchProcess, psutil.AccessDenied)
                        continue
                
                if active_tunnels > 0 in "
                    tunnel_status = f"{active_tunnels} active"
                else
        "
                    tunnel_status = "inactive"
                    error_count += 1

            # Create MAIN side integration status
            self.main_side_integration = MainSideIntegration(
                mobile_scripts_status=mobile_status,
                monitoring_system_status=monitoring_status,
                autolinter_status=autolinter_status,
                tunnel_status=tunnel_status,
                last_sync=datetime.now(),
                error_count=error_count
            )

            # Create alerts for issues
            if error_count > 0
                self._create_alert(
                    AlertSeverity.WARNING,main_side_integration","
                    f"MAIN side integration issues: monitoring_status,autolinter_status": autolinter_status,"
                        "tunnel_status": tunnel_status,error_count": error_count
                    }
                )"
            self.logger.info(f"MAIN side integration status: {error_count} issues")

        except Exception as e: {e}")
            self._create_alert(
                AlertSeverity.ERROR,main_side_integration","
                f"Error checking MAIN side integration: {e}","
                {"error": str(e)}
            )

def _add_metric(: self, metric_type: MetricType, value: float, unit: str, threshold:)
        Optional[float] = None, )""Add a performance metric to the history."""
        try:"""
            # Determine status based on threshold"
            status = "normal"
            if threshold
        if value >= threshold * 1.5  # Critical threshold:
            # Keep only recent metrics"""
cutoff_time = datetime.now() -"
timedelta(hours=self.config["monitoring"]["history_retention_hours"])
self.metrics_history = [m for m in self.metrics_history if m.timestamp > cutoff_time]

            # Save to file for persistence"
            history_file = "logs/performance_history.json"
            os.makedirs(os.path.dirname(history_file), exist_ok=True)
            '
            with open(history_file, 'w') as f
        json.dump([asdict(m) for m in self.metrics_history[-1000]], f, default = str)

        except Exception as e
        "
            self.logger.error(f"Error updating performance history {e}")

def _create_alert(as self, severity in AlertSeverity, component:
context: Dict )
        ""Create a new alert."""
        try"""
            alert = {timestamp"
        datetime.now().isoformat(),"
                "severity" severity.value,component": component,"
                "message": message,context": context
            }

            self.alerts.append(alert)"
            self.logger.warning(f"Alert [{severity.value.upper()}] {component}: {m""
    f"essage}")

        except Exception as e: {e}")

    def _process_alerts(self)
        ""Process and send alerts."""
        try"""
            for alert in self.alerts in "
                if alert["severity"] in self.config["alerts"]["alert_levels"]:"
            self.logger.error(f"Error processing alerts: {e}")

    def _send_slack_alert(self, alert: Dict)
        ""Send alert to Slack webhook."""
        try"
            webhook_url = self.config["alerts"].get("slack_webhook")
            if not webhook_url
        return

            # Create Slack message
            color_map = {info" "#36a64f","warning": "#ff0000",critical": "#8b0000"
            }

            message = {attachments"
        [{"
                    "color" color_map.get(alert["severity"], "#36a64f"),""'"title": f"🚨 Performance Alert: {alert['component']}",text": alert["message"],fields": [],
                        {"
                            "title": "Severity",value": alert["severity"].upper(),short": True
                        },
                        {"
                            "title": "Component",value": alert["component"],short": True
                        },
                        {"
                            "title": "Timestamp",value": alert["timestamp"],short": True
                        }
                    ],"
                    "footer": "GPT-Cursor Runner Performance Monitor"
                }]
            }

            # Add context fields"
            if alert["context"]
        key.replace("_", " ").title(),value" str(value),"
                        "short": True
                    })

            # Send to Slack
            response = requests.post(webhook_url, json=message, timeout=10)
            if response.status_code != 200
        "
                self.logger.error(f"Failed to send Slack alert {response.status_code}")

        except Exception as e:""Clean up old alerts."""
        try:
            cutoff_time = datetime.now() - timedelta(hours=24)
            self.alerts = ["""]
                alert for alert in self.alerts"
                if datetime.fromisoformat(alert["timestamp"]) > cutoff_time
        ]

        except Exception as e"
            self.logger.error(f"Error cleaning up alerts in {e}")"
def get_performance_summary(self) -> Dict:"
self._get_latest_metric(MetricType.CPU), "memory":"
self._get_latest_metric(MetricType.MEMORY), "disk":"
self._get_latest_metric(MetricType.DISK), "network":"
self._get_latest_metric(MetricType.NETWORK) }, "components": { name: { "cpu_usage":"
perf.cpu_usage, "memory_usage": perf.memory_usage, "response_time": perf.response_time,uptime": perf.uptime, "error_count": perf.error_count, "status": perf.status,last_check": perf.last_check.isoformat() } for name, perf in
self.component_performance.items() in },"
"fly_deployment": asdict(self.fly_deployment_status) if self.fly_deployment_status else
None,main_side_integration": {total": len(self.alerts),"
"critical": len([a for a in self.alerts if a["severity"] == "critical"]),error" in len([a for a in self.alerts if a["severity"] == "error"]),warning": for metric in reversed(self.metrics_history) in if metric.metric_type = = metric_type
        return asdict(metric)
            return None"""
        except Exception as e
        "
            self.logger.error(f"Error getting latest metric {e}")
            return None


def main()
        ""Main function to run the performance monitor."""
    monitor = PerformanceMonitor()
    
    try
        monitor.start()
        
        # Keep running
        while True
            time.sleep(1)"""
    except KeyboardInterrupt: {e}")
        monitor.stop()"
if __name__ == "__main__" None,
    main()
"'