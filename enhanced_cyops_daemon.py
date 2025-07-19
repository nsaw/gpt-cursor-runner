#!/usr/bin/env python3
"""
Enhanced CYOPS Daemon - Advanced Patch Processing with Self-Monitoring
Integrates with performance monitoring and provides comprehensive logging
"""

from gpt_cursor_runner.patch_metrics import PatchMetrics
from gpt_cursor_runner.patch_classifier import classify_patch
from gpt_cursor_runner.patch_runner import apply_patch
import os
import sys
import time
import json
import logging
import signal
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from pathlib import Path
import subprocess
import psutil

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


@dataclass
class DaemonHealth:
    """Health metrics for the daemon."""

    uptime: float
    processed_patches: int
    successful_patches: int
    failed_patches: int
    current_queue_size: int
    cpu_usage: float
    memory_usage: float
    last_patch_time: Optional[datetime]
    status: str
    error_count: int


class EnhancedCyopsDaemon:
    """Enhanced CYOPS daemon with advanced monitoring and error handling."""

    def __init__(self, config_path: str = "enhanced_cyops_config.json"):
        self.config = self._load_config(config_path)
        self.is_running = False
        self.processed_patches = 0
        self.successful_patches = 0
        self.failed_patches = 0
        self.error_count = 0
        self.start_time = datetime.now()
        self.last_patch_time = None
        self.current_patch = None
        self.health_history = []

        # Setup logging
        self._setup_logging()

        # Initialize patch metrics
        self.patch_metrics = PatchMetrics()

        # Signal handling
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        # Health monitoring thread
        self.health_thread = None

        self.logger.info("🚀 Enhanced CYOPS Daemon initialized")

    def _load_config(self, config_path: str) -> Dict:
        """Load daemon configuration."""
        default_config = {
            "patches_directory": "patches",
            "processed_directory": "patches/processed",
            "failed_directory": "patches/failed",
            "log_directory": "logs",
            "health_check_interval": 30,
            "patch_processing_timeout": 300,
            "max_retries": 3,
            "backup_patches": True,
            "notifications": {"slack_webhook": None, "enable_alerts": True},
            "performance": {
                "max_cpu_usage": 80.0,
                "max_memory_usage": 85.0,
                "health_threshold": 0.8,
            },
        }

        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                user_config = json.load(f)
                # Merge with defaults
                for key, value in user_config.items():
                    if key in default_config:
                        if isinstance(value, dict):
                            default_config[key].update(value)
                        else:
                            default_config[key] = value
                    else:
                        default_config[key] = value

        return default_config

    def _setup_logging(self):
        """Setup structured logging."""
        log_dir = Path(self.config["log_directory"])
        log_dir.mkdir(exist_ok=True)

        # Create log file with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = log_dir / f"enhanced-cyops-daemon_{timestamp}.log"

        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - [EnhancedCyops] %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout),
            ],
        )
        self.logger = logging.getLogger(__name__)

        # Also log to a current log file
        current_log_file = log_dir / "enhanced-cyops-daemon.log"
        current_handler = logging.FileHandler(current_log_file)
        current_handler.setFormatter(
            logging.Formatter(
                '%(asctime)s - %(levelname)s - [EnhancedCyops] %(message)s'
            )
        )
        self.logger.addHandler(current_handler)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        self.logger.info(f"🛑 Received signal {signum}, shutting down gracefully...")
        self.stop()

    def start(self):
        """Start the enhanced CYOPS daemon."""
        if self.is_running:
            self.logger.warning("Daemon already running")
            return

        self.is_running = True
        self.logger.info("🚀 Starting Enhanced CYOPS Daemon")

        # Start health monitoring thread
        self.health_thread = threading.Thread(
            target=self._health_monitor_loop, daemon=True
        )
        self.health_thread.start()

        # Main processing loop
        self._main_loop()

    def stop(self):
        """Stop the daemon gracefully."""
        self.is_running = False
        self.logger.info("🛑 Stopping Enhanced CYOPS Daemon")

        if self.health_thread:
            self.health_thread.join(timeout=5)

        # Save final health metrics
        self._save_health_metrics()
        self.logger.info("✅ Enhanced CYOPS Daemon stopped")

    def _main_loop(self):
        """Main patch processing loop."""
        self.logger.info("🔄 Starting patch processing loop")

        while self.is_running:
            try:
                # Check system health before processing
                if not self._check_system_health():
                    self.logger.warning("⚠️ System health check failed, pausing...")
                    time.sleep(30)
                    continue

                # Process available patches
                patches = self._get_available_patches()

                if patches:
                    self.logger.info(f"📦 Found {len(patches)} patches to process")

                    for patch_file in patches:
                        if not self.is_running:
                            break

                        self._process_patch(patch_file)
                else:
                    # No patches to process, sleep briefly
                    time.sleep(5)

            except Exception as e:
                self.error_count += 1
                self.logger.error(f"❌ Error in main loop: {e}")
                self._create_alert("error", "main_loop", str(e))
                time.sleep(10)  # Brief pause on error

    def _health_monitor_loop(self):
        """Health monitoring loop."""
        while self.is_running:
            try:
                health = self._get_health_metrics()
                self.health_history.append(health)

                # Keep only last 100 health records
                if len(self.health_history) > 100:
                    self.health_history = self.health_history[-100:]

                # Check for health issues
                self._check_health_issues(health)

                # Save health metrics periodically
                if len(self.health_history) % 10 == 0:
                    self._save_health_metrics()

                time.sleep(self.config["health_check_interval"])

            except Exception as e:
                self.logger.error(f"Error in health monitor: {e}")
                time.sleep(30)

    def _get_health_metrics(self) -> DaemonHealth:
        """Get current health metrics."""
        try:
            # Get process info
            process = psutil.Process()
            cpu_usage = process.cpu_percent()
            memory_info = process.memory_info()
            memory_usage = memory_info.rss / 1024 / 1024  # MB

            # Calculate uptime
            uptime = (datetime.now() - self.start_time).total_seconds()

            # Get queue size
            queue_size = len(self._get_available_patches())

            # Determine status
            status = "healthy"
            if cpu_usage > self.config["performance"]["max_cpu_usage"]:
                status = "high_cpu"
            elif memory_usage > self.config["performance"]["max_memory_usage"]:
                status = "high_memory"
            elif self.error_count > 10:
                status = "error_prone"

            return DaemonHealth(
                uptime=uptime,
                processed_patches=self.processed_patches,
                successful_patches=self.successful_patches,
                failed_patches=self.failed_patches,
                current_queue_size=queue_size,
                cpu_usage=cpu_usage,
                memory_usage=memory_usage,
                last_patch_time=self.last_patch_time,
                status=status,
                error_count=self.error_count,
            )

        except Exception as e:
            self.logger.error(f"Error getting health metrics: {e}")
            return DaemonHealth(
                uptime=0,
                processed_patches=0,
                successful_patches=0,
                failed_patches=0,
                current_queue_size=0,
                cpu_usage=0,
                memory_usage=0,
                last_patch_time=None,
                status="error",
                error_count=self.error_count,
            )

    def _check_system_health(self) -> bool:
        """Check if system is healthy for processing."""
        try:
            # Check CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            if cpu_percent > self.config["performance"]["max_cpu_usage"]:
                self.logger.warning(f"⚠️ High CPU usage: {cpu_percent:.1f}%")
                return False

            # Check memory usage
            memory = psutil.virtual_memory()
            if memory.percent > self.config["performance"]["max_memory_usage"]:
                self.logger.warning(f"⚠️ High memory usage: {memory.percent:.1f}%")
                return False

            # Check disk space
            disk = psutil.disk_usage('/')
            if disk.percent > 90:
                self.logger.warning(f"⚠️ Low disk space: {disk.percent:.1f}% used")
                return False

            return True

        except Exception as e:
            self.logger.error(f"Error checking system health: {e}")
            return False

    def _check_health_issues(self, health: DaemonHealth):
        """Check for health issues and create alerts."""
        alerts = []

        # Check CPU usage
        if health.cpu_usage > self.config["performance"]["max_cpu_usage"]:
            alerts.append(f"High CPU usage: {health.cpu_usage:.1f}%")

        # Check memory usage
        if health.memory_usage > self.config["performance"]["max_memory_usage"]:
            alerts.append(f"High memory usage: {health.memory_usage:.1f}MB")

        # Check error rate
        if health.error_count > 10:
            alerts.append(f"High error count: {health.error_count}")

        # Check success rate
        if health.processed_patches > 0:
            success_rate = health.successful_patches / health.processed_patches
            if success_rate < self.config["performance"]["health_threshold"]:
                alerts.append(f"Low success rate: {success_rate:.2%}")

        # Create alerts
        for alert in alerts:
            self._create_alert(
                "warning", "health_check", alert, {"health": asdict(health)}
            )

    def _get_available_patches(self) -> List[Path]:
        """Get list of available patches to process."""
        patches_dir = Path(self.config["patches_directory"])

        if not patches_dir.exists():
            self.logger.warning(f"Patches directory not found: {patches_dir}")
            return []

        # Get all JSON patch files
        patch_files = list(patches_dir.glob("*.json"))

        # Sort by modification time (oldest first)
        patch_files.sort(key=lambda x: x.stat().st_mtime)

        return patch_files

    def _process_patch(self, patch_file: Path):
        """Process a single patch file."""
        self.current_patch = patch_file
        self.logger.info(f"🔄 Processing patch: {patch_file.name}")

        try:
            # Read patch file
            with open(patch_file, 'r') as f:
                patch_data = json.load(f)

            # Classify patch
            patch_type = classify_patch(patch_data)
            self.logger.info(f"📋 Patch type: {patch_type}")

            # Apply patch with timeout
            start_time = time.time()
            success = self._apply_patch_with_timeout(patch_data, patch_type)
            processing_time = time.time() - start_time

            if success:
                self.successful_patches += 1
                self.logger.info(
                    f"✅ Patch applied successfully in {processing_time:.2f}s"
                )

                # Move to processed directory
                self._move_patch_file(patch_file, "processed")

                # Update metrics
                self.patch_metrics.record_success(patch_type, processing_time)

            else:
                self.failed_patches += 1
                self.logger.error(f"❌ Patch failed after {processing_time:.2f}s")

                # Move to failed directory
                self._move_patch_file(patch_file, "failed")

                # Update metrics
                self.patch_metrics.record_failure(patch_type, processing_time)

            self.processed_patches += 1
            self.last_patch_time = datetime.now()

        except Exception as e:
            self.failed_patches += 1
            self.error_count += 1
            self.logger.error(f"❌ Error processing patch {patch_file.name}: {e}")

            # Move to failed directory
            self._move_patch_file(patch_file, "failed")

            # Create alert
            self._create_alert(
                "error",
                "patch_processing",
                str(e),
                {"patch_file": str(patch_file), "error": str(e)},
            )

        finally:
            self.current_patch = None

    def _apply_patch_with_timeout(self, patch_data: Dict, patch_type: str) -> bool:
        """Apply patch with timeout protection."""
        try:
            # Set up timeout
            timeout = self.config["patch_processing_timeout"]

            # Apply patch in a separate thread with timeout
            result = {"success": False, "error": None}

            def apply_patch_thread():
                try:
                    apply_patch(patch_data)
                    result["success"] = True
                except Exception as e:
                    result["error"] = str(e)

            thread = threading.Thread(target=apply_patch_thread)
            thread.daemon = True
            thread.start()
            thread.join(timeout=timeout)

            if thread.is_alive():
                # Thread is still running, timeout occurred
                self.logger.error(f"⏰ Patch processing timeout after {timeout}s")
                return False

            if result["error"]:
                self.logger.error(f"❌ Patch application error: {result['error']}")
                return False

            return result["success"]

        except Exception as e:
            self.logger.error(f"❌ Error in patch application: {e}")
            return False

    def _move_patch_file(self, patch_file: Path, destination: str):
        """Move patch file to processed or failed directory."""
        try:
            dest_dir = Path(self.config[f"{destination}_directory"])
            dest_dir.mkdir(exist_ok=True)

            # Create backup if enabled
            if self.config["backup_patches"]:
                backup_file = (
                    dest_dir
                    / f"{patch_file.stem}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                )
                patch_file.rename(backup_file)
                self.logger.info(f"📁 Moved {patch_file.name} to {destination}")
            else:
                patch_file.unlink()
                self.logger.info(f"🗑️ Deleted {patch_file.name}")

        except Exception as e:
            self.logger.error(f"Error moving patch file: {e}")

    def _create_alert(
        self, level: str, component: str, message: str, context: Dict = None
    ):
        """Create an alert."""
        alert = {
            "level": level,
            "component": component,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "context": context or {},
        }

        self.logger.warning(f"Alert [{level.upper()}] {component}: {message}")

        # Send to Slack if configured
        webhook_url = self.config["notifications"]["slack_webhook"]
        if webhook_url and self.config["notifications"]["enable_alerts"]:
            self._send_slack_alert(alert)

    def _send_slack_alert(self, alert: Dict):
        """Send alert to Slack."""
        try:
            import requests

            color_map = {"info": "#36a64f", "warning": "#ffa500", "error": "#ff0000"}

            payload = {
                "attachments": [
                    {
                        "color": color_map.get(alert["level"], "#000000"),
                        "title": f"🔔 CYOPS Alert: {alert['component']}",
                        "text": alert["message"],
                        "fields": [
                            {
                                "title": "Level",
                                "value": alert["level"].upper(),
                                "short": True,
                            },
                            {
                                "title": "Component",
                                "value": alert["component"],
                                "short": True,
                            },
                            {
                                "title": "Timestamp",
                                "value": datetime.fromisoformat(
                                    alert["timestamp"]
                                ).strftime("%Y-%m-%d %H:%M:%S"),
                                "short": True,
                            },
                        ],
                        "footer": "Enhanced CYOPS Daemon",
                    }
                ]
            }

            response = requests.post(
                self.config["notifications"]["slack_webhook"], json=payload, timeout=10
            )

            if response.status_code == 200:
                self.logger.info(f"Alert sent to Slack: {alert['message']}")
            else:
                self.logger.error(
                    f"Failed to send alert to Slack: {response.status_code}"
                )

        except Exception as e:
            self.logger.error(f"Error sending alert to Slack: {e}")

    def _save_health_metrics(self):
        """Save health metrics to file."""
        try:
            metrics_file = (
                Path(self.config["log_directory"]) / "cyops_health_metrics.json"
            )

            metrics = {
                "timestamp": datetime.now().isoformat(),
                "health_history": [
                    asdict(h) for h in self.health_history[-50:]
                ],  # Last 50 records
                "current_health": asdict(self._get_health_metrics()),
                "patch_metrics": self.patch_metrics.get_summary(),
            }

            with open(metrics_file, 'w') as f:
                json.dump(metrics, f, indent=2, default=str)

        except Exception as e:
            self.logger.error(f"Error saving health metrics: {e}")

    def get_status(self) -> Dict:
        """Get current daemon status."""
        health = self._get_health_metrics()

        return {
            "running": self.is_running,
            "uptime": health.uptime,
            "processed_patches": health.processed_patches,
            "successful_patches": health.successful_patches,
            "failed_patches": health.failed_patches,
            "current_queue_size": health.current_queue_size,
            "cpu_usage": health.cpu_usage,
            "memory_usage": health.memory_usage,
            "status": health.status,
            "error_count": health.error_count,
            "current_patch": str(self.current_patch) if self.current_patch else None,
            "last_patch_time": (
                health.last_patch_time.isoformat() if health.last_patch_time else None
            ),
        }


def main():
    """Main entry point."""
    daemon = EnhancedCyopsDaemon()

    try:
        daemon.start()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down Enhanced CYOPS Daemon...")
    finally:
        daemon.stop()


if __name__ == "__main__":
    main()
