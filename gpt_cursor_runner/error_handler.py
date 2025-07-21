#!/usr/bin/env python3
"""
Error Handler Module for GHOST 2.0.

Provides comprehensive error handling and recovery.
"""

import threading
import time
import traceback
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
import logging
import functools

logger = logging.getLogger(__name__)


class ErrorType(Enum):
    """Types of errors."""
    SYSTEM = "system"
    NETWORK = "network"
    DATABASE = "database"
    AUTHENTICATION = "authentication"
    VALIDATION = "validation"
    TIMEOUT = "timeout"
    RESOURCE = "resource"
    UNKNOWN = "unknown"


class ErrorSeverity(Enum):
    """Error severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RecoveryAction(Enum):
    """Types of recovery actions."""
    RETRY = "retry"
    FALLBACK = "fallback"
    RESTART = "restart"
    IGNORE = "ignore"
    ESCALATE = "escalate"


@dataclass
class ErrorContext:
    """Context information for an error."""
    function_name: str
    module_name: str
    line_number: int
    stack_trace: str
    local_variables: Dict[str, Any] = field(default_factory=dict)
    global_variables: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ErrorRecord:
    """Record of an error occurrence."""
    error_id: str
    timestamp: datetime
    error_type: ErrorType
    severity: ErrorSeverity
    message: str
    exception: Exception
    context: ErrorContext
    recovery_action: Optional[RecoveryAction] = None
    resolved: bool = False
    retry_count: int = 0


@dataclass
class ErrorHandlerConfig:
    """Configuration for error handling."""
    max_retries: int = 3
    retry_delay: float = 1.0
    exponential_backoff: bool = True
    log_errors: bool = True
    notify_on_critical: bool = True
    auto_recovery: bool = True


class ErrorHandler:
    """Comprehensive error handling system."""
    
    def __init__(self, config: ErrorHandlerConfig = None):
        self.config = config or ErrorHandlerConfig()
        self.errors: List[ErrorRecord] = []
        self.error_handlers: Dict[ErrorType, List[Callable]] = {}
        self.recovery_strategies: Dict[ErrorType, RecoveryAction] = {}
        self._lock = threading.Lock()
        self._cleanup_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        
        # Register default error handlers
        self._register_default_handlers()
    
    def _register_default_handlers(self):
        """Register default error handlers."""
        # System errors - restart service
        self.recovery_strategies[ErrorType.SYSTEM] = RecoveryAction.RESTART
        
        # Network errors - retry with backoff
        self.recovery_strategies[ErrorType.NETWORK] = RecoveryAction.RETRY
        
        # Database errors - retry
        self.recovery_strategies[ErrorType.DATABASE] = RecoveryAction.RETRY
        
        # Authentication errors - escalate
        self.recovery_strategies[ErrorType.AUTHENTICATION] = RecoveryAction.ESCALATE
        
        # Validation errors - ignore
        self.recovery_strategies[ErrorType.VALIDATION] = RecoveryAction.IGNORE
        
        # Timeout errors - retry
        self.recovery_strategies[ErrorType.TIMEOUT] = RecoveryAction.RETRY
        
        # Resource errors - restart
        self.recovery_strategies[ErrorType.RESOURCE] = RecoveryAction.RESTART
        
        # Unknown errors - escalate
        self.recovery_strategies[ErrorType.UNKNOWN] = RecoveryAction.ESCALATE
    
    def start(self):
        """Start the error handler cleanup thread."""
        if self._cleanup_thread is None or not self._cleanup_thread.is_alive():
            self._stop_event.clear()
            self._cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
            self._cleanup_thread.start()
            logger.info("Error handler started")
    
    def stop(self):
        """Stop the error handler cleanup thread."""
        self._stop_event.set()
        if self._cleanup_thread and self._cleanup_thread.is_alive():
            self._cleanup_thread.join(timeout=5)
            logger.info("Error handler stopped")
    
    def _cleanup_loop(self):
        """Background loop for error cleanup."""
        while not self._stop_event.is_set():
            try:
                self._cleanup_old_errors()
            except Exception as e:
                logger.error(f"Error in error handler cleanup loop: {e}")
            
            # Wait before next cleanup cycle
            self._stop_event.wait(3600)  # Run every hour
    
    def _cleanup_old_errors(self):
        """Clean up old error records."""
        cutoff_date = datetime.now() - timedelta(days=7)
        
        with self._lock:
            self.errors = [error for error in self.errors if error.timestamp > cutoff_date]
        
        logger.info("Cleaned up old error records")
    
    def handle_error(self, exception: Exception, context: str = None, 
                    severity: ErrorSeverity = ErrorSeverity.MEDIUM) -> str:
        """Handle an error and return error ID."""
        import uuid
        
        error_id = f"error_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
        
        # Determine error type
        error_type = self._determine_error_type(exception)
        
        # Create error context
        error_context = self._create_error_context(exception)
        
        # Create error record
        error_record = ErrorRecord(
            error_id=error_id,
            timestamp=datetime.now(),
            error_type=error_type,
            severity=severity,
            message=str(exception),
            exception=exception,
            context=error_context
        )
        
        with self._lock:
            self.errors.append(error_record)
        
        # Log error
        if self.config.log_errors:
            self._log_error(error_record)
        
        # Notify on critical errors
        if severity == ErrorSeverity.CRITICAL and self.config.notify_on_critical:
            self._notify_critical_error(error_record)
        
        # Auto-recovery if enabled
        if self.config.auto_recovery:
            self._attempt_recovery(error_record)
        
        logger.warning(f"Error handled: {error_id} - {str(exception)}")
        return error_id
    
    def _determine_error_type(self, exception: Exception) -> ErrorType:
        """Determine the type of error based on the exception."""
        exception_type = type(exception).__name__
        exception_message = str(exception).lower()
        
        # System errors
        if any(keyword in exception_message for keyword in ["system", "os", "kernel"]):
            return ErrorType.SYSTEM
        
        # Network errors
        if any(keyword in exception_message for keyword in ["connection", "network", "timeout", "socket"]):
            return ErrorType.NETWORK
        
        # Database errors
        if any(keyword in exception_message for keyword in ["database", "sql", "db", "connection"]):
            return ErrorType.DATABASE
        
        # Authentication errors
        if any(keyword in exception_message for keyword in ["auth", "login", "permission", "unauthorized"]):
            return ErrorType.AUTHENTICATION
        
        # Validation errors
        if any(keyword in exception_message for keyword in ["validation", "invalid", "format"]):
            return ErrorType.VALIDATION
        
        # Timeout errors
        if any(keyword in exception_message for keyword in ["timeout", "timed out"]):
            return ErrorType.TIMEOUT
        
        # Resource errors
        if any(keyword in exception_message for keyword in ["memory", "disk", "resource", "out of"]):
            return ErrorType.RESOURCE
        
        return ErrorType.UNKNOWN
    
    def _create_error_context(self, exception: Exception) -> ErrorContext:
        """Create error context from exception."""
        exc_type, exc_value, exc_traceback = sys.exc_info()
        
        # Get stack trace
        stack_trace = ''.join(traceback.format_exception(exc_type, exc_value, exc_traceback))
        
        # Get frame information
        if exc_traceback:
            frame = exc_traceback.tb_frame
            function_name = frame.f_code.co_name
            module_name = frame.f_globals.get('__name__', 'unknown')
            line_number = frame.f_lineno
            
            # Get local variables (sanitized)
            local_vars = {}
            for key, value in frame.f_locals.items():
                if not key.startswith('_'):
                    try:
                        local_vars[key] = str(value)[:100]  # Limit length
                    except:
                        local_vars[key] = '<unserializable>'
            
            # Get global variables (sanitized)
            global_vars = {}
            for key, value in frame.f_globals.items():
                if not key.startswith('_'):
                    try:
                        global_vars[key] = str(value)[:100]  # Limit length
                    except:
                        global_vars[key] = '<unserializable>'
        else:
            function_name = 'unknown'
            module_name = 'unknown'
            line_number = 0
            local_vars = {}
            global_vars = {}
        
        return ErrorContext(
            function_name=function_name,
            module_name=module_name,
            line_number=line_number,
            stack_trace=stack_trace,
            local_variables=local_vars,
            global_variables=global_vars
        )
    
    def _log_error(self, error_record: ErrorRecord):
        """Log an error record."""
        logger.error(
            f"Error {error_record.error_id}: {error_record.message} "
            f"({error_record.error_type.value}, {error_record.severity.value}) "
            f"in {error_record.context.module_name}.{error_record.context.function_name}:"
            f"{error_record.context.line_number}"
        )
    
    def _notify_critical_error(self, error_record: ErrorRecord):
        """Notify about critical errors."""
        try:
            from gpt_cursor_runner.slack_proxy import create_slack_proxy
            slack_proxy = create_slack_proxy()
            
            message = f"🚨 Critical Error: {error_record.error_type.value.upper()}\n"
            message += f"Error ID: {error_record.error_id}\n"
            message += f"Message: {error_record.message}\n"
            message += f"Module: {error_record.context.module_name}\n"
            message += f"Function: {error_record.context.function_name}\n"
            message += f"Line: {error_record.context.line_number}\n"
            message += f"Time: {error_record.timestamp.isoformat()}"
            
            slack_proxy.notify_error(message, context="error_handler")
        except Exception as e:
            logger.error(f"Failed to notify about critical error: {e}")
    
    def _attempt_recovery(self, error_record: ErrorRecord):
        """Attempt to recover from an error."""
        recovery_action = self.recovery_strategies.get(error_record.error_type)
        
        if not recovery_action:
            return
        
        try:
            if recovery_action == RecoveryAction.RETRY:
                self._retry_operation(error_record)
            elif recovery_action == RecoveryAction.FALLBACK:
                self._fallback_operation(error_record)
            elif recovery_action == RecoveryAction.RESTART:
                self._restart_service(error_record)
            elif recovery_action == RecoveryAction.ESCALATE:
                self._escalate_error(error_record)
            
            error_record.recovery_action = recovery_action
            
        except Exception as e:
            logger.error(f"Failed to attempt recovery for error {error_record.error_id}: {e}")
    
    def _retry_operation(self, error_record: ErrorRecord):
        """Retry an operation."""
        if error_record.retry_count >= self.config.max_retries:
            logger.warning(f"Max retries reached for error {error_record.error_id}")
            return
        
        delay = self.config.retry_delay
        if self.config.exponential_backoff:
            delay *= (2 ** error_record.retry_count)
        
        time.sleep(delay)
        error_record.retry_count += 1
        
        logger.info(f"Retrying operation for error {error_record.error_id} (attempt {error_record.retry_count})")
    
    def _fallback_operation(self, error_record: ErrorRecord):
        """Use fallback operation."""
        logger.info(f"Using fallback operation for error {error_record.error_id}")
    
    def _restart_service(self, error_record: ErrorRecord):
        """Restart a service."""
        try:
            import subprocess
            subprocess.run(['pkill', '-f', 'python3.*main.py'])
            time.sleep(2)
            subprocess.Popen(['python3', '-m', 'gpt_cursor_runner.main'])
            logger.info(f"Restarted service for error {error_record.error_id}")
        except Exception as e:
            logger.error(f"Failed to restart service for error {error_record.error_id}: {e}")
    
    def _escalate_error(self, error_record: ErrorRecord):
        """Escalate error to higher level."""
        try:
            from gpt_cursor_runner.slack_proxy import create_slack_proxy
            slack_proxy = create_slack_proxy()
            
            message = f"⚠️ Error Escalation Required\n"
            message += f"Error ID: {error_record.error_id}\n"
            message += f"Type: {error_record.error_type.value}\n"
            message += f"Severity: {error_record.severity.value}\n"
            message += f"Message: {error_record.message}\n"
            message += f"Manual intervention required."
            
            slack_proxy.notify_error(message, context="error_handler")
        except Exception as e:
            logger.error(f"Failed to escalate error {error_record.error_id}: {e}")
    
    def get_errors(self, error_type: Optional[ErrorType] = None, 
                  severity: Optional[ErrorSeverity] = None,
                  resolved: Optional[bool] = None) -> List[Dict[str, Any]]:
        """Get error records with optional filtering."""
        with self._lock:
            filtered_errors = self.errors.copy()
        
        if error_type:
            filtered_errors = [e for e in filtered_errors if e.error_type == error_type]
        
        if severity:
            filtered_errors = [e for e in filtered_errors if e.severity == severity]
        
        if resolved is not None:
            filtered_errors = [e for e in filtered_errors if e.resolved == resolved]
        
        # Sort by timestamp (newest first)
        filtered_errors.sort(key=lambda x: x.timestamp, reverse=True)
        
        return [
            {
                'error_id': error.error_id,
                'timestamp': error.timestamp.isoformat(),
                'error_type': error.error_type.value,
                'severity': error.severity.value,
                'message': error.message,
                'module_name': error.context.module_name,
                'function_name': error.context.function_name,
                'line_number': error.context.line_number,
                'recovery_action': error.recovery_action.value if error.recovery_action else None,
                'resolved': error.resolved,
                'retry_count': error.retry_count
            }
            for error in filtered_errors
        ]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get error handling statistics."""
        with self._lock:
            total_errors = len(self.errors)
            resolved_errors = len([e for e in self.errors if e.resolved])
            unresolved_errors = total_errors - resolved_errors
            
            # Count by error type
            error_type_counts = {}
            for error_type in ErrorType:
                error_type_counts[error_type.value] = len([e for e in self.errors if e.error_type == error_type])
            
            # Count by severity
            severity_counts = {}
            for severity in ErrorSeverity:
                severity_counts[severity.value] = len([e for e in self.errors if e.severity == severity])
            
            return {
                'total_errors': total_errors,
                'resolved_errors': resolved_errors,
                'unresolved_errors': unresolved_errors,
                'error_type_counts': error_type_counts,
                'severity_counts': severity_counts,
                'recovery_strategies': len(self.recovery_strategies)
            }
    
    def add_error_handler(self, error_type: ErrorType, handler: Callable):
        """Add a custom error handler."""
        if error_type not in self.error_handlers:
            self.error_handlers[error_type] = []
        
        self.error_handlers[error_type].append(handler)
        logger.info(f"Added error handler for {error_type.value}")
    
    def add_recovery_strategy(self, error_type: ErrorType, action: RecoveryAction):
        """Add a custom recovery strategy."""
        self.recovery_strategies[error_type] = action
        logger.info(f"Added recovery strategy for {error_type.value}: {action.value}")
    
    def clear_old_errors(self, days: int = 7):
        """Clear errors older than specified days."""
        cutoff_date = datetime.now() - timedelta(days=days)
        with self._lock:
            self.errors = [e for e in self.errors if e.timestamp > cutoff_date]
        logger.info(f"Cleared errors older than {days} days")


# Global error handler instance
error_handler = ErrorHandler()

def get_error_handler() -> ErrorHandler:
    """Get the global error handler instance."""
    return error_handler


def handle_errors(func: Callable) -> Callable:
    """Decorator to handle errors in functions."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            error_handler.handle_error(e, context=f"{func.__module__}.{func.__name__}")
            raise
    return wrapper 