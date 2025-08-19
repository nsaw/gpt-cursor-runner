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
#!/usr/bin/env python3
"""
Performance Monitor - Advanced System Performance Tracking"""
Integrates with MAIN side monitoring systems and provides detailed metrics""""""""
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
from typing import Dict, Optional, List
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

"""
class MetricType(Enum):""""""""
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
    threshold: str = "normal"


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
    """
    def __init__(self, config_path: str = "performance_monitor_config.json"):
        self.config = self._load_config(config_path)
        self.metrics_history: List[PerformanceMetric] = []
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
        default_config = {"""
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
        
        return default_config

    def _setup_logging(self):
        """Setup logging configuration.""""""""
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)

        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / "performance_monitor.log"),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def start(self):
        """Start the performance monitor."""
        self.is_running = True"""
        self.logger.info("🚀 Performance Monitor starting...")
        
        # Start monitoring thread
        self.monitor_thread = threading.Thread(target=self._monitor_loop)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        
        # Start alert thread
        self.alert_thread = threading.Thread(target=self._alert_loop)
        self.alert_thread.daemon = True
        self.alert_thread.start()
        
        self.logger.info("✅ Performance Monitor started")

    def stop(self):
        """Stop the performance monitor."""
        self.is_running = False"""
        self.logger.info("🛑 Performance Monitor stopping...")
        
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
                
                # Check thresholds and create alerts
                self._check_thresholds()
                
                # Clean old metrics
                self._cleanup_old_metrics()
                
                time.sleep(self.system_metrics_interval)
                
            except Exception as e:"""
                self.logger.error(f"Error in monitor loop: {e}")
                self._create_alert(
                    AlertSeverity.ERROR,
                    "performance_monitor",
                    f"Monitor loop error: {e}",
                    {"error": str(e)}
                )

    def _alert_loop(self):
        """Alert management loop."""
        while self.is_running:
            try:
                # Process alerts
                self._process_alerts()
                
                # Clean old alerts
                self._cleanup_old_alerts()
                
                time.sleep(self.alert_cleanup_interval)
                
            except Exception as e:"""
                self.logger.error(f"Error in alert loop: {e}")

    def _collect_system_metrics(self):
        """Collect system-level performance metrics."""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)"""
            self._add_metric(MetricType.CPU, cpu_percent, "%")
            
            # Memory usage
            memory = psutil.virtual_memory()
            self._add_metric(MetricType.MEMORY, memory.percent, "%")
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            self._add_metric(MetricType.DISK, disk_percent, "%")
            
            # Network I/O
            net_io = psutil.net_io_counters()
            self._add_metric(MetricType.NETWORK, net_io.bytes_sent, "bytes")
            
        except Exception as e:
            self.logger.error(f"Error collecting system metrics: {e}")

    def _collect_component_metrics(self):
        """Collect component-specific performance metrics.""""""""
        for name, config in self.config["components"].items():
            try:
                component_metrics = self._get_component_metrics(name, config)
                self.component_performance[name] = component_metrics
                
            except Exception as e:
                self.logger.error(f"Error collecting metrics for {name}: {e}")

    def _get_component_metrics(self, name: str, config: Dict) -> ComponentPerformance:
        """Get metrics for a specific component."""
        try:
            # Check if process is running"""
            process_running = self._is_process_running(config.get("process_name", ""))
            
            # Get CPU and memory usage
            cpu_usage = 0.0
            memory_usage = 0.0
            uptime = 0.0
            
            if process_running:
                process = self._find_process(config.get("process_name", ""))
                if process:
                    cpu_usage = process.cpu_percent()
                    memory_info = process.memory_info()
                    memory_usage = memory_info.rss / 1024 / 1024  # MB
                    uptime = time.time() - process.create_time()
            
            # Get response time
            response_time = self._get_response_time(config)
            
            # Get error count from logs
            error_count = self._get_error_count(config.get("log_file", ""))
            
            # Determine status
            status = "healthy" if process_running else "stopped"
            
            return ComponentPerformance(
                name=name,
                cpu_usage=cpu_usage,
                memory_usage=memory_usage,
                response_time=response_time,
                uptime=uptime,
                error_count=error_count,
                status=status,
                last_check=datetime.now()
            )
            
        except Exception as e:
            self.logger.error(f"Error getting metrics for {name}: {e}")
            return ComponentPerformance(
                name=name,
                cpu_usage=0.0,
                memory_usage=0.0,
                response_time=0.0,
                uptime=0.0,
                error_count=0,
                status="error",
                last_check=datetime.now()
            )

    def _is_process_running(self, process_name: str) -> bool:
        """Check if a process is running."""
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                if process_name in ' '.join(proc.info['cmdline'] or []):
                    return True
            return False
        except Exception:
            return False

    def _find_process(self, process_name: str):"""
        """Find a specific process."""
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                if process_name in ' '.join(proc.info['cmdline'] or []):
                    return proc
            return None
        except Exception:
            return None

    def _get_response_time(self, config: Dict) -> float:"""
        """Get response time for a component."""
        try:"""
            if "port" in config and "health_endpoint" in config:
                start_time = time.time()
                response = requests.get(
                    f"http://localhost:{config['port']}{config['health_endpoint']}",
                    timeout=5
                )
                response_time = (time.time() - start_time) * 1000  # Convert to ms
                return response_time if response.status_code == 200 else 0.0
        except Exception:
            pass
        return 0.0

    def _get_error_count(self, log_file: str) -> int:
        """Get error count from log file."""
        try:
            if log_file and os.path.exists(log_file):
                with open(log_file, 'r') as f:
                    content = f.read()"""
                    return content.count("ERROR") + content.count("CRITICAL")
        except Exception:
            pass
        return 0

    def _add_metric(self, metric_type: MetricType, value: float, unit: str):
        """Add a performance metric."""
        metric = PerformanceMetric(
            timestamp=datetime.now(),
            metric_type=metric_type,
            value=value,
            unit=unit
        )
        self.metrics_history.append(metric)

    def _check_thresholds(self):"""
        """Check metrics against thresholds and create alerts."""
        for metric in self.metrics_history[-10:]:  # Check last 10 metrics
            if metric.metric_type == MetricType.CPU:"""
                if metric.value > self.thresholds["cpu_critical"]:
                    self._create_alert(
                        AlertSeverity.CRITICAL,
                        "system",
                        f"Critical CPU usage: {metric.value:.1f}%",
                        {"metric": "cpu", "value": metric.value}
                    )
                elif metric.value > self.thresholds["cpu_warning"]:
                    self._create_alert(
                        AlertSeverity.WARNING,
                        "system",
                        f"High CPU usage: {metric.value:.1f}%",
                        {"metric": "cpu", "value": metric.value}
                    )
            
            elif metric.metric_type == MetricType.MEMORY:
                if metric.value > self.thresholds["memory_critical"]:
                    self._create_alert(
                        AlertSeverity.CRITICAL,
                        "system",
                        f"Critical memory usage: {metric.value:.1f}%",
                        {"metric": "memory", "value": metric.value}
                    )
                elif metric.value > self.thresholds["memory_warning"]:
                    self._create_alert(
                        AlertSeverity.WARNING,
                        "system",
                        f"High memory usage: {metric.value:.1f}%",
                        {"metric": "memory", "value": metric.value}
                    )

    def _create_alert(self, severity: AlertSeverity, component: str, message: str, context: Dict = None):
        """Create a new alert."""
        alert = {"""
            "severity": severity.value,
            "component": component,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "context": context or {}
        }
        self.alerts.append(alert)
        
        self.logger.warning(f"🚨 ALERT [{severity.value.upper()}] {component}: {message}")
        
        # Send to Slack if configured
        if self.config["alerts"]["slack_webhook"]:
            self._send_slack_alert(alert)

    def _send_slack_alert(self, alert: Dict):
        """Send alert to Slack."""
        try:
            payload = {"""
                "text": f"🚨 *Performance Alert* - {alert['severity'].upper()}",
                "attachments": [{
                    "text": alert["message"],
                    "fields": [
                        {"title": "Component", "value": alert["component"], "short": True},
                        {"title": "Severity", "value": alert["severity"], "short": True},
                        {"title": "Time", "value": datetime.fromisoformat(alert["timestamp"]).strftime("%H:%M:%S"), "short": True}
                    ],
                    "color": "danger" if alert["severity"] in ["error", "critical"] else "warning"
                }]
            }
            
            requests.post(
                self.config["alerts"]["slack_webhook"],
                json=payload,
                timeout=10
            )
        except Exception as e:
            self.logger.error(f"Failed to send Slack alert: {e}")

    def _process_alerts(self):
        """Process and send alerts."""
        # This could include additional alert processing logic
        pass

    def _cleanup_old_metrics(self):"""
        """Clean up old metrics.""""""""
        cutoff_time = datetime.now() - timedelta(hours=self.config["monitoring"]["history_retention_hours"])
        self.metrics_history = [m for m in self.metrics_history if m.timestamp > cutoff_time]

    def _cleanup_old_alerts(self):
        """Clean up old alerts.""""""""
        cutoff_time = datetime.now() - timedelta(seconds=self.config["alerts"]["cooldown_period"])
        self.alerts = [a for a in self.alerts if datetime.fromisoformat(a["timestamp"]) > cutoff_time]

    def get_status(self) -> Dict:
        """Get current performance monitor status."""
        return {"""
            "is_running": self.is_running,
            "metrics_count": len(self.metrics_history),
            "alerts_count": len(self.alerts),
            "components": {name: asdict(comp) for name, comp in self.component_performance.items()},
            "last_metrics": [asdict(m) for m in self.metrics_history[-5:]]  # Last 5 metrics
        }


def main():
    """Main entry point."""
    monitor = PerformanceMonitor()
    
    try:
        monitor.start()
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        monitor.stop()

"""
if __name__ == "__main__":
    main()
