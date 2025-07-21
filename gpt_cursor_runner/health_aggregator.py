#!/usr/bin/env python3
"""
Health Aggregation Module for GHOST 2.0.

Collects and aggregates health metrics from various system components.
"""

import os
import psutil
import threading
from datetime import datetime
from typing import Dict, Optional, Any
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class ComponentHealth:
    """Health status for a single component."""
    name: str
    status: str  # 'healthy', 'degraded', 'unhealthy'
    last_check: datetime
    response_time: float
    error_count: int = 0
    details: Dict[str, Any] = None


@dataclass
class SystemHealth:
    """Aggregated system health status."""
    overall_status: str
    timestamp: datetime
    components: Dict[str, ComponentHealth]
    system_metrics: Dict[str, Any]
    version: str = "3.1.0"

class HealthAggregator:
    """Aggregates health metrics from various system components."""
    
    def __init__(self):
        self.components: Dict[str, ComponentHealth] = {}
        self.system_metrics: Dict[str, Any] = {}
        self.last_aggregation: Optional[datetime] = None
        self.aggregation_interval: int = 30  # seconds
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._aggregation_thread: Optional[threading.Thread] = None
        
    def start(self):
        """Start the health aggregation background thread."""
        if self._aggregation_thread is None or not self._aggregation_thread.is_alive():
            self._stop_event.clear()
            self._aggregation_thread = threading.Thread(target=self._aggregation_loop, daemon=True)
            self._aggregation_thread.start()
            logger.info("Health aggregator started")
    
    def stop(self):
        """Stop the health aggregation background thread."""
        self._stop_event.set()
        if self._aggregation_thread and self._aggregation_thread.is_alive():
            self._aggregation_thread.join(timeout=5)
            logger.info("Health aggregator stopped")
    
    def _aggregation_loop(self):
        """Background loop for health aggregation."""
        while not self._stop_event.is_set():
            try:
                self._collect_system_metrics()
                self._aggregate_health()
                self.last_aggregation = datetime.now()
            except Exception as e:
                logger.error(f"Error in health aggregation loop: {e}")
            
            # Wait for next aggregation cycle
            self._stop_event.wait(self.aggregation_interval)
    
    def _collect_system_metrics(self):
        """Collect system-level metrics."""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Memory metrics
            memory = psutil.virtual_memory()
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            
            # Network metrics
            network = psutil.net_io_counters()
            
            self.system_metrics = {
                'cpu': {
                    'percent': cpu_percent,
                    'count': cpu_count,
                    'load_average': os.getloadavg() if hasattr(os, 'getloadavg') else None
                },
                'memory': {
                    'total': memory.total,
                    'available': memory.available,
                    'percent': memory.percent,
                    'used': memory.used
                },
                'disk': {
                    'total': disk.total,
                    'used': disk.used,
                    'free': disk.free,
                    'percent': (disk.used / disk.total) * 100
                },
                'network': {
                    'bytes_sent': network.bytes_sent,
                    'bytes_recv': network.bytes_recv,
                    'packets_sent': network.packets_sent,
                    'packets_recv': network.packets_recv
                }
            }
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
            self.system_metrics = {'error': str(e)}
    
    def _aggregate_health(self):
        """Aggregate health from all components."""
        with self._lock:
            healthy_count = 0
            total_count = len(self.components)
            
            for component in self.components.values():
                if component.status == 'healthy':
                    healthy_count += 1
            
            # Determine overall status
            if total_count == 0:
                overall_status = 'unknown'
            elif healthy_count == total_count:
                overall_status = 'healthy'
            elif healthy_count > total_count * 0.5:
                overall_status = 'degraded'
            else:
                overall_status = 'unhealthy'
            
            self.overall_status = overall_status
    
    def register_component(self, name: str, health_check_func):
        """Register a component for health monitoring."""
        with self._lock:
            self.components[name] = ComponentHealth(
                name=name,
                status='unknown',
                last_check=datetime.now(),
                response_time=0.0,
                details={}
            )
            logger.info(f"Registered health component: {name}")
    
    def update_component_health(self, name: str, status: str, response_time: float = 0.0, 
                              details: Dict[str, Any] = None, error_count: int = 0):
        """Update health status for a component."""
        with self._lock:
            if name in self.components:
                self.components[name].status = status
                self.components[name].last_check = datetime.now()
                self.components[name].response_time = response_time
                self.components[name].error_count = error_count
                if details:
                    self.components[name].details = details
    
    def get_health_status(self) -> SystemHealth:
        """Get current aggregated health status."""
        with self._lock:
            return SystemHealth(
                overall_status=self.overall_status,
                timestamp=datetime.now(),
                components=self.components.copy(),
                system_metrics=self.system_metrics.copy(),
                version="3.1.0"
            )
    
    def get_health_json(self) -> Dict[str, Any]:
        """Get health status as JSON-serializable dict."""
        health = self.get_health_status()
        result = asdict(health)
        result['timestamp'] = health.timestamp.isoformat()
        for component in result['components'].values():
            component['last_check'] = component['last_check'].isoformat()
        return result

# Global health aggregator instance
health_aggregator = HealthAggregator()

def get_health_aggregator() -> HealthAggregator:
    """Get the global health aggregator instance."""
    return health_aggregator 