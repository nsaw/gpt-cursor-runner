#!/usr/bin/env python3
"""
Error Recovery Module for GHOST 2.0.

Handles system errors and provides recovery mechanisms.
"""

import threading
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
import logging
import traceback
import sys

logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    """Error severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RecoveryAction(Enum):
    """Types of recovery actions."""
    RESTART = "restart"
    RETRY = "retry"
    FALLBACK = "fallback"
    IGNORE = "ignore"
    ESCALATE = "escalate"


@dataclass
class ErrorRecord:
    """Record of an error occurrence."""
    error_id: str
    timestamp: datetime
    error_type: str
    error_message: str
    severity: ErrorSeverity
    component: str
    stack_trace: str
    context: Dict[str, Any] = field(default_factory=dict)
    recovery_attempts: int = 0
    resolved: bool = False


@dataclass
class RecoveryStrategy:
    """Strategy for error recovery."""
    error_pattern: str
    severity: ErrorSeverity
    action: RecoveryAction
    max_attempts: int = 3
    backoff_seconds: int = 5
    handler: Optional[Callable] = None


class ErrorRecovery:
    """Handles error recovery and system resilience."""
    
    def __init__(self):
        self.errors: List[ErrorRecord] = []
        self.recovery_strategies: List[RecoveryStrategy] = []
        self.active_recoveries: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        self._recovery_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        
        # Register default recovery strategies
        self._register_default_strategies()
    
    def _register_default_strategies(self):
        """Register default error recovery strategies."""
        self.recovery_strategies = [
            # Network errors - retry with backoff
            RecoveryStrategy(
                error_pattern="ConnectionError|TimeoutError|NetworkError",
                severity=ErrorSeverity.MEDIUM,
                action=RecoveryAction.RETRY,
                max_attempts=5,
                backoff_seconds=10
            ),
            # Resource errors - restart component
            RecoveryStrategy(
                error_pattern="ResourceError|MemoryError|DiskError",
                severity=ErrorSeverity.HIGH,
                action=RecoveryAction.RESTART,
                max_attempts=3,
                backoff_seconds=30
            ),
            # Critical errors - escalate
            RecoveryStrategy(
                error_pattern="CriticalError|SystemError|FatalError",
                severity=ErrorSeverity.CRITICAL,
                action=RecoveryAction.ESCALATE,
                max_attempts=1,
                backoff_seconds=0
            ),
            # Minor errors - ignore
            RecoveryStrategy(
                error_pattern="Warning|Info|Debug",
                severity=ErrorSeverity.LOW,
                action=RecoveryAction.IGNORE,
                max_attempts=1,
                backoff_seconds=0
            )
        ]
    
    def start(self):
        """Start the error recovery background thread."""
        if self._recovery_thread is None or not self._recovery_thread.is_alive():
            self._stop_event.clear()
            self._recovery_thread = threading.Thread(target=self._recovery_loop, daemon=True)
            self._recovery_thread.start()
            logger.info("Error recovery started")
    
    def stop(self):
        """Stop the error recovery background thread."""
        self._stop_event.set()
        if self._recovery_thread and self._recovery_thread.is_alive():
            self._recovery_thread.join(timeout=5)
            logger.info("Error recovery stopped")
    
    def _recovery_loop(self):
        """Background loop for error recovery."""
        while not self._stop_event.is_set():
            try:
                self._process_recoveries()
            except Exception as e:
                logger.error(f"Error in recovery loop: {e}")
            
            # Wait before next recovery cycle
            self._stop_event.wait(10)
    
    def _process_recoveries(self):
        """Process active error recoveries."""
        with self._lock:
            current_time = datetime.now()
            completed_recoveries = []
            
            for error_id, recovery in self.active_recoveries.items():
                # Check if recovery should be attempted
                if current_time >= recovery['next_attempt']:
                    if recovery['attempts'] < recovery['max_attempts']:
                        self._attempt_recovery(error_id, recovery)
                    else:
                        # Max attempts reached, mark as failed
                        completed_recoveries.append(error_id)
                        logger.error(f"Recovery failed for error {error_id} after {recovery['max_attempts']} attempts")
            
            # Remove completed recoveries
            for error_id in completed_recoveries:
                del self.active_recoveries[error_id]
    
    def _attempt_recovery(self, error_id: str, recovery: Dict[str, Any]):
        """Attempt to recover from an error."""
        try:
            action = recovery['action']
            component = recovery['component']
            
            if action == RecoveryAction.RESTART:
                self._restart_component(component)
            elif action == RecoveryAction.RETRY:
                self._retry_operation(error_id, recovery)
            elif action == RecoveryAction.FALLBACK:
                self._fallback_operation(error_id, recovery)
            elif action == RecoveryAction.ESCALATE:
                self._escalate_error(error_id, recovery)
            
            recovery['attempts'] += 1
            recovery['next_attempt'] = datetime.now() + timedelta(seconds=recovery['backoff_seconds'])
            
            logger.info(f"Recovery attempt {recovery['attempts']} for error {error_id}")
            
        except Exception as e:
            logger.error(f"Error during recovery attempt for {error_id}: {e}")
    
    def _restart_component(self, component: str):
        """Restart a system component."""
        try:
            if component == "health_aggregator":
                from gpt_cursor_runner.health_aggregator import get_health_aggregator
                health_agg = get_health_aggregator()
                health_agg.stop()
                time.sleep(2)
                health_agg.start()
                logger.info("Health aggregator restarted")
            elif component == "resource_monitor":
                from gpt_cursor_runner.resource_monitor import get_resource_monitor
                resource_monitor = get_resource_monitor()
                resource_monitor.stop()
                time.sleep(2)
                resource_monitor.start()
                logger.info("Resource monitor restarted")
            elif component == "process_cleanup":
                from gpt_cursor_runner.process_cleanup import get_process_cleanup
                process_cleanup = get_process_cleanup()
                process_cleanup.stop()
                time.sleep(2)
                process_cleanup.start()
                logger.info("Process cleanup restarted")
            elif component == "unified_processor":
                from gpt_cursor_runner.unified_processor import get_unified_processor
                processor = get_unified_processor()
                processor.stop()
                time.sleep(2)
                processor.start()
                logger.info("Unified processor restarted")
            elif component == "sequential_processor":
                from gpt_cursor_runner.sequential_processor import get_sequential_processor
                processor = get_sequential_processor()
                processor.stop()
                time.sleep(2)
                processor.start()
                logger.info("Sequential processor restarted")
        except Exception as e:
            logger.error(f"Failed to restart component {component}: {e}")
    
    def _retry_operation(self, error_id: str, recovery: Dict[str, Any]):
        """Retry a failed operation."""
        # This would typically retry the specific operation that failed
        logger.info(f"Retrying operation for error {error_id}")
    
    def _fallback_operation(self, error_id: str, recovery: Dict[str, Any]):
        """Use fallback operation."""
        # This would typically use an alternative method
        logger.info(f"Using fallback operation for error {error_id}")
    
    def _escalate_error(self, error_id: str, recovery: Dict[str, Any]):
        """Escalate error to higher level."""
        try:
            from gpt_cursor_runner.slack_proxy import create_slack_proxy
            slack_proxy = create_slack_proxy()
            slack_proxy.notify_error(f"Critical error {error_id} requires manual intervention", context="error_recovery")
        except Exception as e:
            logger.error(f"Failed to escalate error {error_id}: {e}")
    
    def record_error(self, error: Exception, component: str, context: Dict[str, Any] = None) -> str:
        """Record an error for recovery processing."""
        import uuid
        
        error_id = f"error_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
        error_type = type(error).__name__
        error_message = str(error)
        stack_trace = traceback.format_exc()
        
        # Determine severity based on error type
        severity = self._determine_severity(error_type, error_message)
        
        # Create error record
        error_record = ErrorRecord(
            error_id=error_id,
            timestamp=datetime.now(),
            error_type=error_type,
            error_message=error_message,
            severity=severity,
            component=component,
            stack_trace=stack_trace,
            context=context or {}
        )
        
        with self._lock:
            self.errors.append(error_record)
            
            # Find matching recovery strategy
            strategy = self._find_recovery_strategy(error_type, error_message)
            if strategy:
                self.active_recoveries[error_id] = {
                    'action': strategy.action,
                    'component': component,
                    'attempts': 0,
                    'max_attempts': strategy.max_attempts,
                    'backoff_seconds': strategy.backoff_seconds,
                    'next_attempt': datetime.now()
                }
        
        logger.warning(f"Recorded error {error_id} in {component}: {error_message}")
        return error_id
    
    def _determine_severity(self, error_type: str, error_message: str) -> ErrorSeverity:
        """Determine error severity based on type and message."""
        critical_patterns = ["Critical", "Fatal", "System", "OutOfMemory", "DiskFull"]
        high_patterns = ["Resource", "Connection", "Timeout", "Network"]
        medium_patterns = ["Value", "Type", "Attribute", "Import"]
        
        for pattern in critical_patterns:
            if pattern in error_type or pattern in error_message:
                return ErrorSeverity.CRITICAL
        
        for pattern in high_patterns:
            if pattern in error_type or pattern in error_message:
                return ErrorSeverity.HIGH
        
        for pattern in medium_patterns:
            if pattern in error_type or pattern in error_message:
                return ErrorSeverity.MEDIUM
        
        return ErrorSeverity.LOW
    
    def _find_recovery_strategy(self, error_type: str, error_message: str) -> Optional[RecoveryStrategy]:
        """Find matching recovery strategy for error."""
        for strategy in self.recovery_strategies:
            if strategy.error_pattern in error_type or strategy.error_pattern in error_message:
                return strategy
        return None
    
    def get_error_stats(self) -> Dict[str, Any]:
        """Get error statistics."""
        with self._lock:
            total_errors = len(self.errors)
            critical_errors = len([e for e in self.errors if e.severity == ErrorSeverity.CRITICAL])
            high_errors = len([e for e in self.errors if e.severity == ErrorSeverity.HIGH])
            medium_errors = len([e for e in self.errors if e.severity == ErrorSeverity.MEDIUM])
            low_errors = len([e for e in self.errors if e.severity == ErrorSeverity.LOW])
            active_recoveries = len(self.active_recoveries)
            
            return {
                'total_errors': total_errors,
                'critical_errors': critical_errors,
                'high_errors': high_errors,
                'medium_errors': medium_errors,
                'low_errors': low_errors,
                'active_recoveries': active_recoveries,
                'recovery_strategies': len(self.recovery_strategies)
            }
    
    def get_recent_errors(self, count: int = 10) -> List[Dict[str, Any]]:
        """Get recent error records."""
        with self._lock:
            recent_errors = self.errors[-count:] if self.errors else []
            return [
                {
                    'error_id': error.error_id,
                    'timestamp': error.timestamp.isoformat(),
                    'error_type': error.error_type,
                    'error_message': error.error_message,
                    'severity': error.severity.value,
                    'component': error.component,
                    'recovery_attempts': error.recovery_attempts,
                    'resolved': error.resolved
                }
                for error in recent_errors
            ]
    
    def add_recovery_strategy(self, strategy: RecoveryStrategy):
        """Add a custom recovery strategy."""
        with self._lock:
            self.recovery_strategies.append(strategy)
        logger.info(f"Added recovery strategy for pattern: {strategy.error_pattern}")
    
    def clear_old_errors(self, days: int = 7):
        """Clear errors older than specified days."""
        cutoff_date = datetime.now() - timedelta(days=days)
        with self._lock:
            self.errors = [e for e in self.errors if e.timestamp > cutoff_date]
        logger.info(f"Cleared errors older than {days} days")


# Global error recovery instance
error_recovery = ErrorRecovery()

def get_error_recovery() -> ErrorRecovery:
    """Get the global error recovery instance."""
    return error_recovery 