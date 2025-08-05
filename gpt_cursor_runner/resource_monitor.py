#!/usr/bin/env python3
"""
Resource Monitoring Module for GHOST 2.0.

Monitors system resources and provides alerts for resource constraints.
"""

import psutil
import threading
from datetime import datetime
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
import logging
from collections import deque

logger = logging.getLogger(__name__)


@dataclass
class ResourceThreshold:
    """Threshold configuration for resource monitoring."""

    name: str
    warning_threshold: float
    critical_threshold: float
    unit: str = "percent"


@dataclass
class ResourceAlert:
    """Resource alert information."""

    resource_name: str
    current_value: float
    threshold_value: float
    alert_level: str  # 'warning' or 'critical'
    timestamp: datetime
    message: str


@dataclass
class ResourceMetrics:
    """Current resource metrics."""

    cpu_percent: float
    memory_percent: float
    disk_percent: float
    network_io: Dict[str, float]
    process_count: int
    timestamp: datetime


class ResourceMonitor:
    """Monitors system resources and provides alerts."""

    def __init__(self, check_interval: int = 30):
        self.check_interval = check_interval
        self.thresholds: Dict[str, ResourceThreshold] = {}
        self.alerts: deque = deque(maxlen=100)  # Keep last 100 alerts
        self.metrics_history: deque = deque(maxlen=50)  # Keep last 50 metrics
        self._stop_event = threading.Event()
        self._monitor_thread: Optional[threading.Thread] = None
        self._alert_callbacks: List[Callable[[ResourceAlert], None]] = []

        # Set default thresholds
        self._setup_default_thresholds()

    def _setup_default_thresholds(self):
        """Setup default resource thresholds."""
        self.thresholds = {
            "cpu": ResourceThreshold("cpu", 70.0, 90.0, "percent"),
            "memory": ResourceThreshold("memory", 80.0, 95.0, "percent"),
            "disk": ResourceThreshold("disk", 85.0, 95.0, "percent"),
            "process_count": ResourceThreshold("process_count", 200, 300, "count"),
        }

    def start(self):
        """Start the resource monitoring background thread."""
        if self._monitor_thread is None or not self._monitor_thread.is_alive():
            self._stop_event.clear()
            self._monitor_thread = threading.Thread(
                target=self._monitor_loop, daemon=True
            )
            self._monitor_thread.start()
            logger.info("Resource monitor started")

    def stop(self):
        """Stop the resource monitoring background thread."""
        self._stop_event.set()
        if self._monitor_thread and self._monitor_thread.is_alive():
            self._monitor_thread.join(timeout=5)
            logger.info("Resource monitor stopped")

    def _monitor_loop(self):
        """Background loop for resource monitoring."""
        while not self._stop_event.is_set():
            try:
                metrics = self._collect_metrics()
                self.metrics_history.append(metrics)
                self._check_thresholds(metrics)
            except Exception as e:
                logger.error(f"Error in resource monitoring loop: {e}")

            # Wait for next check cycle
            self._stop_event.wait(self.check_interval)

    def _collect_metrics(self) -> ResourceMetrics:
        """Collect current resource metrics."""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)

            # Memory metrics
            memory = psutil.virtual_memory()

            # Disk metrics
            disk = psutil.disk_usage("/")

            # Network metrics
            network = psutil.net_io_counters()
            network_io = {
                "bytes_sent": network.bytes_sent,
                "bytes_recv": network.bytes_recv,
                "packets_sent": network.packets_sent,
                "packets_recv": network.packets_recv,
            }

            # Process count
            process_count = len(psutil.pids())

            return ResourceMetrics(
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                disk_percent=(disk.used / disk.total) * 100,
                network_io=network_io,
                process_count=process_count,
                timestamp=datetime.now(),
            )
        except Exception as e:
            logger.error(f"Error collecting metrics: {e}")
            return ResourceMetrics(
                cpu_percent=0.0,
                memory_percent=0.0,
                disk_percent=0.0,
                network_io={},
                process_count=0,
                timestamp=datetime.now(),
            )

    def _check_thresholds(self, metrics: ResourceMetrics):
        """Check metrics against thresholds and generate alerts."""
        # Check CPU
        if metrics.cpu_percent >= self.thresholds["cpu"].critical_threshold:
            self._create_alert(
                "cpu",
                metrics.cpu_percent,
                self.thresholds["cpu"].critical_threshold,
                "critical",
            )
        elif metrics.cpu_percent >= self.thresholds["cpu"].warning_threshold:
            self._create_alert(
                "cpu",
                metrics.cpu_percent,
                self.thresholds["cpu"].warning_threshold,
                "warning",
            )

        # Check Memory
        if metrics.memory_percent >= self.thresholds["memory"].critical_threshold:
            self._create_alert(
                "memory",
                metrics.memory_percent,
                self.thresholds["memory"].critical_threshold,
                "critical",
            )
        elif metrics.memory_percent >= self.thresholds["memory"].warning_threshold:
            self._create_alert(
                "memory",
                metrics.memory_percent,
                self.thresholds["memory"].warning_threshold,
                "warning",
            )

        # Check Disk
        if metrics.disk_percent >= self.thresholds["disk"].critical_threshold:
            self._create_alert(
                "disk",
                metrics.disk_percent,
                self.thresholds["disk"].critical_threshold,
                "critical",
            )
        elif metrics.disk_percent >= self.thresholds["disk"].warning_threshold:
            self._create_alert(
                "disk",
                metrics.disk_percent,
                self.thresholds["disk"].warning_threshold,
                "warning",
            )

        # Check Process Count
        if metrics.process_count >= self.thresholds["process_count"].critical_threshold:
            self._create_alert(
                "process_count",
                metrics.process_count,
                self.thresholds["process_count"].critical_threshold,
                "critical",
            )
        elif (
            metrics.process_count >= self.thresholds["process_count"].warning_threshold
        ):
            self._create_alert(
                "process_count",
                metrics.process_count,
                self.thresholds["process_count"].warning_threshold,
                "warning",
            )

    def _create_alert(
        self,
        resource_name: str,
        current_value: float,
        threshold_value: float,
        alert_level: str,
    ):
        """Create and store a resource alert."""
        alert = ResourceAlert(
            resource_name=resource_name,
            current_value=current_value,
            threshold_value=threshold_value,
            alert_level=alert_level,
            timestamp=datetime.now(),
            message=f"{resource_name.upper()} {alert_level.upper()}: {current_value:.1f}% "
            f"(threshold: {threshold_value:.1f}%)",
        )

        self.alerts.append(alert)
        logger.warning(f"Resource alert: {alert.message}")

        # Notify alert callbacks
        for callback in self._alert_callbacks:
            try:
                callback(alert)
            except Exception as e:
                logger.error(f"Error in alert callback: {e}")

    def add_alert_callback(self, callback: Callable[[ResourceAlert], None]):
        """Add a callback function to be called when alerts are generated."""
        self._alert_callbacks.append(callback)

    def get_current_metrics(self) -> Optional[ResourceMetrics]:
        """Get the most recent resource metrics."""
        if self.metrics_history:
            return self.metrics_history[-1]
        return None

    def get_metrics_history(self, count: int = 10) -> List[ResourceMetrics]:
        """Get recent metrics history."""
        return list(self.metrics_history)[-count:]

    def get_alerts(self, count: int = 10) -> List[ResourceAlert]:
        """Get recent alerts."""
        return list(self.alerts)[-count:]

    def get_alerts_json(self) -> Dict[str, Any]:
        """Get alerts as JSON-serializable dict."""
        alerts = self.get_alerts()
        return {
            "alerts": [
                {
                    "resource_name": alert.resource_name,
                    "current_value": alert.current_value,
                    "threshold_value": alert.threshold_value,
                    "alert_level": alert.alert_level,
                    "timestamp": alert.timestamp.isoformat(),
                    "message": alert.message,
                }
                for alert in alerts
            ],
            "total_alerts": len(self.alerts),
            "current_metrics": self.get_current_metrics_json(),
        }

    def get_current_metrics_json(self) -> Dict[str, Any]:
        """Get current metrics as JSON-serializable dict."""
        metrics = self.get_current_metrics()
        if metrics:
            return {
                "cpu_percent": metrics.cpu_percent,
                "memory_percent": metrics.memory_percent,
                "disk_percent": metrics.disk_percent,
                "network_io": metrics.network_io,
                "process_count": metrics.process_count,
                "timestamp": metrics.timestamp.isoformat(),
            }
        return {}

    def update_threshold(
        self,
        resource_name: str,
        warning_threshold: float,
        critical_threshold: float,
        unit: str = "percent",
    ):
        """Update threshold for a resource."""
        self.thresholds[resource_name] = ResourceThreshold(
            name=resource_name,
            warning_threshold=warning_threshold,
            critical_threshold=critical_threshold,
            unit=unit,
        )
        logger.info(
            f"Updated threshold for {resource_name}: warning={warning_threshold}, "
            f"critical={critical_threshold}"
        )


# Global resource monitor instance
resource_monitor = ResourceMonitor()


def get_resource_monitor() -> ResourceMonitor:
    """Get the global resource monitor instance."""
    return resource_monitor
