#!/usr/bin/env python3
"""
Health Endpoints Module for GHOST 2.0.

Provides comprehensive health check endpoints.
"""

import threading
import time
import psutil
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import logging
import json

logger = logging.getLogger(__name__)


class HealthStatus(Enum):
    """Health status levels."""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


class ComponentType(Enum):
    """Types of system components."""
    SYSTEM = "system"
    SERVICE = "service"
    DATABASE = "database"
    NETWORK = "network"
    STORAGE = "storage"
    MEMORY = "memory"
    CPU = "cpu"
    PROCESS = "process"


@dataclass
class HealthCheck:
    """Health check configuration."""
    name: str
    component_type: ComponentType
    check_function: callable
    timeout: float = 5.0
    critical_threshold: float = 90.0
    warning_threshold: float = 70.0
    enabled: bool = True


@dataclass
class HealthResult:
    """Result of a health check."""
    name: str
    status: HealthStatus
    message: str
    value: Optional[float] = None
    unit: Optional[str] = None
    timestamp: datetime = None
    details: Optional[Dict[str, Any]] = None


class HealthEndpoints:
    """Comprehensive health check system."""
    
    def __init__(self):
        self.health_checks: Dict[str, HealthCheck] = {}
        self.health_history: List[HealthResult] = []
        self._lock = threading.Lock()
        self._health_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        
        # Register default health checks
        self._register_default_checks()
    
    def _register_default_checks(self):
        """Register default health checks."""
        self.health_checks = {
            # System health checks
            "system_cpu": HealthCheck(
                name="System CPU Usage",
                component_type=ComponentType.CPU,
                check_function=self._check_cpu_usage,
                critical_threshold=90.0,
                warning_threshold=70.0
            ),
            "system_memory": HealthCheck(
                name="System Memory Usage",
                component_type=ComponentType.MEMORY,
                check_function=self._check_memory_usage,
                critical_threshold=90.0,
                warning_threshold=70.0
            ),
            "system_disk": HealthCheck(
                name="System Disk Usage",
                component_type=ComponentType.STORAGE,
                check_function=self._check_disk_usage,
                critical_threshold=90.0,
                warning_threshold=70.0
            ),
            "system_network": HealthCheck(
                name="System Network",
                component_type=ComponentType.NETWORK,
                check_function=self._check_network_health,
                critical_threshold=100.0,
                warning_threshold=50.0
            ),
            
            # Service health checks
            "main_service": HealthCheck(
                name="Main Service",
                component_type=ComponentType.SERVICE,
                check_function=self._check_main_service,
                critical_threshold=100.0,
                warning_threshold=50.0
            ),
            "health_aggregator": HealthCheck(
                name="Health Aggregator",
                component_type=ComponentType.SERVICE,
                check_function=self._check_health_aggregator,
                critical_threshold=100.0,
                warning_threshold=50.0
            ),
            "resource_monitor": HealthCheck(
                name="Resource Monitor",
                component_type=ComponentType.SERVICE,
                check_function=self._check_resource_monitor,
                critical_threshold=100.0,
                warning_threshold=50.0
            ),
            "process_cleanup": HealthCheck(
                name="Process Cleanup",
                component_type=ComponentType.SERVICE,
                check_function=self._check_process_cleanup,
                critical_threshold=100.0,
                warning_threshold=50.0
            ),
            "unified_processor": HealthCheck(
                name="Unified Processor",
                component_type=ComponentType.SERVICE,
                check_function=self._check_unified_processor,
                critical_threshold=100.0,
                warning_threshold=50.0
            ),
            "sequential_processor": HealthCheck(
                name="Sequential Processor",
                component_type=ComponentType.SERVICE,
                check_function=self._check_sequential_processor,
                critical_threshold=100.0,
                warning_threshold=50.0
            ),
            
            # Process health checks
            "ghost_processes": HealthCheck(
                name="GHOST Processes",
                component_type=ComponentType.PROCESS,
                check_function=self._check_ghost_processes,
                critical_threshold=100.0,
                warning_threshold=50.0
            ),
            "python_processes": HealthCheck(
                name="Python Processes",
                component_type=ComponentType.PROCESS,
                check_function=self._check_python_processes,
                critical_threshold=100.0,
                warning_threshold=50.0
            )
        }
    
    def start(self):
        """Start the health monitoring background thread."""
        if self._health_thread is None or not self._health_thread.is_alive():
            self._stop_event.clear()
            self._health_thread = threading.Thread(target=self._health_loop, daemon=True)
            self._health_thread.start()
            logger.info("Health endpoints started")
    
    def stop(self):
        """Stop the health monitoring background thread."""
        self._stop_event.set()
        if self._health_thread and self._health_thread.is_alive():
            self._health_thread.join(timeout=5)
            logger.info("Health endpoints stopped")
    
    def _health_loop(self):
        """Background loop for health monitoring."""
        while not self._stop_event.is_set():
            try:
                self._run_health_checks()
            except Exception as e:
                logger.error(f"Error in health monitoring loop: {e}")
            
            # Wait before next health check cycle
            self._stop_event.wait(30)  # Check every 30 seconds
    
    def _run_health_checks(self):
        """Run all health checks."""
        results = []
        
        for check_name, health_check in self.health_checks.items():
            if not health_check.enabled:
                continue
            
            try:
                result = self._execute_health_check(health_check)
                results.append(result)
            except Exception as e:
                logger.error(f"Health check {check_name} failed: {e}")
                results.append(HealthResult(
                    name=health_check.name,
                    status=HealthStatus.CRITICAL,
                    message=f"Health check failed: {str(e)}",
                    timestamp=datetime.now()
                ))
        
        # Store results
        with self._lock:
            self.health_history.extend(results)
            
            # Keep only last 1000 results
            if len(self.health_history) > 1000:
                self.health_history = self.health_history[-1000:]
    
    def _execute_health_check(self, health_check: HealthCheck) -> HealthResult:
        """Execute a single health check."""
        start_time = time.time()
        
        try:
            # Execute the health check function
            value, message, details = health_check.check_function()
            
            # Determine status based on thresholds
            if value >= health_check.critical_threshold:
                status = HealthStatus.CRITICAL
            elif value >= health_check.warning_threshold:
                status = HealthStatus.WARNING
            else:
                status = HealthStatus.HEALTHY
            
            # Check timeout
            execution_time = time.time() - start_time
            if execution_time > health_check.timeout:
                status = HealthStatus.CRITICAL
                message = f"Health check timed out after {execution_time:.2f}s"
            
            return HealthResult(
                name=health_check.name,
                status=status,
                message=message,
                value=value,
                timestamp=datetime.now(),
                details=details
            )
            
        except Exception as e:
            return HealthResult(
                name=health_check.name,
                status=HealthStatus.CRITICAL,
                message=f"Health check error: {str(e)}",
                timestamp=datetime.now()
            )
    
    def _check_cpu_usage(self) -> Tuple[float, str, Dict[str, Any]]:
        """Check CPU usage."""
        cpu_percent = psutil.cpu_percent(interval=1)
        message = f"CPU usage: {cpu_percent:.1f}%"
        details = {
            'cpu_count': psutil.cpu_count(),
            'cpu_freq': psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None
        }
        return cpu_percent, message, details
    
    def _check_memory_usage(self) -> Tuple[float, str, Dict[str, Any]]:
        """Check memory usage."""
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        message = f"Memory usage: {memory_percent:.1f}%"
        details = {
            'total': memory.total,
            'available': memory.available,
            'used': memory.used,
            'free': memory.free
        }
        return memory_percent, message, details
    
    def _check_disk_usage(self) -> Tuple[float, str, Dict[str, Any]]:
        """Check disk usage."""
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        message = f"Disk usage: {disk_percent:.1f}%"
        details = {
            'total': disk.total,
            'used': disk.used,
            'free': disk.free
        }
        return disk_percent, message, details
    
    def _check_network_health(self) -> Tuple[float, str, Dict[str, Any]]:
        """Check network health."""
        try:
            # Simple network connectivity test
            import socket
            socket.create_connection(("8.8.8.8", 53), timeout=3)
            return 0.0, "Network connectivity: OK", {'status': 'connected'}
        except Exception:
            return 100.0, "Network connectivity: FAILED", {'status': 'disconnected'}
    
    def _check_main_service(self) -> Tuple[float, str, Dict[str, Any]]:
        """Check main service health."""
        try:
            import requests
            response = requests.get('http://localhost:5051/health', timeout=5)
            if response.status_code == 200:
                return 0.0, "Main service: OK", {'status_code': response.status_code}
            else:
                return 50.0, f"Main service: HTTP {response.status_code}", {'status_code': response.status_code}
        except Exception as e:
            return 100.0, f"Main service: ERROR - {str(e)}", {'error': str(e)}
    
    def _check_health_aggregator(self) -> Tuple[float, str, Dict[str, Any]]:
        """Check health aggregator service."""
        try:
            import requests
            response = requests.get('http://localhost:8080/health', timeout=5)
            if response.status_code == 200:
                return 0.0, "Health aggregator: OK", {'status_code': response.status_code}
            else:
                return 50.0, f"Health aggregator: HTTP {response.status_code}", {'status_code': response.status_code}
        except Exception as e:
            return 100.0, f"Health aggregator: ERROR - {str(e)}", {'error': str(e)}
    
    def _check_resource_monitor(self) -> Tuple[float, str, Dict[str, Any]]:
        """Check resource monitor service."""
        try:
            import requests
            response = requests.get('http://localhost:8081/health', timeout=5)
            if response.status_code == 200:
                return 0.0, "Resource monitor: OK", {'status_code': response.status_code}
            else:
                return 50.0, f"Resource monitor: HTTP {response.status_code}", {'status_code': response.status_code}
        except Exception as e:
            return 100.0, f"Resource monitor: ERROR - {str(e)}", {'error': str(e)}
    
    def _check_process_cleanup(self) -> Tuple[float, str, Dict[str, Any]]:
        """Check process cleanup service."""
        try:
            import requests
            response = requests.get('http://localhost:8082/health', timeout=5)
            if response.status_code == 200:
                return 0.0, "Process cleanup: OK", {'status_code': response.status_code}
            else:
                return 50.0, f"Process cleanup: HTTP {response.status_code}", {'status_code': response.status_code}
        except Exception as e:
            return 100.0, f"Process cleanup: ERROR - {str(e)}", {'error': str(e)}
    
    def _check_unified_processor(self) -> Tuple[float, str, Dict[str, Any]]:
        """Check unified processor service."""
        try:
            import requests
            response = requests.get('http://localhost:8083/health', timeout=5)
            if response.status_code == 200:
                return 0.0, "Unified processor: OK", {'status_code': response.status_code}
            else:
                return 50.0, f"Unified processor: HTTP {response.status_code}", {'status_code': response.status_code}
        except Exception as e:
            return 100.0, f"Unified processor: ERROR - {str(e)}", {'error': str(e)}
    
    def _check_sequential_processor(self) -> Tuple[float, str, Dict[str, Any]]:
        """Check sequential processor service."""
        try:
            import requests
            response = requests.get('http://localhost:8084/health', timeout=5)
            if response.status_code == 200:
                return 0.0, "Sequential processor: OK", {'status_code': response.status_code}
            else:
                return 50.0, f"Sequential processor: HTTP {response.status_code}", {'status_code': response.status_code}
        except Exception as e:
            return 100.0, f"Sequential processor: ERROR - {str(e)}", {'error': str(e)}
    
    def _check_ghost_processes(self) -> Tuple[float, str, Dict[str, Any]]:
        """Check GHOST-related processes."""
        ghost_processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if 'ghost' in proc.info['name'].lower() or any('ghost' in str(arg).lower() for arg in proc.info['cmdline'] or []):
                    ghost_processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        if ghost_processes:
            return 0.0, f"GHOST processes: {len(ghost_processes)} running", {'processes': ghost_processes}
        else:
            return 100.0, "GHOST processes: None running", {'processes': []}
    
    def _check_python_processes(self) -> Tuple[float, str, Dict[str, Any]]:
        """Check Python processes."""
        python_processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if 'python' in proc.info['name'].lower():
                    python_processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        if python_processes:
            return 0.0, f"Python processes: {len(python_processes)} running", {'processes': python_processes}
        else:
            return 100.0, "Python processes: None running", {'processes': []}
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get overall health summary."""
        with self._lock:
            recent_results = self.health_history[-len(self.health_checks):] if self.health_history else []
        
        if not recent_results:
            return {
                'status': HealthStatus.UNKNOWN.value,
                'message': 'No health checks available',
                'timestamp': datetime.now().isoformat(),
                'checks': []
            }
        
        # Count statuses
        status_counts = {}
        for status in HealthStatus:
            status_counts[status.value] = len([r for r in recent_results if r.status == status])
        
        # Determine overall status
        if status_counts.get(HealthStatus.CRITICAL.value, 0) > 0:
            overall_status = HealthStatus.CRITICAL
        elif status_counts.get(HealthStatus.WARNING.value, 0) > 0:
            overall_status = HealthStatus.WARNING
        else:
            overall_status = HealthStatus.HEALTHY
        
        return {
            'status': overall_status.value,
            'message': f"System health: {overall_status.value}",
            'timestamp': datetime.now().isoformat(),
            'status_counts': status_counts,
            'checks': [
                {
                    'name': result.name,
                    'status': result.status.value,
                    'message': result.message,
                    'value': result.value,
                    'timestamp': result.timestamp.isoformat()
                }
                for result in recent_results
            ]
        }
    
    def get_component_health(self, component_name: str) -> Optional[Dict[str, Any]]:
        """Get health for a specific component."""
        with self._lock:
            for result in reversed(self.health_history):
                if result.name.lower() == component_name.lower():
                    return {
                        'name': result.name,
                        'status': result.status.value,
                        'message': result.message,
                        'value': result.value,
                        'timestamp': result.timestamp.isoformat(),
                        'details': result.details
                    }
        return None
    
    def get_health_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get health history for the specified hours."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        with self._lock:
            recent_history = [r for r in self.health_history if r.timestamp > cutoff_time]
        
        return [
            {
                'name': result.name,
                'status': result.status.value,
                'message': result.message,
                'value': result.value,
                'timestamp': result.timestamp.isoformat()
            }
            for result in recent_history
        ]
    
    def add_health_check(self, health_check: HealthCheck):
        """Add a custom health check."""
        self.health_checks[health_check.name.lower().replace(' ', '_')] = health_check
        logger.info(f"Added health check: {health_check.name}")
    
    def remove_health_check(self, check_name: str):
        """Remove a health check."""
        if check_name in self.health_checks:
            del self.health_checks[check_name]
            logger.info(f"Removed health check: {check_name}")
    
    def enable_health_check(self, check_name: str):
        """Enable a health check."""
        if check_name in self.health_checks:
            self.health_checks[check_name].enabled = True
            logger.info(f"Enabled health check: {check_name}")
    
    def disable_health_check(self, check_name: str):
        """Disable a health check."""
        if check_name in self.health_checks:
            self.health_checks[check_name].enabled = False
            logger.info(f"Disabled health check: {check_name}")


# Global health endpoints instance
health_endpoints = HealthEndpoints()

def get_health_endpoints() -> HealthEndpoints:
    """Get the global health endpoints instance."""
    return health_endpoints 