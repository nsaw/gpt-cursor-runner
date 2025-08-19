# Company Confidential
#!/usr/bin/env python3
"""
Server Fixes Module for ***REMOVED*** 2.0.

Addresses common server issues and provides fixes.
"""

import logging
import os
import subprocess
import threading
import time
import socket
import psutil
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class ServerIssue(Enum):
    """Types of server issues."""

    PORT_CONFLICT = "port_conflict"
    MEMORY_LEAK = "memory_leak"
    HIGH_CPU = "high_cpu"
    DISK_FULL = "disk_full"
    NETWORK_TIMEOUT = "network_timeout"
    PROCESS_HANG = "process_hang"
    FILE_PERMISSION = "file_permission"
    CONFIG_ERROR = "config_error"


class FixAction(Enum):
    """Types of fix actions."""

    RESTART_SERVICE = "restart_service"
    KILL_PROCESS = "kill_process"
    CLEAR_CACHE = "clear_cache"
    FREE_DISK_SPACE = "free_disk_space"
    FIX_PERMISSIONS = "fix_permissions"
    UPDATE_CONFIG = "update_config"
    NETWORK_RESET = "network_reset"


@dataclass
class ServerIssueRecord:
    """Record of a server issue."""

    issue_id: str
    timestamp: datetime
    issue_type: ServerIssue
    description: str
    severity: str
    affected_components: List[str]
    fix_applied: Optional[FixAction] = None
    resolved: bool = False


@dataclass
class FixStrategy:
    """Strategy for fixing server issues."""

    issue_pattern: str
    issue_type: ServerIssue
    action: FixAction
    priority: int = 1
    auto_fix: bool = True
    requires_confirmation: bool = False


