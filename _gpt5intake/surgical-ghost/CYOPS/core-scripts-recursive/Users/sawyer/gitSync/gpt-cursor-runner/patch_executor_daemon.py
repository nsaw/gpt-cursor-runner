#!/usr/bin/env python3
"""
Enhanced Patch Executor Daemon with Critical Flow Hardening
==========================================================

A proper daemon entry point for patch execution that monitors patch directories
and processes patches automatically with comprehensive monitoring, unified logging,
and atomic operations.

Author: ThoughtPilot Team
Version: 1.0.0
"""

import os
import sys
import time
import json
import logging
import argparse
import signal
import hashlib
import shutil
import subprocess
from pathlib import Path
from typing import Set, Dict, Any, Optional
from datetime import datetime

# Try to import system apply function; fallback to local implementation
try:
    # Import with short alias to keep line length within limits
    from apply_patch import apply_patch_from_file as _ext_apply  # type: ignore
    external_apply_patch_from_file = _ext_apply
except Exception:  # noqa: BLE001, S110
    external_apply_patch_from_file = None


def apply_patch_from_file(patch_file: str) -> Dict[str, Any]:
    """Robust patch applier fallback used if system module not available.

    Supports minimal patch schema:
      {
        "id": string,
        "target_file": "/abs/path/to/file",
        "patch": { "pattern": "regex", "replacement": "..." } | { "content": "..." },
        "mutations": { "shell": ["cmd1", ...] } (optional)
      }

    Returns a dict with status and details.
    """
    try:
        if external_apply_patch_from_file is not None:
            return external_apply_patch_from_file(patch_file)  # type: ignore[misc]

        with open(patch_file, 'r', encoding='utf-8') as f:
            patch_data: Dict[str, Any] = json.load(f)

        required = ['target_file', 'patch']
        if not all(k in patch_data for k in required):
            return {
                'status': 'failed',
                'error': 'Invalid patch structure (missing target_file/patch)'
            }

        target_file = patch_data['target_file']
        patch_content = patch_data['patch']

        # Ensure target file exists
        if not os.path.exists(target_file):
            # Create parent directory if needed
            parent = os.path.dirname(target_file)
            if parent and not os.path.exists(parent):
                os.makedirs(parent, exist_ok=True)
            # Initialize empty file
            with open(target_file, 'w', encoding='utf-8') as f:
                f.write('')

        # Backup
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = os.path.join(
            '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/.backup',
            f"{os.path.basename(target_file)}.{timestamp}.bak",
        )
        os.makedirs(os.path.dirname(backup_path), exist_ok=True)
        try:
            with open(target_file, 'r', encoding='utf-8') as src, open(
                backup_path, 'w', encoding='utf-8'
            ) as dst:
                dst.write(src.read())
        except Exception as be:  # noqa: BLE001
            return {'status': 'failed', 'error': f'Backup creation failed: {be}'}

        # Apply
        with open(target_file, 'r', encoding='utf-8') as tf:
            current = tf.read()

        new_content = current
        if 'pattern' in patch_content and 'replacement' in patch_content:
            import re as _re  # local import to avoid global
            new_content = _re.sub(
                patch_content['pattern'],
                patch_content['replacement'],
                current,
                flags=_re.MULTILINE,
            )
        elif 'content' in patch_content:
            new_content = patch_content['content']
        else:
            return {'status': 'failed', 'error': 'Unsupported patch content'}

        with open(target_file, 'w', encoding='utf-8') as tf:
            tf.write(new_content)

        result: Dict[str, Any] = {
            'status': 'success',
            'target_file': target_file,
            'backup_path': backup_path,
            'changes_made': new_content != current,
        }

        # Execute optional shell mutations (best-effort; does not fail the patch)
        try:
            mut_shell = patch_data.get('mutations', {}).get('shell', [])
            if isinstance(mut_shell, list) and mut_shell:
                shell_results = []
                for cmd in mut_shell:
                    try:
                        proc = subprocess.run(
                            cmd, shell=True, text=True, capture_output=True, timeout=60
                        )
                        shell_results.append({
                            'command': cmd,
                            'return_code': proc.returncode,
                            'stdout': proc.stdout,
                            'stderr': proc.stderr,
                        })
                    except Exception as se:  # noqa: BLE001
                        shell_results.append({'command': cmd, 'error': str(se)})
                result['shell_execution'] = shell_results
        except Exception:  # noqa: BLE001
            # Ignore shell execution failure for core patch apply
            pass

        return result

    except Exception as exc:  # noqa: BLE001
        return {'status': 'failed', 'error': str(exc), 'patch_file': patch_file}


# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


# Configuration
PATCH_DIR = Path('/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/')
SUMMARIES_DIR = Path('/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/')
ROOT_LOGS_DIR = Path('/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/')
PATCH_EVENTS_LOG = ROOT_LOGS_DIR / 'patch-events.log'
INJECT_LOG_FAILURE_FILE = ROOT_LOGS_DIR / 'INJECT_LOG_FAILURE'
ALLOW_PROCEED_FILE = ROOT_LOGS_DIR / 'ALLOW_PROCEED'

# Ensure directories exist
PATCH_DIR.mkdir(parents=True, exist_ok=True)
SUMMARIES_DIR.mkdir(parents=True, exist_ok=True)
ROOT_LOGS_DIR.mkdir(parents=True, exist_ok=True)

# Global state
error_count = 0
last_error_time = 0

# Configure logging to unified location
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(str(PATCH_EVENTS_LOG)),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class EnhancedPatchExecutorDaemon:
    """Enhanced daemon class for patch execution with comprehensive monitoring."""

    def __init__(self, patches_dir: str, check_interval: int = 30):
        self.patches_dir = Path(patches_dir)
        self.check_interval = check_interval
        self.running = False
        self.processed_patches: Set[str] = set()

        # State tracking for monitoring
        self.last_heartbeat_time = 0
        self.last_heartbeat_hash = ''
        self.error_count = 0
        self.last_error_time = 0
        self.queue_depth = 0
        self.last_queue_check = 0
        self.stale_patches = []
        self.start_time = datetime.now()
        self.paused_due_to_log_failure = False

        # Ensure patches directory exists
        self.patches_dir.mkdir(parents=True, exist_ok=True)

        # Ensure backup directory exists
        backup_dir = ROOT_LOGS_DIR / '.backup'
        backup_dir.mkdir(parents=True, exist_ok=True)

        logger.info("Enhanced Patch Executor Daemon initialized")
        logger.info(f"Monitoring directory: {self.patches_dir}")
        logger.info(f"Check interval: {check_interval} seconds")
        logger.info(f"Unified logs directory: {ROOT_LOGS_DIR}")

    def write_unified_log(self, log_file: Path, message: str,
                          max_size_mb: int = 5) -> bool:
        """
        Write to unified log with rotation and size limits.
        Returns True if successful, False if failed.
        """
        try:
            # Injected failure for validation if present
            if INJECT_LOG_FAILURE_FILE.exists():
                raise RuntimeError('Injected log failure for validation')

            # Check if log file exists and get its size
            if log_file.exists():
                stats = log_file.stat()
                size_mb = stats.st_size / (1024 * 1024)

                # Rotate if file is too large
                if size_mb > max_size_mb:
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    backup_file = log_file.with_suffix(f'.{timestamp}.bak')

                    # Check for too many rotated files and purge oldest
                    log_dir = log_file.parent
                    rotated_files = []
                    if log_dir.exists():
                        rotated_files = [
                            f for f in log_dir.iterdir() if f.suffix == '.bak'
                        ]
                        rotated_files.sort(reverse=True)

                    # Keep only the 10 most recent rotated files
                    if len(rotated_files) >= 10:
                        files_to_delete = rotated_files[10:]
                        for file in files_to_delete:
                            try:
                                file.unlink()
                                logger.info(f"Purged old rotated log: {file}")
                            except OSError as e:
                                logger.error(f"Failed to purge old log {file}: {e}")

                    shutil.move(log_file, backup_file)
                    logger.info(f"Rotated log file: {log_file} -> {backup_file}")

                    # Alert on rapid rotation (more than 3 per hour)
                    if len(rotated_files) + 1 > 3:
                        logger.warning(
                            (
                                "⚠️ Rapid log rotation detected: "
                                f"{len(rotated_files) + 1} rotations"
                            )
                        )
                        # TODO: Send alert for rapid rotation

            # Write log entry
            timestamp = datetime.now().isoformat()
            log_entry = f"[{timestamp}] {message}\n"

            # Use atomic write to prevent corruption
            temp_file = log_file.with_suffix('.tmp')
            with open(temp_file, 'a') as f:
                f.write(log_entry)
            temp_file.rename(log_file)

            return True

        except Exception as error:
            logger.error(f"Failed to write to log {log_file}: {error}")
            self.handle_log_write_failure(log_file, error, message)
            return False

    def handle_log_write_failure(
        self, log_file: Path, error: Exception, original_message: str
    ) -> None:
        """
        Handle log write failure with escalation
        """
        failure_data = {
            'timestamp': datetime.now().isoformat(),
            'failed_log_file': str(log_file),
            'error': str(error),
            'original_message': original_message,
            'component': 'patch-executor'
        }

        # Try to write to fallback location
        fallback_log = Path('patch-executor-fallback.log')
        try:
            fallback_entry = (
                f"[{failure_data['timestamp']}] LOG_WRITE_FAILURE: "
                f"{json.dumps(failure_data)}\n"
            )
            with open(fallback_log, 'a') as f:
                f.write(fallback_entry)
        except Exception as fallback_error:
            logger.error(f"CRITICAL: Even fallback logging failed: {fallback_error}")

        # Create critical alert file
        critical_alert_file = ROOT_LOGS_DIR / 'CRITICAL_ALERT'
        try:
            alert_content = (
                f"LOG_WRITE_FAILURE: {datetime.now().isoformat()}\n"
                f"Component: patch-executor\nFile: {log_file}\nError: {error}\n"
            )
            with open(critical_alert_file, 'w') as f:
                f.write(alert_content)
        except Exception as alert_error:
            logger.error(f"CRITICAL: Failed to create alert file: {alert_error}")

        # Increment error count for monitoring and pause processing
        self.error_count += 1
        self.paused_due_to_log_failure = True

        logger.error("🚨 CRITICAL: Log write failure - system may be degraded")

    def generate_hash(self, content: Any) -> str:
        """Generate hash for deduplication."""
        content_str = json.dumps(content, sort_keys=True)
        return hashlib.md5(content_str.encode()).hexdigest()

    def emit_heartbeat(self) -> None:
        """Emit debounced heartbeat with deduplication."""
        now = time.time()
        time_since_last_heartbeat = now - self.last_heartbeat_time

        heartbeat_data = {
            'timestamp': datetime.now().isoformat(),
            'status': 'running',
            'queue_stats': {
                'queue_depth': self.queue_depth,
                'stale_patches': len(self.stale_patches),
                'last_queue_check': self.last_queue_check
            },
            'processing_stats': {
                'processed_patches': len(self.processed_patches),
                'error_count': self.error_count,
                'last_error_time': self.last_error_time
            },
            'uptime': int((datetime.now() - self.start_time).total_seconds())
        }

        heartbeat_hash = self.generate_hash(heartbeat_data)

        # Only write if hash changed or >30s since last heartbeat
        if heartbeat_hash != self.last_heartbeat_hash or time_since_last_heartbeat > 30:
            try:
                with open(
                    ROOT_LOGS_DIR / 'patch-executor-status.json', 'w'
                ) as f:
                    json.dump(heartbeat_data, f, indent=2)
                self.last_heartbeat_hash = heartbeat_hash
                self.last_heartbeat_time = now
                logger.info(f"Heartbeat emitted ({heartbeat_hash[:8]})")
            except Exception as error:
                logger.error(f"Failed to write heartbeat: {error}")
                self.write_unified_log(
                    PATCH_EVENTS_LOG,
                    f"ERROR: Failed to write heartbeat - {error}",
                )

    def log_patch_event(
        self, event: str, details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log patch event with deduplication."""
        if details is None:
            details = {}

        log_message = f"PATCH_EVENT: {event} - {json.dumps(details)}"
        self.write_unified_log(PATCH_EVENTS_LOG, log_message)
        logger.info(f"📝 {log_message}")

    def check_stale_patches(self) -> None:
        """Check for stale patches and requeue if necessary."""
        try:
            now = time.time()
            stale_threshold = 15 * 60  # 15 minutes

            if not self.patches_dir.exists():
                return

            files = [f for f in self.patches_dir.iterdir() if f.suffix == '.json']
            stale_patches = []

            for file_path in files:
                try:
                    mtime = file_path.stat().st_mtime
                    age = now - mtime

                    if age > stale_threshold:
                        stale_patches.append(
                            {
                                'file': file_path.name,
                                'age': int(age),
                                'path': str(file_path),
                            }
                        )
                except Exception as error:
                    logger.error(f"Failed to check file {file_path}: {error}")

            if stale_patches:
                self.stale_patches = stale_patches
                self.log_patch_event(
                    'STALE_PATCHES_DETECTED',
                    {'count': len(stale_patches), 'patches': stale_patches},
                )
                logger.warning(f"⚠️ {len(stale_patches)} stale patches detected")

                # Auto-move stale patches to .stuck/ and update dashboard
                stuck_dir = self.patches_dir / '.stuck'
                stuck_dir.mkdir(exist_ok=True)
                moved = []
                for s in stale_patches:
                    try:
                        src = self.patches_dir / s['file']
                        if src.exists():
                            dst = stuck_dir / s['file']
                            shutil.move(src, dst)
                            moved.append(s['file'])
                            self.log_patch_event('PATCH_MOVED_TO_STUCK', {'file': s['file'], 'age': s['age']})
                    except Exception as mv_err:
                        self.log_patch_event('PATCH_MOVE_TO_STUCK_FAILED', {'file': s['file'], 'error': str(mv_err)})

                # Update dashboard JSON for operator actions
                try:
                    dashboard = {
                        'timestamp': datetime.now().isoformat(),
                        'stuck_count': len(moved),
                        'stuck_files': moved,
                        'actions_available': ['force_retry', 'move_to_failed', 'delete_patch', 'manual_review']
                    }
                    with open(ROOT_LOGS_DIR / 'stuck-patches-dashboard.json', 'w') as f:
                        json.dump(dashboard, f, indent=2)
                except Exception as dash_err:
                    self.log_patch_event('STUCK_DASHBOARD_UPDATE_FAILED', {'error': str(dash_err)})

        except Exception as error:
            self.log_patch_event('STALE_CHECK_FAILED', {'error': str(error)})
            logger.error(f"Failed to check stale patches: {error}")

    def monitor_queue_health(self) -> None:
        """Monitor patch queue health and log state changes."""
        try:
            if not self.patches_dir.exists():
                self.queue_depth = 0
                return

            files = [f for f in self.patches_dir.iterdir() if f.suffix == '.json']
            new_queue_depth = len(files)

            # Only log on state change or if queue depth > 10
            if new_queue_depth != self.queue_depth or new_queue_depth > 10:
                self.log_patch_event(
                    'QUEUE_HEALTH_UPDATE',
                    {
                        'previous_depth': self.queue_depth,
                        'current_depth': new_queue_depth,
                        'change': new_queue_depth - self.queue_depth,
                    },
                )

                if new_queue_depth > 10:
                    logger.warning(f"⚠️ High queue depth: {new_queue_depth} patches")

            self.queue_depth = new_queue_depth
            self.last_queue_check = time.time()

        except Exception as error:
            self.log_patch_event('QUEUE_HEALTH_CHECK_FAILED', {'error': str(error)})
            logger.error(f"Failed to check queue health: {error}")

    def create_atomic_summary(
        self,
        patch_file: Path,
        success: bool,
        details: Optional[Dict[str, Any]] = None,
    ) -> Optional[Path]:
        """Create summary atomically with backup; retry up to 3 times with jitter."""
        attempts = 0
        delay_base = 0.2
        while attempts < 3:
            attempts += 1
            try:
                if details is None:
                    details = {}

            # Generate summary content
            patch_id = patch_file.stem
            status_text = '✅ PASS' if success else '❌ FAIL'
            # Build multi-line string without overly long lines
            details_json = json.dumps(details, indent=2)
            uptime_seconds = int(
                (datetime.now() - self.start_time).total_seconds()
            )
            summary_lines = [
                f"# Summary: {patch_id}",
                "",
                f"**Status**: {status_text}  ",
                f"**Timestamp**: {datetime.now().isoformat()}  ",
                f"**Patch File**: {patch_file.name}  ",
                f"**Processing Time**: {details.get('processing_time', 'unknown')}  ",
                "",
                "## Details",
                details_json,
                "",
                "## System Status",
                f"- **Queue Depth**: {self.queue_depth}",
                f"- **Error Count**: {self.error_count}",
                f"- **Uptime**: {uptime_seconds}s",
                "",
                "---",
                f"patchName: {patch_id}",
                "*Generated by Enhanced Patch Executor Daemon*",
            ]
                summary_content = "\n".join(summary_lines)

            # Ensure summaries backup dir exists
                (SUMMARIES_DIR / '.backup').mkdir(parents=True, exist_ok=True)

            # Write to temporary file first in summaries dir
                temp_summary = SUMMARIES_DIR / f"summary-{patch_id}.md.tmp"
                with open(temp_summary, 'w') as f:
                    f.write(summary_content)

            # Create backup
                backup_file = SUMMARIES_DIR / '.backup' / f"summary-{patch_id}.md.backup"
                shutil.copy2(temp_summary, backup_file)

            # Atomically rename to final location
                final_summary = SUMMARIES_DIR / f"summary-{patch_id}.md"
                shutil.move(temp_summary, final_summary)

                self.log_patch_event('SUMMARY_CREATED', {
                    'patch_file': patch_file.name,
                    'success': success,
                    'summary_file': str(final_summary),
                    'backup_file': str(backup_file)
                })

                return final_summary
            except Exception as error:
                self.log_patch_event('SUMMARY_CREATION_FAILED', {
                    'patch_file': patch_file.name,
                    'error': str(error),
                    'attempt': attempts
                })
                logger.error(
                    f"Failed to create summary for {patch_file} (attempt {attempts}): {error}"
                )
                time.sleep(delay_base * attempts)
        return None

    def start(self) -> None:
        """Start the daemon."""
        self.running = True
        logger.info("Enhanced Patch Executor Daemon started")

        # Set up signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        # Initial heartbeat
        self.emit_heartbeat()

        try:
            while self.running:
                # Monitor queue health
                self.monitor_queue_health()

                # Check for stale patches
                self.check_stale_patches()

                # Process patches
                self._process_patches()

                # Emit heartbeat
                self.emit_heartbeat()

                time.sleep(self.check_interval)

        except KeyboardInterrupt:
            logger.info("Received interrupt signal, shutting down...")
        except Exception as error:
            self.error_count += 1
            self.last_error_time = time.time()
            self.log_patch_event('DAEMON_ERROR', {'error': str(error)})
            logger.error(f"Unexpected error in daemon loop: {error}")
        finally:
            self.stop()

    def stop(self) -> None:
        """Stop the daemon."""
        self.running = False
        self.log_patch_event('SHUTDOWN', {'reason': 'normal'})
        logger.info("Enhanced Patch Executor Daemon stopped")

    def _signal_handler(self, signum: int, frame) -> None:
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down...")
        self.stop()

    def _process_patches(self) -> None:
        """Process all available patches."""
        try:
            # Pause processing if logs aren't writable and operator hasn't allowed proceed
            if self.paused_due_to_log_failure and not ALLOW_PROCEED_FILE.exists():
                logger.error(
                    "Processing paused due to unified log failure. "
                    "Create ALLOW_PROCEED to override."
                )
                return
            if not self.patches_dir.exists():
                return

            # Get all JSON patch files
            patch_files = [f for f in self.patches_dir.iterdir() if f.suffix == '.json']

            if not patch_files:
                return

            # Sort by modification time (oldest first)
            patch_files.sort(key=lambda f: f.stat().st_mtime)

            for patch_file in patch_files:
                if not self.running:
                    break

                if patch_file.name not in self.processed_patches:
                    self._process_single_patch(patch_file)

        except Exception as error:
            self.error_count += 1
            self.last_error_time = time.time()
            self.log_patch_event('PROCESS_PATCHES_ERROR', {'error': str(error)})
            logger.error(f"Error processing patches: {error}")

    def _process_single_patch(self, patch_file: Path) -> None:
        """Process a single patch file."""
        start_time = time.time()

        try:
            logger.info(f"Processing patch: {patch_file.name}")
            self.log_patch_event(
                'PATCH_PROCESSING_START', {'patch_file': patch_file.name}
            )

            # Apply the patch
            apply_result = apply_patch_from_file(str(patch_file))
            success = (
                isinstance(apply_result, dict)
                and apply_result.get('status') == 'success'
            )

            processing_time = time.time() - start_time

            # Create summary
            details = {
                'processing_time': f"{processing_time:.2f}s",
                'patch_size': patch_file.stat().st_size,
                'success': success,
                'apply_result': apply_result,
            }

            summary_file = self.create_atomic_summary(patch_file, success, details)

            if success:
                # Move to completed directory
                completed_dir = self.patches_dir / '.completed'
                completed_dir.mkdir(exist_ok=True)

                completed_file = completed_dir / patch_file.name
                shutil.move(patch_file, completed_file)

                self.processed_patches.add(patch_file.name)
                self.log_patch_event(
                    'PATCH_COMPLETED',
                    {
                        'patch_file': patch_file.name,
                        'processing_time': processing_time,
                        'summary_file': str(summary_file) if summary_file else None,
                    },
                )

                logger.info(f"✅ Patch completed: {patch_file.name}")
            else:
                # Move to failed directory
                failed_dir = self.patches_dir / '.failed'
                failed_dir.mkdir(exist_ok=True)

                failed_file = failed_dir / patch_file.name
                shutil.move(patch_file, failed_file)

                self.log_patch_event(
                    'PATCH_FAILED',
                    {
                        'patch_file': patch_file.name,
                        'processing_time': processing_time,
                        'summary_file': str(summary_file) if summary_file else None,
                    },
                )

                logger.error(f"❌ Patch failed: {patch_file.name}")

        except Exception as error:
            processing_time = time.time() - start_time
            self.error_count += 1
            self.last_error_time = time.time()

            # Create error summary
            error_details = {
                'processing_time': f"{processing_time:.2f}s",
                'error': str(error),
                'success': False,
            }

            summary_file = self.create_atomic_summary(patch_file, False, error_details)

            self.log_patch_event(
                'PATCH_PROCESSING_ERROR',
                {
                    'patch_file': patch_file.name,
                    'error': str(error),
                    'processing_time': processing_time,
                },
            )

            logger.error(f"Error processing patch {patch_file.name}: {error}")


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Enhanced Patch Executor Daemon"
    )
    parser.add_argument(
        "--patches-dir",
        default="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches",
        help="Directory containing patches (default: .cursor-cache/CYOPS/patches)"
    )
    parser.add_argument(
        "--check-interval",
        type=int,
        default=30,
        help="Check interval in seconds (default: 30)"
    )
    parser.add_argument(
        "--daemon",
        action="store_true",
        help="Run as daemon (background process)"
    )

    args = parser.parse_args()

    # Create and start daemon
    daemon_instance = EnhancedPatchExecutorDaemon(
        args.patches_dir, args.check_interval
    )

    if args.daemon:
        # Run as background daemon
        try:
            import daemon  # type: ignore
            with daemon.DaemonContext():
                daemon_instance.start()
        except Exception as e:  # noqa: BLE001
            logger.error(
                "Daemon mode requested but failed to start in background: "
                f"{e}. Running in foreground."
            )
            daemon_instance.start()
    else:
        # Run in foreground
        daemon_instance.start()


if __name__ == "__main__":
    main()
