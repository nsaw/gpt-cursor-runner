# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
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
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from pathlib import Path
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
            with open(config_path, "r") as f:
                user_config = json.load(f)
                for key, value in user_config.items():
                    if key in default_config:
                        if isinstance(value, dict):
                            default_config[key].update(value)
                        else:
                            default_config[key] = value

        return default_config

    def _setup_logging(self):
        """Setup logging configuration."""
        log_dir = Path(self.config["log_directory"])
        log_dir.mkdir(exist_ok=True)

        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            handlers=[
                logging.FileHandler(log_dir / "enhanced_cyops_daemon.log"),
                logging.StreamHandler(),
            ],
        )
        self.logger = logging.getLogger(__name__)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        self.logger.info(f"🛑 Received signal {signum}, shutting down...")
        self.stop()

    def start(self):
        """Start the daemon."""
        self.is_running = True
        self.logger.info("🚀 Enhanced CYOPS Daemon starting...")

        # Start health monitoring thread
        self.health_thread = threading.Thread(target=self._health_monitor_loop)
        self.health_thread.daemon = True
        self.health_thread.start()

        # Main processing loop
        self._main_loop()

    def stop(self):
        """Stop the daemon."""
        self.is_running = False
        self.logger.info("🛑 Enhanced CYOPS Daemon stopping...")

        if self.health_thread:
            self.health_thread.join(timeout=5)

        self.logger.info("✅ Enhanced CYOPS Daemon stopped")

    def _main_loop(self):
        """Main processing loop."""
        while self.is_running:
            try:
                # Check system health before processing
                if not self._check_system_health():
                    self.logger.warning("⚠️ System health check failed, pausing...")
                    time.sleep(30)
                    continue

                # Get available patches
                patches = self._get_available_patches()
                if not patches:
                    time.sleep(10)
                    continue

                # Process next patch
                patch_file = patches[0]
                self._process_patch(patch_file)

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

    def _get_health_metrics(self) -> DaemonHealth:
        """Get current health metrics."""
        process = psutil.Process()

        return DaemonHealth(
            uptime=(datetime.now() - self.start_time).total_seconds(),
            processed_patches=self.processed_patches,
            successful_patches=self.successful_patches,
            failed_patches=self.failed_patches,
            current_queue_size=len(self._get_available_patches()),
            cpu_usage=process.cpu_percent(),
            memory_usage=process.memory_percent(),
            last_patch_time=self.last_patch_time,
            status=self._determine_status(),
            error_count=self.error_count,
        )

    def _determine_status(self) -> str:
        """Determine daemon status based on health metrics."""
        if self.error_count > 10:
            return "critical"
        elif self.error_count > 5:
            return "warning"
        else:
            return "healthy"

    def _check_system_health(self) -> bool:
        """Check if system is healthy for processing."""
        process = psutil.Process()
        cpu_usage = process.cpu_percent()
        memory_usage = process.memory_percent()

        max_cpu = self.config["performance"]["max_cpu_usage"]
        max_memory = self.config["performance"]["max_memory_usage"]

        if cpu_usage > max_cpu:
            self.logger.warning(f"CPU usage too high: {cpu_usage}% > {max_cpu}%")
            return False

        if memory_usage > max_memory:
            self.logger.warning(
                f"Memory usage too high: {memory_usage}% > {max_memory}%"
            )
            return False

        return True

    def _get_available_patches(self) -> List[str]:
        """Get list of available patch files."""
        patches_dir = Path(self.config["patches_directory"])
        if not patches_dir.exists():
            return []

        return [str(f) for f in patches_dir.glob("*.json") if f.is_file()]

    def _process_patch(self, patch_file: str):
        """Process a single patch file."""
        try:
            self.current_patch = patch_file
            self.logger.info(f"🔄 Processing patch: {patch_file}")

            # Load patch
            with open(patch_file, "r") as f:
                patch_data = json.load(f)

            # Classify patch
            patch_type = classify_patch(patch_data)
            self.logger.info(f"📋 Patch classified as: {patch_type}")

            # Apply patch
            result = apply_patch(patch_data)

            if result.success:
                self.successful_patches += 1
                self.logger.info(f"✅ Patch applied successfully: {patch_file}")
                self._move_patch(patch_file, self.config["processed_directory"])
            else:
                self.failed_patches += 1
                self.logger.error(f"❌ Patch failed: {patch_file} - {result.error}")
                self._move_patch(patch_file, self.config["failed_directory"])

            self.processed_patches += 1
            self.last_patch_time = datetime.now()

        except Exception as e:
            self.failed_patches += 1
            self.error_count += 1
            self.logger.error(f"❌ Error processing patch {patch_file}: {e}")
            self._move_patch(patch_file, self.config["failed_directory"])
        finally:
            self.current_patch = None

    def _move_patch(self, patch_file: str, destination: str):
        """Move patch file to destination directory."""
        try:
            dest_dir = Path(destination)
            dest_dir.mkdir(exist_ok=True)

            source_path = Path(patch_file)
            dest_path = dest_dir / source_path.name

            if self.config["backup_patches"]:
                # Create backup before moving
                backup_path = dest_dir / f"{source_path.stem}_{int(time.time())}.json"
                source_path.rename(backup_path)
            else:
                source_path.rename(dest_path)

        except Exception as e:
            self.logger.error(f"Error moving patch file: {e}")

    def _check_health_issues(self, health: DaemonHealth):
        """Check for health issues and create alerts."""
        if health.status != "healthy":
            self._create_alert("warning", "health", f"Daemon status: {health.status}")

        if health.error_count > 5:
            self._create_alert(
                "error", "health", f"High error count: {health.error_count}"
            )

    def _save_health_metrics(self):
        """Save health metrics to file."""
        try:
            metrics_file = Path(self.config["log_directory"]) / "health_metrics.json"
            with open(metrics_file, "w") as f:
                json.dump(
                    [asdict(h) for h in self.health_history], f, indent=2, default=str
                )
        except Exception as e:
            self.logger.error(f"Error saving health metrics: {e}")

    def _create_alert(self, level: str, component: str, message: str):
        """Create an alert."""
        if not self.config["notifications"]["enable_alerts"]:
            return

        alert = {
            "level": level,
            "component": component,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "daemon_uptime": (datetime.now() - self.start_time).total_seconds(),
        }

        self.logger.warning(f"🚨 ALERT [{level.upper()}] {component}: {message}")

        # Send to Slack if configured
        if self.config["notifications"]["slack_webhook"]:
            self._send_slack_alert(alert)

    def _send_slack_alert(self, alert: Dict):
        """Send alert to Slack."""
        try:
            import requests

            payload = {
                "text": f"🚨 *CYOPS Daemon Alert* - {alert['level'].upper()}",
                "attachments": [
                    {
                        "text": alert["message"],
                        "fields": [
                            {
                                "title": "Component",
                                "value": alert["component"],
                                "short": True,
                            },
                            {"title": "Level", "value": alert["level"], "short": True},
                            {
                                "title": "Uptime",
                                "value": f"{alert['daemon_uptime']:.0f}s",
                                "short": True,
                            },
                        ],
                        "color": "danger" if alert["level"] == "error" else "warning",
                    }
                ],
            }

            response = requests.post(
                self.config["notifications"]["slack_webhook"], json=payload, timeout=10
            )

            if response.status_code != 200:
                self.logger.error(f"Failed to send Slack alert: {response.status_code}")

        except Exception as e:
            self.logger.error(f"Error sending Slack alert: {e}")

    def get_status(self) -> Dict:
        """Get current daemon status."""
        health = self._get_health_metrics()
        return {
            "status": health.status,
            "uptime": health.uptime,
            "processed_patches": health.processed_patches,
            "successful_patches": health.successful_patches,
            "failed_patches": health.failed_patches,
            "current_queue_size": health.current_queue_size,
            "cpu_usage": health.cpu_usage,
            "memory_usage": health.memory_usage,
            "error_count": health.error_count,
            "current_patch": self.current_patch,
        }


def main():
    """Main entry point."""
    daemon = EnhancedCyopsDaemon()
    try:
        daemon.start()
    except KeyboardInterrupt:
        daemon.stop()


if __name__ == "__main__":
    main()
