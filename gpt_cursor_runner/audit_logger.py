#!/usr/bin/env python3
"""
Audit Logger Module for GHOST 2.0.

Provides comprehensive logging and audit trails.
"""

import threading
import time
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import logging
import os
import hashlib

logger = logging.getLogger(__name__)


class LogLevel(Enum):
    """Log levels for audit logging."""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class LogCategory(Enum):
    """Categories for audit logging."""
    SYSTEM = "system"
    SECURITY = "security"
    PERFORMANCE = "performance"
    USER_ACTION = "user_action"
    ERROR = "error"
    PATCH = "patch"
    HEALTH = "health"
    RESOURCE = "resource"
    PROCESS = "process"


@dataclass
class AuditEntry:
    """Audit log entry."""
    timestamp: datetime
    level: LogLevel
    category: LogCategory
    message: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    request_id: Optional[str] = None
    component: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    hash: Optional[str] = None


@dataclass
class AuditConfig:
    """Audit logging configuration."""
    enabled: bool = True
    log_to_file: bool = True
    log_to_database: bool = False
    log_to_slack: bool = False
    retention_days: int = 90
    max_file_size_mb: int = 100
    compression_enabled: bool = True
    sensitive_fields: List[str] = None


class AuditLogger:
    """Comprehensive audit logging system."""
    
    def __init__(self, config: AuditConfig = None):
        self.config = config or AuditConfig()
        self.entries: List[AuditEntry] = []
        self._lock = threading.Lock()
        self._cleanup_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._log_file: Optional[str] = None
        self._current_file_size = 0
        
        # Initialize log file
        self._initialize_log_file()
        
        # Start cleanup thread
        if self.config.enabled:
            self.start()
    
    def _initialize_log_file(self):
        """Initialize the audit log file."""
        if not self.config.log_to_file:
            return
        
        log_dir = "logs/audit"
        os.makedirs(log_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d")
        self._log_file = f"{log_dir}/audit_{timestamp}.log"
        
        # Create log file if it doesn't exist
        if not os.path.exists(self._log_file):
            with open(self._log_file, 'w') as f:
                f.write(f"# Audit Log Started: {datetime.now().isoformat()}\n")
    
    def start(self):
        """Start the audit logger cleanup thread."""
        if self._cleanup_thread is None or not self._cleanup_thread.is_alive():
            self._stop_event.clear()
            self._cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
            self._cleanup_thread.start()
            logger.info("Audit logger started")
    
    def stop(self):
        """Stop the audit logger cleanup thread."""
        self._stop_event.set()
        if self._cleanup_thread and self._cleanup_thread.is_alive():
            self._cleanup_thread.join(timeout=5)
            logger.info("Audit logger stopped")
    
    def _cleanup_loop(self):
        """Background loop for audit log cleanup."""
        while not self._stop_event.is_set():
            try:
                self._cleanup_old_entries()
                self._rotate_log_file()
            except Exception as e:
                logger.error(f"Error in audit logger cleanup loop: {e}")
            
            # Wait before next cleanup cycle
            self._stop_event.wait(3600)  # Run every hour
    
    def _cleanup_old_entries(self):
        """Clean up old audit entries."""
        if not self.config.enabled:
            return
        
        cutoff_date = datetime.now() - timedelta(days=self.config.retention_days)
        
        with self._lock:
            self.entries = [entry for entry in self.entries if entry.timestamp > cutoff_date]
        
        logger.info(f"Cleaned up audit entries older than {self.config.retention_days} days")
    
    def _rotate_log_file(self):
        """Rotate log file if it exceeds size limit."""
        if not self.config.log_to_file or not self._log_file:
            return
        
        if os.path.exists(self._log_file):
            file_size = os.path.getsize(self._log_file) / (1024 * 1024)  # MB
            if file_size > self.config.max_file_size_mb:
                self._rotate_log_file_impl()
    
    def _rotate_log_file_impl(self):
        """Implement log file rotation."""
        if not self._log_file:
            return
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        archive_file = f"{self._log_file}.{timestamp}"
        
        try:
            os.rename(self._log_file, archive_file)
            self._initialize_log_file()
            logger.info(f"Rotated audit log file to {archive_file}")
        except Exception as e:
            logger.error(f"Failed to rotate audit log file: {e}")
    
    def log(self, level: LogLevel, category: LogCategory, message: str, 
            user_id: Optional[str] = None, session_id: Optional[str] = None,
            ip_address: Optional[str] = None, request_id: Optional[str] = None,
            component: Optional[str] = None, data: Optional[Dict[str, Any]] = None) -> str:
        """Log an audit entry."""
        if not self.config.enabled:
            return ""
        
        # Create audit entry
        entry = AuditEntry(
            timestamp=datetime.now(),
            level=level,
            category=category,
            message=message,
            user_id=user_id,
            session_id=session_id,
            ip_address=ip_address,
            request_id=request_id,
            component=component,
            data=self._sanitize_data(data) if data else None
        )
        
        # Generate hash for integrity
        entry.hash = self._generate_entry_hash(entry)
        
        with self._lock:
            self.entries.append(entry)
        
        # Write to file
        if self.config.log_to_file:
            self._write_to_file(entry)
        
        # Send to Slack if configured
        if self.config.log_to_slack and level in [LogLevel.ERROR, LogLevel.CRITICAL]:
            self._send_to_slack(entry)
        
        logger.info(f"Audit log entry created: {entry.hash}")
        return entry.hash
    
    def _sanitize_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize sensitive data before logging."""
        if not data:
            return {}
        
        sanitized = data.copy()
        sensitive_fields = self.config.sensitive_fields or ["password", "token", "secret", "key"]
        
        for field in sensitive_fields:
            if field in sanitized:
                sanitized[field] = "***REDACTED***"
        
        return sanitized
    
    def _generate_entry_hash(self, entry: AuditEntry) -> str:
        """Generate hash for audit entry integrity."""
        content = f"{entry.timestamp.isoformat()}{entry.level.value}{entry.category.value}{entry.message}{entry.user_id or ''}{entry.session_id or ''}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _write_to_file(self, entry: AuditEntry):
        """Write audit entry to file."""
        if not self._log_file:
            return
        
        try:
            entry_dict = asdict(entry)
            entry_dict['timestamp'] = entry.timestamp.isoformat()
            entry_dict['level'] = entry.level.value
            entry_dict['category'] = entry.category.value
            
            with open(self._log_file, 'a') as f:
                f.write(json.dumps(entry_dict) + '\n')
        except Exception as e:
            logger.error(f"Failed to write audit entry to file: {e}")
    
    def _send_to_slack(self, entry: AuditEntry):
        """Send critical audit entries to Slack."""
        try:
            from gpt_cursor_runner.slack_proxy import create_slack_proxy
            slack_proxy = create_slack_proxy()
            
            message = f"🚨 Critical Audit Event: {entry.level.value.upper()}\n"
            message += f"Category: {entry.category.value}\n"
            message += f"Message: {entry.message}\n"
            message += f"Component: {entry.component or 'Unknown'}\n"
            message += f"User: {entry.user_id or 'Unknown'}\n"
            message += f"Time: {entry.timestamp.isoformat()}"
            
            slack_proxy.notify_error(message, context="audit_logger")
        except Exception as e:
            logger.error(f"Failed to send audit entry to Slack: {e}")
    
    def get_entries(self, category: Optional[LogCategory] = None, 
                   level: Optional[LogLevel] = None, 
                   start_time: Optional[datetime] = None,
                   end_time: Optional[datetime] = None,
                   limit: int = 100) -> List[Dict[str, Any]]:
        """Get audit entries with filtering."""
        with self._lock:
            filtered_entries = self.entries.copy()
        
        # Apply filters
        if category:
            filtered_entries = [e for e in filtered_entries if e.category == category]
        
        if level:
            filtered_entries = [e for e in filtered_entries if e.level == level]
        
        if start_time:
            filtered_entries = [e for e in filtered_entries if e.timestamp >= start_time]
        
        if end_time:
            filtered_entries = [e for e in filtered_entries if e.timestamp <= end_time]
        
        # Sort by timestamp (newest first)
        filtered_entries.sort(key=lambda x: x.timestamp, reverse=True)
        
        # Apply limit
        filtered_entries = filtered_entries[:limit]
        
        # Convert to dictionaries
        return [
            {
                'timestamp': entry.timestamp.isoformat(),
                'level': entry.level.value,
                'category': entry.category.value,
                'message': entry.message,
                'user_id': entry.user_id,
                'session_id': entry.session_id,
                'ip_address': entry.ip_address,
                'request_id': entry.request_id,
                'component': entry.component,
                'data': entry.data,
                'hash': entry.hash
            }
            for entry in filtered_entries
        ]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get audit logging statistics."""
        with self._lock:
            total_entries = len(self.entries)
            
            # Count by level
            level_counts = {}
            for level in LogLevel:
                level_counts[level.value] = len([e for e in self.entries if e.level == level])
            
            # Count by category
            category_counts = {}
            for category in LogCategory:
                category_counts[category.value] = len([e for e in self.entries if e.category == category])
            
            # Recent activity (last 24 hours)
            cutoff_time = datetime.now() - timedelta(hours=24)
            recent_entries = len([e for e in self.entries if e.timestamp > cutoff_time])
            
            return {
                'total_entries': total_entries,
                'level_counts': level_counts,
                'category_counts': category_counts,
                'recent_entries_24h': recent_entries,
                'log_file': self._log_file,
                'file_size_mb': os.path.getsize(self._log_file) / (1024 * 1024) if self._log_file and os.path.exists(self._log_file) else 0
            }
    
    def log_system_event(self, message: str, component: str = None, data: Dict[str, Any] = None):
        """Log a system event."""
        return self.log(LogLevel.INFO, LogCategory.SYSTEM, message, component=component, data=data)
    
    def log_security_event(self, message: str, user_id: str = None, ip_address: str = None, data: Dict[str, Any] = None):
        """Log a security event."""
        return self.log(LogLevel.WARNING, LogCategory.SECURITY, message, user_id=user_id, ip_address=ip_address, data=data)
    
    def log_user_action(self, message: str, user_id: str, session_id: str = None, data: Dict[str, Any] = None):
        """Log a user action."""
        return self.log(LogLevel.INFO, LogCategory.USER_ACTION, message, user_id=user_id, session_id=session_id, data=data)
    
    def log_error(self, message: str, component: str = None, data: Dict[str, Any] = None):
        """Log an error."""
        return self.log(LogLevel.ERROR, LogCategory.ERROR, message, component=component, data=data)
    
    def log_patch_event(self, message: str, patch_id: str = None, data: Dict[str, Any] = None):
        """Log a patch-related event."""
        return self.log(LogLevel.INFO, LogCategory.PATCH, message, data=data)
    
    def log_health_event(self, message: str, component: str = None, data: Dict[str, Any] = None):
        """Log a health-related event."""
        return self.log(LogLevel.INFO, LogCategory.HEALTH, message, component=component, data=data)
    
    def log_resource_event(self, message: str, component: str = None, data: Dict[str, Any] = None):
        """Log a resource-related event."""
        return self.log(LogLevel.INFO, LogCategory.RESOURCE, message, component=component, data=data)
    
    def log_process_event(self, message: str, component: str = None, data: Dict[str, Any] = None):
        """Log a process-related event."""
        return self.log(LogLevel.INFO, LogCategory.PROCESS, message, component=component, data=data)


# Global audit logger instance
audit_logger = AuditLogger()

def get_audit_logger() -> AuditLogger:
    """Get the global audit logger instance."""
    return audit_logger 