#!/usr/bin/env python3
"""
Process Cleanup Module for GHOST 2.0.

Manages and cleans up system processes to prevent resource leaks.
"""

import logging
import threading
import time
from datetime import datetime
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Set

try:
    import psutil
except ImportError:
    psutil = None  # type: ignore

logger = logging.getLogger(__name__)


@dataclass
class ProcessInfo:
    """Information about a process."""

    pid: int
    name: str
    cmdline: List[str]
    cpu_percent: float
    memory_percent: float
    create_time: float
    status: str
    parent_pid: Optional[int] = None


@dataclass
class CleanupRule:
    """Rule for process cleanup."""

    name_pattern: str
    max_age_hours: int
    max_cpu_percent: float
    max_memory_percent: float
    action: str  # 'terminate', 'kill', 'restart'
    priority: int = 1


class ProcessCleanup:
    """Manages process cleanup and monitoring."""

    def __init__(self, check_interval: int = 60) -> None:
        self.check_interval = check_interval
        self.rules: List[CleanupRule] = []
        self.whitelist: Set[str] = set()
        self.cleaned_processes: List[Dict[str, Any]] = []
        self._stop_event = threading.Event()
        self._cleanup_thread: Optional[threading.Thread] = None

        # Set default cleanup rules
        self._setup_default_rules()
        self._setup_whitelist()

    def _setup_default_rules(self) -> None:
        """Setup default cleanup rules."""
        self.rules = [
            # Clean up old Python processes
            CleanupRule(
                name_pattern="python",
                max_age_hours=24,
                max_cpu_percent=80.0,
                max_memory_percent=90.0,
                action="terminate",
                priority=1,
            ),
            # Clean up old Node.js processes
            CleanupRule(
                name_pattern="node",
                max_age_hours=12,
                max_cpu_percent=85.0,
                max_memory_percent=85.0,
                action="terminate",
                priority=2,
            ),
            # Clean up zombie processes
            CleanupRule(
                name_pattern=".*",
                max_age_hours=48,
                max_cpu_percent=0.0,
                max_memory_percent=0.0,
                action="kill",
                priority=3,
            ),
        ]

    def _setup_whitelist(self) -> None:
        """Setup whitelist of processes that should not be cleaned up."""
        self.whitelist = {
            "systemd",
            "init",
            "sshd",
            "bash",
            "zsh",
            "python3",
            "node",
            "nginx",
            "apache2",
            "postgres",
            "mysql",
            "redis-server",
        }

    def start(self) -> None:
        """Start the process cleanup background thread."""
        if self._cleanup_thread is None or not self._cleanup_thread.is_alive():
            self._stop_event.clear()
            self._cleanup_thread = threading.Thread(
                target=self._cleanup_loop, daemon=True
            )
            self._cleanup_thread.start()
            logger.info("Process cleanup started")

    def stop(self) -> None:
        """Stop the process cleanup background thread."""
        self._stop_event.set()
        if self._cleanup_thread and self._cleanup_thread.is_alive():
            self._cleanup_thread.join(timeout=5)
            logger.info("Process cleanup stopped")

    def _cleanup_loop(self) -> None:
        """Background loop for process cleanup."""
        while not self._stop_event.is_set():
            try:
                self._check_and_cleanup_processes()
            except Exception as e:
                logger.error(f"Error in process cleanup loop: {e}")

            # Wait for next cleanup cycle
            self._stop_event.wait(self.check_interval)

    def _check_and_cleanup_processes(self) -> None:
        """Check processes against cleanup rules and take action."""
        current_time = time.time()

        for proc in psutil.process_iter(
            [
                "pid",
                "name",
                "cmdline",
                "cpu_percent",
                "memory_percent",
                "create_time",
                "status",
                "ppid",
            ]
        ):
            try:
                process_info = ProcessInfo(
                    pid=proc.info["pid"],
                    name=proc.info["name"] or "",
                    cmdline=proc.info["cmdline"] or [],
                    cpu_percent=proc.info["cpu_percent"] or 0.0,
                    memory_percent=proc.info["memory_percent"] or 0.0,
                    create_time=proc.info["create_time"] or 0.0,
                    status=proc.info["status"] or "",
                    parent_pid=proc.info["ppid"],
                )

                # Skip whitelisted processes
                if process_info.name in self.whitelist:
                    continue

                # Check against cleanup rules
                for rule in sorted(self.rules, key=lambda r: r.priority):
                    if self._should_cleanup_process(process_info, rule, current_time):
                        self._cleanup_process(process_info, rule)
                        break

            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
            except Exception as e:
                logger.error(f"Error checking process {proc.pid}: {e}")

    def _should_cleanup_process(
        self, process_info: ProcessInfo, rule: CleanupRule, current_time: float
    ) -> bool:
        """Check if a process should be cleaned up based on a rule."""
        # Check name pattern
        if not self._matches_pattern(process_info.name, rule.name_pattern):
            return False

        # Check age
        process_age_hours = (current_time - process_info.create_time) / 3600
        if process_age_hours < rule.max_age_hours:
            return False

        # Check CPU usage
        if process_info.cpu_percent > rule.max_cpu_percent:
            return True

        # Check memory usage
        if process_info.memory_percent > rule.max_memory_percent:
            return True

        # Check for zombie processes (age-based cleanup)
        if rule.max_cpu_percent == 0.0 and rule.max_memory_percent == 0.0:
            return True

        return False

    def _matches_pattern(self, process_name: str, pattern: str) -> bool:
        """Check if process name matches pattern."""
        import re

        try:
            return bool(re.match(pattern, process_name, re.IGNORECASE))
        except re.error:
            # If pattern is invalid, treat as exact match
            return process_name.lower() == pattern.lower()

    def _cleanup_process(self, process_info: ProcessInfo, rule: CleanupRule) -> None:
        """Clean up a process based on the rule action."""
        try:
            proc = psutil.Process(process_info.pid)

            cleanup_record = {
                "pid": process_info.pid,
                "name": process_info.name,
                "rule": rule.name_pattern,
                "action": rule.action,
                "cpu_percent": process_info.cpu_percent,
                "memory_percent": process_info.memory_percent,
                "timestamp": datetime.now().isoformat(),
                "success": False,
            }

            if rule.action == "terminate":
                proc.terminate()
                logger.info(
                    f"Terminated process {process_info.pid} ({process_info.name})"
                )
                cleanup_record["success"] = True

            elif rule.action == "kill":
                proc.kill()
                logger.info(f"Killed process {process_info.pid} ({process_info.name})")
                cleanup_record["success"] = True

            elif rule.action == "restart":
                # For restart, we need to know how to restart the process
                # This is a placeholder for future implementation
                logger.warning(
                    f"Restart action not implemented for process {process_info.pid}"
                )
                cleanup_record["success"] = False

            self.cleaned_processes.append(cleanup_record)

        except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
            logger.warning(f"Could not cleanup process {process_info.pid}: {e}")
        except Exception as e:
            logger.error(f"Error cleaning up process {process_info.pid}: {e}")

    def get_process_list(self) -> List[Dict[str, Any]]:
        """Get list of current processes."""
        processes = []
        current_time = time.time()

        for proc in psutil.process_iter(
            [
                "pid",
                "name",
                "cmdline",
                "cpu_percent",
                "memory_percent",
                "create_time",
                "status",
                "ppid",
            ]
        ):
            try:
                process_info = ProcessInfo(
                    pid=proc.info["pid"],
                    name=proc.info["name"] or "",
                    cmdline=proc.info["cmdline"] or [],
                    cpu_percent=proc.info["cpu_percent"] or 0.0,
                    memory_percent=proc.info["memory_percent"] or 0.0,
                    create_time=proc.info["create_time"] or 0.0,
                    status=proc.info["status"] or "",
                    parent_pid=proc.info["ppid"],
                )

                processes.append(
                    {
                        "pid": process_info.pid,
                        "name": process_info.name,
                        "cmdline": process_info.cmdline[:3],  # Limit cmdline length
                        "cpu_percent": process_info.cpu_percent,
                        "memory_percent": process_info.memory_percent,
                        "age_hours": (current_time - process_info.create_time) / 3600,
                        "status": process_info.status,
                        "parent_pid": process_info.parent_pid,
                        "whitelisted": process_info.name in self.whitelist,
                    }
                )

            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
            except Exception as e:
                logger.error(f"Error getting process info: {e}")

        return processes

    def get_cleanup_history(self) -> List[Dict[str, Any]]:
        """Get history of cleaned processes."""
        return self.cleaned_processes[-50:]  # Last 50 cleanups

    def add_cleanup_rule(self, rule: CleanupRule) -> None:
        """Add a new cleanup rule."""
        self.rules.append(rule)
        logger.info(f"Added cleanup rule: {rule.name_pattern}")

    def remove_cleanup_rule(self, name_pattern: str) -> None:
        """Remove a cleanup rule by pattern."""
        self.rules = [rule for rule in self.rules if rule.name_pattern != name_pattern]
        logger.info(f"Removed cleanup rule: {name_pattern}")

    def add_to_whitelist(self, process_name: str) -> None:
        """Add a process to the whitelist."""
        self.whitelist.add(process_name)
        logger.info(f"Added to whitelist: {process_name}")

    def remove_from_whitelist(self, process_name: str) -> None:
        """Remove a process from the whitelist."""
        self.whitelist.discard(process_name)
        logger.info(f"Removed from whitelist: {process_name}")

    def get_stats(self) -> Dict[str, Any]:
        """Get cleanup statistics."""
        total_processes = len(self.get_process_list())
        whitelisted_processes = len(
            [p for p in self.get_process_list() if p["whitelisted"]]
        )
        cleaned_count = len(self.cleaned_processes)

        return {
            "total_processes": total_processes,
            "whitelisted_processes": whitelisted_processes,
            "cleanup_rules": len(self.rules),
            "cleaned_processes": cleaned_count,
            "last_cleanup": (
                self.cleaned_processes[-1] if self.cleaned_processes else None
            ),
        }


# Global process cleanup instance
process_cleanup = ProcessCleanup()


def get_process_cleanup() -> ProcessCleanup:
    """Get the global process cleanup instance."""
    return process_cleanup
