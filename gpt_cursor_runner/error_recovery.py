#!/usr/bin/env python3
"""
Error Recovery Module for ***REMOVED*** 2.0.

Handles system errors and provides recovery mechanisms.
"""

import logging
import threading
import uuid
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any, Callable

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

    def __init__(self) -> None:
        self.errors: List[ErrorRecord] = []
        self.recovery_strategies: List[RecoveryStrategy] = []
        self.active_recoveries: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        self._recovery_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

        # Register default recovery strategies
        self._register_default_strategies()

    def _register_default_strategies(self) -> None:
        """Register default error recovery strategies."""
        self.recovery_strategies = [
            # Network errors - retry with backoff
            RecoveryStrategy(
                error_pattern="ConnectionError|TimeoutError|NetworkError",
                severity=ErrorSeverity.MEDIUM,
                action=RecoveryAction.RETRY,
                max_attempts=5,
                backoff_seconds=10,
            ),
            # Resource errors - restart component
            RecoveryStrategy(
                error_pattern="ResourceError|MemoryError|DiskError",
                severity=ErrorSeverity.HIGH,
                action=RecoveryAction.RESTART,
                max_attempts=3,
                backoff_seconds=30,
            ),
            # Critical errors - escalate
            RecoveryStrategy(
                error_pattern="CriticalError|SystemError|FatalError",
                severity=ErrorSeverity.CRITICAL,
                action=RecoveryAction.ESCALATE,
                max_attempts=1,
                backoff_seconds=0,
            ),
            # Minor errors - ignore
            RecoveryStrategy(
                error_pattern="Warning|Info|Debug",
                severity=ErrorSeverity.LOW,
                action=RecoveryAction.IGNORE,
                max_attempts=1,
                backoff_seconds=0,
            ),
        ]

    def start(self) -> None:
        """Start the error recovery background thread."""
        if self._recovery_thread is None or not self._recovery_thread.is_alive():
            self._stop_event.clear()
            self._recovery_thread = threading.Thread(
                target=self._recovery_loop, daemon=True
            )
            self._recovery_thread.start()
            logger.info("Error recovery started")

    def stop(self) -> None:
        """Stop the error recovery background thread."""
        self._stop_event.set()
        if self._recovery_thread and self._recovery_thread.is_alive():
            self._recovery_thread.join(timeout=5)
            logger.info("Error recovery stopped")

    def _recovery_loop(self) -> None:
        """Background loop for error recovery."""
        while not self._stop_event.is_set():
            try:
                self._process_recoveries()
            except Exception as e:
                logger.error(f"Error in recovery loop: {e}")

            # Wait before next recovery cycle
            self._stop_event.wait(10)

    def _process_recoveries(self) -> None:
        """Process active error recoveries."""
        with self._lock:
            current_time = datetime.now()
            completed_recoveries = []

            for error_id, recovery in self.active_recoveries.items():
                # Check if recovery should be attempted
                if current_time >= recovery["next_attempt"]:
                    if recovery["attempts"] < recovery["max_attempts"]:
                        self._attempt_recovery(error_id, recovery)
                    else:
                        # Max attempts reached, mark as failed
                        completed_recoveries.append(error_id)
                        logger.error(
                            f"Recovery failed for error {error_id} after {recovery['max_attempts']} attempts"
                        )

            # Remove completed recoveries
            for error_id in completed_recoveries:
                del self.active_recoveries[error_id]

    def _attempt_recovery(self, error_id: str, recovery: Dict[str, Any]) -> None:
        """Attempt to recover from an error."""
        try:
            action = recovery["action"]
            component = recovery["component"]

            if action == RecoveryAction.RESTART:
                self._restart_component(component)
            elif action == RecoveryAction.RETRY:
                self._retry_operation(error_id, recovery)
            elif action == RecoveryAction.FALLBACK:
                self._fallback_operation(error_id, recovery)
            elif action == RecoveryAction.ESCALATE:
                self._escalate_error(error_id, recovery)

            recovery["attempts"] += 1
            recovery["next_attempt"] = datetime.now() + timedelta(
                seconds=recovery["backoff_seconds"]
            )

            logger.info(f"Recovery attempt {recovery['attempts']} for error {error_id}")

        except Exception as e:
            logger.error(f"Error during recovery attempt for {error_id}: {e}")

    def _restart_component(self, component: str) -> None:
        """Restart a system component."""
        try:
            if component == "health_aggregator":
                from gpt_cursor_runner.health_aggregator import get_health_aggregator

                health_agg = get_health_aggregator()
                if health_agg:
                    health_agg.restart()
            elif component == "patch_executor":
                from gpt_cursor_runner.patch_executor_daemon import get_patch_executor

                executor = get_patch_executor()
                if executor:
                    executor.restart()
            elif component == "dashboard":
                from gpt_cursor_runner.dashboard_daemon import get_dashboard_daemon

                dashboard = get_dashboard_daemon()
                if dashboard:
                    dashboard.restart()

            logger.info(f"Restarted component: {component}")

        except Exception as e:
            logger.error(f"Failed to restart component {component}: {e}")

    def _retry_operation(self, error_id: str, recovery: Dict[str, Any]) -> None:
        """Retry a failed operation."""
        try:
            # Get the original error record
            error_record = self._get_error_record(error_id)
            if error_record:
                # Re-execute the operation that failed
                logger.info(f"Retrying operation for error {error_id}")
                # Implementation would depend on the specific operation type

        except Exception as e:
            logger.error(f"Failed to retry operation for {error_id}: {e}")

    def _fallback_operation(self, error_id: str, recovery: Dict[str, Any]) -> None:
        """Execute fallback operation."""
        try:
            logger.info(f"Executing fallback for error {error_id}")
            # Implementation would depend on the specific fallback strategy

        except Exception as e:
            logger.error(f"Failed to execute fallback for {error_id}: {e}")

    def _escalate_error(self, error_id: str, recovery: Dict[str, Any]) -> None:
        """Escalate error to higher level."""
        try:
            error_record = self._get_error_record(error_id)
            if error_record:
                logger.critical(
                    f"Escalating critical error {error_id}: {error_record.error_type} - {error_record.error_message}"
                )
                # Send alert, notify administrators, etc.

        except Exception as e:
            logger.error(f"Failed to escalate error {error_id}: {e}")

    def _get_error_record(self, error_id: str) -> Optional[ErrorRecord]:
        """Get error record by ID."""
        with self._lock:
            for error in self.errors:
                if error.error_id == error_id:
                    return error
        return None

    def record_error(
        self,
        error_type: str,
        error_message: str,
        component: str,
        stack_trace: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Record a new error occurrence."""
        error_id = str(uuid.uuid4())
        timestamp = datetime.now()
        severity = self._determine_severity(error_type, error_message)

        error_record = ErrorRecord(
            error_id=error_id,
            timestamp=timestamp,
            error_type=error_type,
            error_message=error_message,
            severity=severity,
            component=component,
            stack_trace=stack_trace,
            context=context or {},
        )

        with self._lock:
            self.errors.append(error_record)

        # Check if recovery should be attempted
        strategy = self._find_recovery_strategy(error_type, error_message)
        if strategy and strategy.action != RecoveryAction.IGNORE:
            self._schedule_recovery(error_id, error_record, strategy)

        logger.error(f"Recorded error {error_id}: {error_type} - {error_message}")
        return error_id

    def _schedule_recovery(
        self, error_id: str, error_record: ErrorRecord, strategy: RecoveryStrategy
    ) -> None:
        """Schedule error recovery."""
        with self._lock:
            self.active_recoveries[error_id] = {
                "action": strategy.action,
                "component": error_record.component,
                "attempts": 0,
                "max_attempts": strategy.max_attempts,
                "backoff_seconds": strategy.backoff_seconds,
                "next_attempt": datetime.now(),
            }

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

    def _find_recovery_strategy(
        self, error_type: str, error_message: str
    ) -> Optional[RecoveryStrategy]:
        """Find matching recovery strategy for error."""
        for strategy in self.recovery_strategies:
            if (
                strategy.error_pattern in error_type
                or strategy.error_pattern in error_message
            ):
                return strategy
        return None

    def get_error_stats(self) -> Dict[str, Any]:
        """Get error statistics."""
        with self._lock:
            total_errors = len(self.errors)
            critical_errors = len(
                [e for e in self.errors if e.severity == ErrorSeverity.CRITICAL]
            )
            high_errors = len(
                [e for e in self.errors if e.severity == ErrorSeverity.HIGH]
            )
            medium_errors = len(
                [e for e in self.errors if e.severity == ErrorSeverity.MEDIUM]
            )
            low_errors = len(
                [e for e in self.errors if e.severity == ErrorSeverity.LOW]
            )
            active_recoveries = len(self.active_recoveries)

            return {
                "total_errors": total_errors,
                "critical_errors": critical_errors,
                "high_errors": high_errors,
                "medium_errors": medium_errors,
                "low_errors": low_errors,
                "active_recoveries": active_recoveries,
                "recovery_strategies": len(self.recovery_strategies),
            }

    def get_recent_errors(self, count: int = 10) -> List[Dict[str, Any]]:
        """Get recent error records."""
        with self._lock:
            recent_errors = self.errors[-count:] if self.errors else []
            return [
                {
                    "error_id": error.error_id,
                    "timestamp": error.timestamp.isoformat(),
                    "error_type": error.error_type,
                    "error_message": error.error_message,
                    "severity": error.severity.value,
                    "component": error.component,
                    "recovery_attempts": error.recovery_attempts,
                    "resolved": error.resolved,
                }
                for error in recent_errors
            ]

    def add_recovery_strategy(self, strategy: RecoveryStrategy) -> None:
        """Add a custom recovery strategy."""
        with self._lock:
            self.recovery_strategies.append(strategy)
        logger.info(f"Added recovery strategy for pattern: {strategy.error_pattern}")

    def clear_old_errors(self, days: int = 7) -> None:
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
