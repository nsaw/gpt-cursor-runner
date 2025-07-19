#!/usr/bin/env python3
"""
Performance Monitor - Advanced System Performance Tracking
Integrates with MAIN side monitoring systems and provides detailed metrics
"""

import os
import sys
import time
import json
import logging
import threading
import psutil
import requests
from datetime import datetime, timedelta
from typing import Dict, Optional
from dataclasses import dataclass, asdict
from enum import Enum

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


class MetricType(Enum):
    CPU = "cpu"
    MEMORY = "memory"
    DISK = "disk"
    NETWORK = "network"
    PROCESS = "process"
    RESPONSE_TIME = "response_time"


class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class PerformanceMetric:
    timestamp: datetime
    metric_type: MetricType
    value: float
    unit: str
    threshold: Optional[float] = None
    status: str = "normal"


@dataclass
class ComponentPerformance:
    name: str
    cpu_usage: float
    memory_usage: float
    response_time: float
    uptime: float
    error_count: int
    status: str
    last_check: datetime


class PerformanceMonitor:
    """Advanced performance monitoring system with MAIN side integration."""

    def __init__(self, config_path: str = "performance_monitor_config.json"):
        self.config = self._load_config(config_path)
        self.metrics_history = []
        self.component_performance = {}
        self.alerts = []
        self.is_running = False

        # Setup logging
        self._setup_logging()

        # Performance thresholds
        self.thresholds = {
            "cpu_warning": 70.0,
            "cpu_critical": 90.0,
            "memory_warning": 80.0,
            "memory_critical": 95.0,
            "disk_warning": 85.0,
            "disk_critical": 95.0,
            "response_time_warning": 1000.0,  # ms
            "response_time_critical": 5000.0,  # ms
        }

        # Monitoring intervals
        self.system_metrics_interval = 30  # seconds
        self.component_metrics_interval = 60  # seconds
        self.alert_cleanup_interval = 3600  # 1 hour

        # Threading
        self.monitor_thread = None
        self.alert_thread = None

        self.logger.info("🚀 Performance Monitor initialized")

    def _load_config(self, config_path: str) -> Dict:
        """Load performance monitor configuration."""
        default_config = {
            "monitoring": {
                "system_metrics_interval": 30,
                "component_metrics_interval": 60,
                "alert_cleanup_interval": 3600,
                "history_retention_hours": 24,
            },
            "components": {
                "python_runner": {
                    "port": 5051,
                    "health_endpoint": "/health",
                    "process_name": "python3.*gpt_cursor_runner",
                },
                "node_server": {
                    "port": 5555,
                    "health_endpoint": "/health",
                    "process_name": "node.*server/index.js",
                },
                "braun_daemon": {
                    "process_name": "python3.*enhanced_braun_daemon",
                    "log_file": "logs/enhanced-braun-daemon.log",
                },
                "cyops_daemon": {
                    "process_name": "python3.*enhanced_cyops_daemon",
                    "log_file": "logs/enhanced-cyops-daemon.log",
                },
                "system_monitor": {
                    "process_name": "python3.*system_monitor",
                    "log_file": "logs/system_monitor.log",
                },
            },
            "main_side_integration": {
                "main_scripts_dir": "/Users/sawyer/gitSync/tm-mobile-cursor/scripts",
                "mobile_scripts_dir": "/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/scripts",
                "monitoring_system_js": "monitoring-system.js",
                "super_autolinter_py": "super_autolinter.py",
            },
            "alerts": {
                "slack_webhook": None,
                "alert_levels": ["warning", "error", "critical"],
                "cooldown_period": 300,
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

        self.logger = logging.getLogger("PerformanceMonitor")
        self.logger.setLevel(logging.INFO)

        # File handler
        fh = logging.FileHandler(f"{log_dir}/performance_monitor.log")
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

    def start(self):
        """Start the performance monitor."""
        if self.is_running:
            self.logger.warning("Performance monitor already running")
            return

        self.is_running = True
        self.logger.info("🚀 Starting Performance Monitor")

        # Start monitoring thread
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()

        # Start alert management thread
        self.alert_thread = threading.Thread(target=self._alert_loop, daemon=True)
        self.alert_thread.start()

        self.logger.info("✅ Performance Monitor started successfully")

    def stop(self):
        """Stop the performance monitor."""
        self.is_running = False
        self.logger.info("🛑 Stopping Performance Monitor")

        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)

        if self.alert_thread:
            self.alert_thread.join(timeout=5)

        self.logger.info("✅ Performance Monitor stopped")

    def _monitor_loop(self):
        """Main monitoring loop."""
        while self.is_running:
            try:
                # Collect system metrics
                self._collect_system_metrics()

                # Collect component metrics
                self._collect_component_metrics()

                # Check MAIN side integration
                self._check_main_side_integration()

                # Update performance history
                self._update_performance_history()

                time.sleep(self.system_metrics_interval)

            except Exception as e:
                self.logger.error(f"Error in monitor loop: {e}")
                self._create_alert(
                    AlertSeverity.ERROR,
                    "performance_monitor",
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

    def _collect_system_metrics(self):
        """Collect system-wide performance metrics."""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            self._add_metric(
                MetricType.CPU, cpu_percent, "%", self.thresholds["cpu_warning"]
            )

            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            self._add_metric(
                MetricType.MEMORY,
                memory_percent,
                "%",
                self.thresholds["memory_warning"],
            )

            # Disk usage
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            self._add_metric(
                MetricType.DISK, disk_percent, "%", self.thresholds["disk_warning"]
            )

            # Network I/O
            network = psutil.net_io_counters()
            self._add_metric(
                MetricType.NETWORK, network.bytes_sent + network.bytes_recv, "bytes"
            )

            self.logger.info(
                f"📊 System Metrics - CPU: {cpu_percent:.1f}%, "
                f"Memory: {memory_percent:.1f}%, "
                f"Disk: {disk_percent:.1f}%"
            )

        except Exception as e:
            self.logger.error(f"Error collecting system metrics: {e}")

    def _collect_component_metrics(self):
        """Collect component-specific performance metrics."""
        for component_name, config in self.config["components"].items():
            try:
                performance = self._get_component_performance(component_name, config)
                self.component_performance[component_name] = performance

                # Check for performance issues
                self._check_component_performance(component_name, performance)

            except Exception as e:
                self.logger.error(f"Error collecting metrics for {component_name}: {e}")

    def _get_component_performance(
        self, name: str, config: Dict
    ) -> ComponentPerformance:
        """Get performance metrics for a specific component."""
        cpu_usage = 0.0
        memory_usage = 0.0
        response_time = 0.0
        uptime = 0.0
        error_count = 0
        status = "unknown"

        try:
            # Find process
            process = self._find_process(config["process_name"])

            if process:
                # CPU and memory usage
                cpu_usage = process.cpu_percent()
                memory_info = process.memory_info()
                memory_usage = memory_info.rss / 1024 / 1024  # MB
                uptime = time.time() - process.create_time()
                status = "running"
            else:
                status = "not_running"

            # Check HTTP health endpoint if available
            if "port" in config and "health_endpoint" in config:
                response_time = self._check_http_response_time(
                    config["port"], config["health_endpoint"]
                )

            # Check log files for errors
            if "log_file" in config:
                error_count = self._count_recent_errors(config["log_file"])

        except Exception as e:
            self.logger.error(f"Error getting performance for {name}: {e}")
            status = "error"

        return ComponentPerformance(
            name=name,
            cpu_usage=cpu_usage,
            memory_usage=memory_usage,
            response_time=response_time,
            uptime=uptime,
            error_count=error_count,
            status=status,
            last_check=datetime.now(),
        )

    def _find_process(self, process_pattern: str) -> Optional[psutil.Process]:
        """Find a process by pattern."""
        try:
            for proc in psutil.process_iter(['pid', 'cmdline']):
                cmdline = ' '.join(proc.info['cmdline'] or [])
                if process_pattern in cmdline:
                    return proc
        except Exception:
            pass
        return None

    def _check_http_response_time(self, port: int, endpoint: str) -> float:
        """Check HTTP response time for a component."""
        try:
            start_time = time.time()
            response = requests.get(f"http://localhost:{port}{endpoint}", timeout=5)
            response_time = (time.time() - start_time) * 1000  # Convert to ms

            if response.status_code == 200:
                return response_time
            else:
                return float('inf')  # Indicate failure

        except Exception:
            return float('inf')  # Indicate failure

    def _count_recent_errors(self, log_file: str) -> int:
        """Count recent errors in a log file."""
        try:
            if not os.path.exists(log_file):
                return 0

            # Check last 100 lines for errors
            with open(log_file, 'r') as f:
                lines = f.readlines()
                recent_lines = lines[-100:] if len(lines) > 100 else lines

                error_count = 0
                for line in recent_lines:
                    if any(
                        error_term in line.lower()
                        for error_term in ['error', 'exception', 'traceback', 'failed']
                    ):
                        error_count += 1

                return error_count

        except Exception:
            return 0

    def _check_component_performance(
        self, name: str, performance: ComponentPerformance
    ):
        """Check component performance and create alerts if needed."""
        alerts = []

        # Check CPU usage
        if performance.cpu_usage > self.thresholds["cpu_critical"]:
            alerts.append(f"Critical CPU usage: {performance.cpu_usage:.1f}%")
        elif performance.cpu_usage > self.thresholds["cpu_warning"]:
            alerts.append(f"High CPU usage: {performance.cpu_usage:.1f}%")

        # Check memory usage
        if performance.memory_usage > self.thresholds["memory_critical"]:
            alerts.append(f"Critical memory usage: {performance.memory_usage:.1f}MB")
        elif performance.memory_usage > self.thresholds["memory_warning"]:
            alerts.append(f"High memory usage: {performance.memory_usage:.1f}MB")

        # Check response time
        if performance.response_time > self.thresholds["response_time_critical"]:
            alerts.append(f"Critical response time: {performance.response_time:.0f}ms")
        elif performance.response_time > self.thresholds["response_time_warning"]:
            alerts.append(f"Slow response time: {performance.response_time:.0f}ms")

        # Check error count
        if performance.error_count > 10:
            alerts.append(f"High error count: {performance.error_count} errors")

        # Check status
        if performance.status == "not_running":
            alerts.append("Component is not running")
        elif performance.status == "error":
            alerts.append("Component has errors")

        # Create alerts
        for alert in alerts:
            severity = (
                AlertSeverity.CRITICAL if "Critical" in alert else AlertSeverity.WARNING
            )
            self._create_alert(
                severity, name, alert, {"performance": asdict(performance)}
            )

    def _check_main_side_integration(self):
        """Check integration with MAIN side systems."""
        try:
            main_scripts_dir = self.config["main_side_integration"]["main_scripts_dir"]
            mobile_scripts_dir = self.config["main_side_integration"][
                "mobile_scripts_dir"
            ]

            # Check if MAIN side directories exist
            if not os.path.exists(main_scripts_dir):
                self.logger.warning(
                    f"MAIN side scripts directory not found: {main_scripts_dir}"
                )
                return

            if not os.path.exists(mobile_scripts_dir):
                self.logger.warning(
                    f"Mobile scripts directory not found: {mobile_scripts_dir}"
                )
                return

            # Check monitoring system
            monitoring_system_js = os.path.join(
                main_scripts_dir, "monitoring-system.js"
            )
            if os.path.exists(monitoring_system_js):
                self.logger.info("✅ MAIN side monitoring system found")
            else:
                self.logger.warning("⚠️ MAIN side monitoring system not found")

            # Check super autolinter
            super_autolinter_py = os.path.join(
                mobile_scripts_dir, "super_autolinter.py"
            )
            if os.path.exists(super_autolinter_py):
                self.logger.info("✅ MAIN side super autolinter found")
            else:
                self.logger.warning("⚠️ MAIN side super autolinter not found")

            # Check if MAIN side processes are running
            main_processes = [
                "monitoring-system.js",
                "super_autolinter.py",
                "watchdog-runner.sh",
            ]

            for process in main_processes:
                if self._find_process(process):
                    self.logger.info(f"✅ MAIN side process running: {process}")
                else:
                    self.logger.warning(f"⚠️ MAIN side process not running: {process}")

        except Exception as e:
            self.logger.error(f"Error checking MAIN side integration: {e}")

    def _add_metric(
        self,
        metric_type: MetricType,
        value: float,
        unit: str,
        threshold: Optional[float] = None,
    ):
        """Add a performance metric."""
        status = "normal"
        if threshold and value > threshold:
            status = "warning" if value < threshold * 1.5 else "critical"

        metric = PerformanceMetric(
            timestamp=datetime.now(),
            metric_type=metric_type,
            value=value,
            unit=unit,
            threshold=threshold,
            status=status,
        )

        self.metrics_history.append(metric)

        # Keep only last 24 hours of history
        cutoff = datetime.now() - timedelta(hours=24)
        self.metrics_history = [m for m in self.metrics_history if m.timestamp > cutoff]

    def _update_performance_history(self):
        """Update performance history and create summary."""
        if not self.metrics_history:
            return

        # Calculate averages for last hour
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_metrics = [m for m in self.metrics_history if m.timestamp > one_hour_ago]

        if recent_metrics:
            cpu_metrics = [m for m in recent_metrics if m.metric_type == MetricType.CPU]
            memory_metrics = [
                m for m in recent_metrics if m.metric_type == MetricType.MEMORY
            ]

            if cpu_metrics:
                avg_cpu = sum(m.value for m in cpu_metrics) / len(cpu_metrics)
                self.logger.info(f"📊 Hourly Average CPU: {avg_cpu:.1f}%")

            if memory_metrics:
                avg_memory = sum(m.value for m in memory_metrics) / len(memory_metrics)
                self.logger.info(f"📊 Hourly Average Memory: {avg_memory:.1f}%")

    def _create_alert(
        self, severity: AlertSeverity, component: str, message: str, context: Dict
    ):
        """Create a performance alert."""
        alert = {
            "severity": severity.value,
            "component": component,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "context": context,
        }

        self.alerts.append(alert)
        self.logger.warning(f"Alert [{severity.value}] {component}: {message}")

    def _process_alerts(self):
        """Process and send alerts."""
        alert_levels = self.config["alerts"]["alert_levels"]
        webhook_url = self.config["alerts"]["slack_webhook"]

        if not webhook_url:
            return

        # Process new alerts
        for alert in self.alerts:
            if alert["severity"] in alert_levels:
                self._send_slack_alert(alert)

        # Mark alerts as processed
        self.alerts = []

    def _send_slack_alert(self, alert: Dict):
        """Send alert to Slack."""
        try:
            color_map = {
                "info": "#36a64f",
                "warning": "#ffa500",
                "error": "#ff0000",
                "critical": "#8b0000",
            }

            payload = {
                "attachments": [
                    {
                        "color": color_map.get(alert["severity"], "#000000"),
                        "title": f"📊 Performance Alert: {alert['component']}",
                        "text": alert["message"],
                        "fields": [
                            {
                                "title": "Severity",
                                "value": alert["severity"].upper(),
                                "short": True,
                            },
                            {
                                "title": "Component",
                                "value": alert["component"],
                                "short": True,
                            },
                            {
                                "title": "Timestamp",
                                "value": datetime.fromisoformat(
                                    alert["timestamp"]
                                ).strftime("%Y-%m-%d %H:%M:%S"),
                                "short": True,
                            },
                        ],
                        "footer": "Performance Monitor",
                    }
                ]
            }

            response = requests.post(webhook_url, json=payload, timeout=10)

            if response.status_code == 200:
                self.logger.info(f"Performance alert sent to Slack: {alert['message']}")
            else:
                self.logger.error(
                    f"Failed to send performance alert to Slack: {response.status_code}"
                )

        except Exception as e:
            self.logger.error(f"Error sending performance alert to Slack: {e}")

    def _cleanup_old_alerts(self):
        """Clean up old alerts."""
        cutoff = datetime.now() - timedelta(hours=1)
        self.alerts = [
            alert
            for alert in self.alerts
            if datetime.fromisoformat(alert["timestamp"]) > cutoff
        ]

    def get_performance_summary(self) -> Dict:
        """Get current performance summary."""
        return {
            "timestamp": datetime.now().isoformat(),
            "system_metrics": {
                "cpu": self._get_latest_metric(MetricType.CPU),
                "memory": self._get_latest_metric(MetricType.MEMORY),
                "disk": self._get_latest_metric(MetricType.DISK),
                "network": self._get_latest_metric(MetricType.NETWORK),
            },
            "component_performance": {
                name: asdict(perf) for name, perf in self.component_performance.items()
            },
            "alerts": self.alerts,
            "metrics_history": [
                {
                    "timestamp": m.timestamp.isoformat(),
                    "type": m.metric_type.value,
                    "value": m.value,
                    "unit": m.unit,
                    "status": m.status,
                }
                for m in self.metrics_history[-50:]  # Last 50 metrics
            ],
        }

    def _get_latest_metric(self, metric_type: MetricType) -> Optional[Dict]:
        """Get the latest metric of a specific type."""
        for metric in reversed(self.metrics_history):
            if metric.metric_type == metric_type:
                return {
                    "value": metric.value,
                    "unit": metric.unit,
                    "status": metric.status,
                    "timestamp": metric.timestamp.isoformat(),
                }
        return None


def main():
    """Main entry point."""
    monitor = PerformanceMonitor()

    try:
        monitor.start()

        # Keep main thread alive
        while monitor.is_running:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n🛑 Shutting down Performance Monitor...")
    finally:
        monitor.stop()


if __name__ == "__main__":
    main()