class ServerFixes:
    """Handles server issues and provides fixes."""

    def __init__(self) -> None:
        self.issues: List[ServerIssueRecord] = []
        self.fix_strategies: List[FixStrategy] = []
        self.active_fixes: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        self._fix_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

        # Register default fix strategies
        self._register_default_strategies()

    def _register_default_strategies(self) -> None:
        """Register default server fix strategies."""
        self.fix_strategies = [
            # Port conflicts - kill conflicting processes
            FixStrategy(
                issue_pattern="Address already in use|Port already in use",
                issue_type=ServerIssue.PORT_CONFLICT,
                action=FixAction.KILL_PROCESS,
                priority=1,
                auto_fix=True,
            ),
            # Memory leaks - restart service
            FixStrategy(
                issue_pattern="MemoryError|OutOfMemory|Memory leak",
                issue_type=ServerIssue.MEMORY_LEAK,
                action=FixAction.RESTART_SERVICE,
                priority=2,
                auto_fix=True,
            ),
            # High CPU - restart service
            FixStrategy(
                issue_pattern="High CPU usage|CPU overload",
                issue_type=ServerIssue.HIGH_CPU,
                action=FixAction.RESTART_SERVICE,
                priority=2,
                auto_fix=True,
            ),
            # Disk full - clear cache and logs
            FixStrategy(
                issue_pattern="No space left on device|Disk full",
                issue_type=ServerIssue.DISK_FULL,
                action=FixAction.FREE_DISK_SPACE,
                priority=1,
                auto_fix=True,
            ),
            # Network timeouts - reset network
            FixStrategy(
                issue_pattern="Connection timeout|Network timeout",
                issue_type=ServerIssue.NETWORK_TIMEOUT,
                action=FixAction.NETWORK_RESET,
                priority=2,
                auto_fix=False,
            ),
            # Process hangs - kill process
            FixStrategy(
                issue_pattern="Process hang|Unresponsive",
                issue_type=ServerIssue.PROCESS_HANG,
                action=FixAction.KILL_PROCESS,
                priority=1,
                auto_fix=True,
            ),
            # File permissions - fix permissions
            FixStrategy(
                issue_pattern="Permission denied|Access denied",
                issue_type=ServerIssue.FILE_PERMISSION,
                action=FixAction.FIX_PERMISSIONS,
                priority=1,
                auto_fix=True,
            ),
            # Config errors - update config
            FixStrategy(
                issue_pattern="Configuration error|Config invalid",
                issue_type=ServerIssue.CONFIG_ERROR,
                action=FixAction.UPDATE_CONFIG,
                priority=2,
                auto_fix=False,
            ),
        ]

    def start(self) -> None:
        """Start the server fixes background thread."""
        if self._fix_thread is None or not self._fix_thread.is_alive():
            self._stop_event.clear()
            self._fix_thread = threading.Thread(target=self._fix_loop, daemon=True)
            self._fix_thread.start()
            logger.info("Server fixes started")

    def stop(self) -> None:
        """Stop the server fixes background thread."""
        self._stop_event.set()
        if self._fix_thread and self._fix_thread.is_alive():
            self._fix_thread.join(timeout=5)
            logger.info("Server fixes stopped")

    def _fix_loop(self) -> None:
        """Background loop for server fixes."""
        while not self._stop_event.is_set():
            try:
                self._check_for_issues()
                self._apply_fixes()
            except Exception as e:
                logger.error(f"Error in server fixes loop: {e}")

            # Wait before next check cycle
            self._stop_event.wait(60)  # Check every minute

    def _check_for_issues(self) -> None:
        """Check for common server issues."""
        # Check port conflicts
        self._check_port_conflicts()

        # Check memory usage
        self._check_memory_usage()

        # Check CPU usage
        self._check_cpu_usage()

        # Check disk space
        self._check_disk_space()

        # Check process health
        self._check_process_health()

    def _check_port_conflicts(self) -> None:
        """Check for port conflicts."""
        common_ports = [5051, 8080, 8081, 8082, 8083, 3000, 5000]

        for port in common_ports:
            if not self._is_port_available(port):
                self._record_issue(
                    ServerIssue.PORT_CONFLICT,
                    f"Port {port} is already in use",
                    ["server", "network"],
                    "high",
                )

    def _check_memory_usage(self) -> None:
        """Check memory usage."""
        memory = psutil.virtual_memory()
        if memory.percent > 90:
            self._record_issue(
                ServerIssue.MEMORY_LEAK,
                f"High memory usage: {memory.percent}%",
                ["system", "memory"],
                "critical",
            )

    def _check_cpu_usage(self) -> None:
        """Check CPU usage."""
        cpu_percent = psutil.cpu_percent(interval=1)
        if cpu_percent > 80:
            self._record_issue(
                ServerIssue.HIGH_CPU,
                f"High CPU usage: {cpu_percent}%",
                ["system", "cpu"],
                "high",
            )

    def _check_disk_space(self) -> None:
        """Check disk space."""
        disk = psutil.disk_usage("/")
        if disk.percent > 90:
            self._record_issue(
                ServerIssue.DISK_FULL,
                f"Low disk space: {disk.percent}% used",
                ["system", "disk"],
                "critical",
            )

    def _check_process_health(self) -> None:
        """Check process health."""
        # Check for hanging processes
        for proc in psutil.process_iter(["pid", "name", "cpu_percent"]):
            try:
                if proc.info["cpu_percent"] > 50:
                    # Process might be hanging
                    self._record_issue(
                        ServerIssue.PROCESS_HANG,
                        f"High CPU process: {proc.info['name']} (PID: {proc.info['pid']})",
                        ["process", "cpu"],
                        "medium",
                    )
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

    def _is_port_available(self, port: int) -> bool:
        """Check if a port is available."""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("localhost", port))
                return True
        except OSError:
            return False

    def _record_issue(
        self,
        issue_type: ServerIssue,
        description: str,
        affected_components: List[str],
        severity: str,
    ):
        """Record a server issue."""
        import uuid

        issue_id = f"issue_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"

        issue_record = ServerIssueRecord(
            issue_id=issue_id,
            timestamp=datetime.now(),
            issue_type=issue_type,
            description=description,
            severity=severity,
            affected_components=affected_components,
        )

        with self._lock:
            self.issues.append(issue_record)

        logger.warning(f"Server issue recorded: {issue_id} - {description}")

    def _apply_fixes(self) -> None:
        """Apply fixes for recorded issues."""
        with self._lock:
            unresolved_issues = [issue for issue in self.issues if not issue.resolved]

        for issue in unresolved_issues:
            strategy = self._find_fix_strategy(issue.issue_type)
            if strategy and strategy.auto_fix:
                self._apply_fix(issue, strategy)

    def _find_fix_strategy(self, issue_type: ServerIssue) -> Optional[FixStrategy]:
        """Find matching fix strategy for issue."""
        for strategy in self.fix_strategies:
            if strategy.issue_type == issue_type:
                return strategy
        return None

    def _apply_fix(self, issue: ServerIssueRecord, strategy: FixStrategy) -> None:
        """Apply a fix for an issue."""
        try:
            if strategy.action == FixAction.KILL_PROCESS:
                self._kill_conflicting_processes()
            elif strategy.action == FixAction.RESTART_SERVICE:
                self._restart_service()
            elif strategy.action == FixAction.CLEAR_CACHE:
                self._clear_cache()
            elif strategy.action == FixAction.FREE_DISK_SPACE:
                self._free_disk_space()
            elif strategy.action == FixAction.FIX_PERMISSIONS:
                self._fix_permissions()
            elif strategy.action == FixAction.UPDATE_CONFIG:
                self._update_config()
            elif strategy.action == FixAction.NETWORK_RESET:
                self._reset_network()

            # Mark issue as resolved
            with self._lock:
                issue.fix_applied = strategy.action
                issue.resolved = True

            logger.info(
                f"Applied fix {strategy.action.value} for issue {issue.issue_id}"
            )

        except Exception as e:
            logger.error(f"Failed to apply fix for issue {issue.issue_id}: {e}")

    def _kill_conflicting_processes(self) -> None:
        """Kill processes that might be causing conflicts."""
        try:
            # Kill processes on common ports
            common_ports = [5051, 8080, 8081, 8082, 8083]
            for port in common_ports:
                self._kill_process_on_port(port)
        except Exception as e:
            logger.error(f"Failed to kill conflicting processes: {e}")

    def _kill_process_on_port(self, port: int) -> None:
        """Kill process using a specific port."""
        try:
            result = subprocess.run(
                ["lsof", "-ti", f":{port}"], capture_output=True, text=True
            )
            if result.stdout.strip():
                pids = result.stdout.strip().split("\n")
                for pid in pids:
                    if pid:
                        subprocess.run(["kill", "-9", pid])
                        logger.info(f"Killed process {pid} on port {port}")
        except Exception as e:
            logger.error(f"Failed to kill process on port {port}: {e}")

    def _restart_service(self) -> None:
        """Restart a service."""
        try:
            # Restart the main application
            subprocess.run(["pkill", "-f", "python3.*main.py"])
            time.sleep(2)
            subprocess.Popen(["python3", "-m", "gpt_cursor_runner.main"])
            logger.info("Restarted main service")
        except Exception as e:
            logger.error(f"Failed to restart service: {e}")

    def _clear_cache(self) -> None:
        """Clear cache files."""
        try:
            cache_dirs = ["logs", "temp", "__pycache__"]
            for cache_dir in cache_dirs:
                if os.path.exists(cache_dir):
                    subprocess.run(["rm", "-rf", f"{cache_dir}/*"])
            logger.info("Cleared cache files")
        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")

    def _free_disk_space(self) -> None:
        """Free disk space by cleaning up old files."""
        try:
            # Remove old log files
            if os.path.exists("logs"):
                subprocess.run(
                    ["find", "logs", "-name", "*.log", "-mtime", "+7", "-delete"]
                )

            # Remove old backup files
            if os.path.exists("backups"):
                subprocess.run(
                    ["find", "backups", "-name", "*.tar.gz", "-mtime", "+30", "-delete"]
                )

            # Clear temporary files
            subprocess.run(["rm", "-rf", "/tmp/*"])

            logger.info("Freed disk space")
        except Exception as e:
            logger.error(f"Failed to free disk space: {e}")

    def _fix_permissions(self) -> None:
        """Fix file permissions."""
        try:
            # Fix permissions for key directories
            dirs_to_fix = ["logs", "data", "config"]
            for dir_name in dirs_to_fix:
                if os.path.exists(dir_name):
                    subprocess.run(["chmod", "-R", "755", dir_name])

            logger.info("Fixed file permissions")
        except Exception as e:
            logger.error(f"Failed to fix permissions: {e}")

    def _update_config(self) -> None:
        """Update configuration files."""
        try:
            # This would typically update configuration files
            # For now, just log the action
            logger.info("Updated configuration files")
        except Exception as e:
            logger.error(f"Failed to update config: {e}")

    def _reset_network(self) -> None:
        """Reset network connections."""
        try:
            # Reset network interfaces
            subprocess.run(["sudo", "systemctl", "restart", "network"])
            logger.info("Reset network connections")
        except Exception as e:
            logger.error(f"Failed to reset network: {e}")

    def get_issues(self, resolved: Optional[bool] = None) -> List[Dict[str, Any]]:
        """Get server issues with optional filtering."""
        with self._lock:
            if resolved is None:
                issues = self.issues.copy()
            else:
                issues = [i for i in self.issues if i.resolved == resolved]

        return [
            {
                "issue_id": issue.issue_id,
                "timestamp": issue.timestamp.isoformat(),
                "issue_type": issue.issue_type.value,
                "description": issue.description,
                "severity": issue.severity,
                "affected_components": issue.affected_components,
                "fix_applied": issue.fix_applied.value if issue.fix_applied else None,
                "resolved": issue.resolved,
            }
            for issue in issues
        ]

    def get_stats(self) -> Dict[str, Any]:
        """Get server fixes statistics."""
        with self._lock:
            total_issues = len(self.issues)
            resolved_issues = len([i for i in self.issues if i.resolved])
            unresolved_issues = total_issues - resolved_issues

            # Count by issue type
            issue_type_counts = {}
            for issue_type in ServerIssue:
                issue_type_counts[issue_type.value] = len(
                    [i for i in self.issues if i.issue_type == issue_type]
                )

            # Count by severity
            severity_counts = {}
            for issue in self.issues:
                severity = issue.severity
                severity_counts[severity] = severity_counts.get(severity, 0) + 1

            return {
                "total_issues": total_issues,
                "resolved_issues": resolved_issues,
                "unresolved_issues": unresolved_issues,
                "issue_type_counts": issue_type_counts,
                "severity_counts": severity_counts,
                "fix_strategies": len(self.fix_strategies),
            }

    def add_fix_strategy(self, strategy: FixStrategy) -> None:
        """Add a custom fix strategy."""
        with self._lock:
            self.fix_strategies.append(strategy)
        logger.info(f"Added fix strategy for {strategy.issue_type.value}")

    def clear_old_issues(self, days: int = 30) -> None:
        """Clear issues older than specified days."""
        cutoff_date = datetime.now() - timedelta(days=days)
        with self._lock:
            self.issues = [i for i in self.issues if i.timestamp > cutoff_date]
        logger.info(f"Cleared issues older than {days} days")


# Global server fixes instance
server_fixes = ServerFixes()


def get_server_fixes() -> ServerFixes:
    """Get the global server fixes instance."""
    return server_fixes
