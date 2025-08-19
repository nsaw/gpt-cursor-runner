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
Resource Monitoring Module for GHOST 2.0.

Monitors system resources and provides alerts for resource constraints.
"""

import logging
import psutil
import threading
import time
from collections import deque
from datetime import datetime
from dataclasses import dataclass
from typing import Callable, Optional, Union

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
    network_io: dict[str, float]
    process_count: int
    timestamp: datetime


class ResourceMonitor:
    """Monitors system resources and provides alerts."""

    def __init__(self, check_interval: int = 30) -> None:
        self.check_interval: int = check_interval
        self.thresholds: dict[str, ResourceThreshold] = {}
        self.alerts: deque[ResourceAlert] = deque(maxlen=100)  # Keep last 100 alerts
        self.metrics_history: deque[ResourceMetrics] = deque(
            maxlen=50
        )  # Keep last 50 metrics
        self._stop_event: threading.Event = threading.Event()
        self._monitor_thread: Optional[threading.Thread] = None
        self._alert_callbacks: list[Callable[[ResourceAlert], None]] = []
        self._lock: threading.Lock = (
            threading.Lock()
        )  # Added lock for thread-safe access

        # Set default thresholds
        self._setup_default_thresholds()

    def _setup_default_thresholds(self) -> None:
        """Setup default resource thresholds."""
        self.thresholds = {
            "cpu": ResourceThreshold("cpu", 70.0, 90.0, "percent"),
            "memory": ResourceThreshold("memory", 80.0, 95.0, "percent"),
            "disk": ResourceThreshold("disk", 85.0, 95.0, "percent"),
            "process_count": ResourceThreshold("process_count", 200, 300, "count"),
        }

    def start(self) -> None:
        """Start the resource monitoring background thread."""
        if self._monitor_thread is None or not self._monitor_thread.is_alive():
            self._stop_event.clear()
            self._monitor_thread = threading.Thread(
                target=self._monitor_loop, daemon=True
            )
            self._monitor_thread.start()
            logger.info("Resource monitoring started")

    def stop(self) -> None:
        """Stop the resource monitoring background thread."""
        self._stop_event.set()
        if self._monitor_thread and self._monitor_thread.is_alive():
            self._monitor_thread.join(timeout=5)
            logger.info("Resource monitoring stopped")

    def add_alert_callback(self, callback: Callable[[ResourceAlert], None]) -> None:
        """Add a callback function to be called when alerts are generated."""
        with self._lock:
            self._alert_callbacks.append(callback)

    def remove_alert_callback(self, callback: Callable[[ResourceAlert], None]) -> None:
        """Remove a callback function."""
        with self._lock:
            try:
                self._alert_callbacks.remove(callback)
            except ValueError:
                logger.warning("Callback not found in alert callbacks")

    def _monitor_loop(self) -> None:
        """Main monitoring loop."""
        logger.info("Resource monitoring loop started")
        while not self._stop_event.is_set():
            try:
                metrics = self._collect_metrics()
                if metrics:
                    with self._lock:
                        self.metrics_history.append(metrics)
                    self._check_thresholds(metrics)
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
            time.sleep(self.check_interval)
        logger.info("Resource monitoring loop stopped")

    def _collect_metrics(self) -> Optional[ResourceMetrics]:
        """Collect current system metrics."""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage("/")
            network_io = self._get_network_io()
            process_count = len(psutil.pids())

            return ResourceMetrics(
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                disk_percent=disk.percent,
                network_io=network_io,
                process_count=process_count,
                timestamp=datetime.now(),
            )
        except Exception as e:
            logger.error(f"Error collecting metrics: {e}")
            return None

    def _check_thresholds(self, metrics: ResourceMetrics) -> None:
        """Check metrics against thresholds and generate alerts."""
        try:
            self._check_cpu_threshold(metrics)
            self._check_memory_threshold(metrics)
            self._check_disk_threshold(metrics)
            self._check_process_count_threshold(metrics)
        except Exception as e:
            logger.error(f"Error checking thresholds: {e}")

    def _check_cpu_threshold(self, metrics: ResourceMetrics) -> None:
        """Check CPU threshold."""
        if metrics.cpu_percent >= self.thresholds["cpu"].critical_threshold:
            self._create_alert(
                "cpu",
                metrics.cpu_percent,
                self.thresholds["cpu"].critical_threshold,
                "critical",
                f"CPU usage critical: {metrics.cpu_percent:.1f}%",
            )
        elif metrics.cpu_percent >= self.thresholds["cpu"].warning_threshold:
            self._create_alert(
                "cpu",
                metrics.cpu_percent,
                self.thresholds["cpu"].warning_threshold,
                "warning",
                f"CPU usage high: {metrics.cpu_percent:.1f}%",
            )

    def _check_memory_threshold(self, metrics: ResourceMetrics) -> None:
        """Check memory threshold."""
        if metrics.memory_percent >= self.thresholds["memory"].critical_threshold:
            self._create_alert(
                "memory",
                metrics.memory_percent,
                self.thresholds["memory"].critical_threshold,
                "critical",
                f"Memory usage critical: {metrics.memory_percent:.1f}%",
            )
        elif metrics.memory_percent >= self.thresholds["memory"].warning_threshold:
            self._create_alert(
                "memory",
                metrics.memory_percent,
                self.thresholds["memory"].warning_threshold,
                "warning",
                f"Memory usage high: {metrics.memory_percent:.1f}%",
            )

    def _check_disk_threshold(self, metrics: ResourceMetrics) -> None:
        """Check disk threshold."""
        if metrics.disk_percent >= self.thresholds["disk"].critical_threshold:
            self._create_alert(
                "disk",
                metrics.disk_percent,
                self.thresholds["disk"].critical_threshold,
                "critical",
                f"Disk usage critical: {metrics.disk_percent:.1f}%",
            )
        elif metrics.disk_percent >= self.thresholds["disk"].warning_threshold:
            self._create_alert(
                "disk",
                metrics.disk_percent,
                self.thresholds["disk"].warning_threshold,
                "warning",
                f"Disk usage high: {metrics.disk_percent:.1f}%",
            )

    def _check_process_count_threshold(self, metrics: ResourceMetrics) -> None:
        """Check process count threshold."""
        if metrics.process_count >= self.thresholds["process_count"].critical_threshold:
            self._create_alert(
                "process_count",
                float(metrics.process_count),
                self.thresholds["process_count"].critical_threshold,
                "critical",
                f"Process count critical: {metrics.process_count}",
            )
        elif (
            metrics.process_count >= self.thresholds["process_count"].warning_threshold
        ):
            self._create_alert(
                "process_count",
                float(metrics.process_count),
                self.thresholds["process_count"].warning_threshold,
                "warning",
                f"Process count high: {metrics.process_count}",
            )

    def _get_network_io(self) -> dict[str, float]:
        """Get network I/O statistics."""
        try:
            net_io = psutil.net_io_counters()
            return {
                "bytes_sent": float(net_io.bytes_sent),
                "bytes_recv": float(net_io.bytes_recv),
                "packets_sent": float(net_io.packets_sent),
                "packets_recv": float(net_io.packets_recv),
            }
        except Exception as e:
            logger.error(f"Error getting network I/O: {e}")
            return {
                "bytes_sent": 0.0,
                "bytes_recv": 0.0,
                "packets_sent": 0.0,
                "packets_recv": 0.0,
            }

    def get_current_metrics(self) -> Optional[ResourceMetrics]:
        """Get current metrics (thread-safe)."""
        with self._lock:
            return self.metrics_history[-1] if self.metrics_history else None

    def get_metrics_history(self) -> list[ResourceMetrics]:
        """Get metrics history (thread-safe)."""
        with self._lock:
            return list(self.metrics_history)

    def get_alerts(self) -> list[ResourceAlert]:
        """Get recent alerts (thread-safe)."""
        with self._lock:
            return list(self.alerts)

    def clear_alerts(self) -> None:
        """Clear all alerts (thread-safe)."""
        with self._lock:
            self.alerts.clear()

    def _create_alert(
        self,
        resource_name: str,
        current_value: float,
        threshold_value: float,
        alert_level: str,
        message: str,
    ) -> None:
        """Create and store an alert."""
        alert = ResourceAlert(
            resource_name=resource_name,
            current_value=current_value,
            threshold_value=threshold_value,
            alert_level=alert_level,
            timestamp=datetime.now(),
            message=message,
        )

        with self._lock:
            self.alerts.append(alert)

        # Call alert callbacks
        for callback in self._alert_callbacks:
            try:
                callback(alert)
            except Exception as e:
                logger.error(f"Error in alert callback: {e}")

        logger.warning(f"Resource alert: {message}")

    def get_summary(self) -> dict[str, Union[Optional[ResourceMetrics], int]]:
        """Get monitoring summary (thread-safe)."""
        with self._lock:
            return {
                "current_metrics": (
                    self.metrics_history[-1] if self.metrics_history else None
                ),
                "alert_count": len(self.alerts),
                "metrics_count": len(self.metrics_history),
            }

    def is_running(self) -> bool:
        """Check if monitoring is running."""
        return (
            self._monitor_thread is not None
            and self._monitor_thread.is_alive()
            and not self._stop_event.is_set()
        )

    def get_status(self) -> dict[str, Union[str, bool, int]]:
        """Get monitoring status."""
        return {
            "running": self.is_running(),
            "check_interval": self.check_interval,
            "thresholds_count": len(self.thresholds),
            "callbacks_count": len(self._alert_callbacks),
        }


# Global resource monitor instance
resource_monitor = ResourceMonitor()


def get_resource_monitor() -> ResourceMonitor:
    """Get the global resource monitor instance."""
    return resource_monitor


if __name__ == "__main__":
    # Example usage
    monitor = get_resource_monitor()
    monitor.start()

    try:
        while True:
            time.sleep(60)
            summary = monitor.get_summary()
            print(f"Resource Summary: {summary}")
    except KeyboardInterrupt:
        monitor.stop()
        print("Resource monitoring stopped")
