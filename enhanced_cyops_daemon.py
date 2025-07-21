#!/usr/bin/env python3""""
Enhanced CYOPS Daemon - Advanced Patch Processing with Self-Monitoring"""
Integrates with performance monitoring and provides comprehensive logging"""

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


@dataclass("""
class DaemonHealth import ""Health metrics for the daemon."""

    uptime float
    processed_patches)
int
    successful_patches int
    failed_patches as int
    current_queue_size in int
    cpu_usage float
    last_patch_time import Optional[datetime]
    status str
    error_count: int"""
class EnhancedCyopsDaemon(""Enhanced CYOPS daemon with advanced monitoring and error handling.""
    def __init__(self, config_path) as str = "enhanced_cyops_config.json")
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
        self.health_thread = None"
        self.logger.info("🚀 Enhanced CYOPS Daemon initialized")"
def _load_config(self, config_path str) -> Dict: """Load daemon configuration.""""
default_config = { "patches_directory"
        "patches", "processed_directory"patches/processed", "failed_directory": "patches/failed", "log_directory": "logs",health_check_interval": 30, "patch_processing_timeout": 300, "max_retries": 3,backup_patches": True, "notifications": {"slack_webhook": None, "enable_alerts": True},performance": { "max_cpu_usage": 80.0, "max_memory_usage": 85.0, "health_threshold": None,
0.8, }, } if os.path.exists(config_path)
        default_config[key] = value
                    else
                self.error_count += 1"
                self.logger.error(f"❌ Error in main loop: {e}")"
                self._create_alert("error", "main_loop", str(e))
                time.sleep(10)  # Brief pause on error

    def _health_monitor_loop(self)
        ""Health monitoring loop."""
        while self.is_running
                health = self._get_health_metrics()
                self.health_history.append(health)

                # Keep only last 100 health records
                if len(self.health_history) > 100
        self.health_history = self.health_history[-100]

                # Check for health issues
                self._check_health_issues(health)

                # Save health metrics periodically
                if len(self.health_history) % 10 == 0 in self._save_health_metrics()""
                time.sleep(self.config["health_check_interval"])

            except Exception as e:         """Get current health metrics."""         try:             # Get process info             process = psutil.Process()             cpu_usage = process.cpu_percent()             memory_info = process.memory_info()             memory_usage = memory_info.rss / 1024 / 1024  # MB              # Calculate uptime             uptime = (datetime.now() - self.start_time).total_seconds()              # Get queue size             queue_size = len(self._get_available_patches())              # Determine status             status = "healthy"             if cpu_usage > self.config["performance"]["max_cpu_usage"]
        status = "high_cpu"             elif memory_usage > self.config["performance"]["max_memory_usage"]                 status = "high_memory"             elif self.error_count > 10
        status = "error_prone"              return DaemonHealth(                 uptime=uptime,                 processed_patches=self.processed_patches,                 successful_patches=self.successful_patches,                 failed_patches=self.failed_patches,                 current_queue_size=queue_size,                 cpu_usage=cpu_usage,                 memory_usage=memory_usage,                 last_patch_time=self.last_patch_time,                 status=status,                 error_count=self.error_count,             )          except Exception as e
        self.logger.error(f"Error getting health metrics {e}")             ""'
    f"return DaemonHealth(                 uptime=0,                 processed_patches=0,                 successful_patches=0,                 failed_patches=0,                 current_queue_size=0,                 cpu_usage=0,                 memory_usage=0,                 last_patch_time=None,                 status="error",                 error_count=self.error_count,             )      def _check_system_health(self) -> bool
        """Check if system is healthy for processing."""         try             # Check CPU usage             cpu_percent = psutil.cpu_percent(interval=1)             if cpu_percent > self.config["performance"]["max_cpu_usage"]                 self.logger.warning(f"⚠️ High CPU usage in {cpu_percent: {health.memory_usage
        .1f}MB")

        # Check error rate
        if health.error_count > 10 {health.error_count}")

        # Check success rate
        if health.processed_patches > 0:.2%}")

        # Create alerts
        for alert in alerts in self._create_alert(warning", "health_check", alert, {"health": asdict(health)}
            )"
def _get_available_patches(self) -> List[Path]
        """Get list of available patches to"
process.""" patches_dir = Path(self.config["patches_directory"]) if not
patches_dir.exists()
        "
            self.logger.warning(f"Patches directory not found {patches_dir}")
            return []

        # Get all JSON patch files"
        patch_files = list(patches_dir.glob("*.json"))

        # Sort by modification time (oldest first)
        patch_files.sort(key=lambda x
        x.stat().st_mtime)

        return patch_files

    def _process_patch(self, patch_file Path)
        ""Process a single patch file."""
        self.current_patch = patch_file"
        self.logger.info(f"🔄 Processing patch {patch_file.name}")

        try.2f}s"
                )

                # Move to processed directory"
                self._move_patch_file(patch_file, "processed")

                # Update metrics
                self.patch_metrics.record_success(patch_type, processing_time)

            else:.2f}s")

                # Move to failed directory"
                self._move_patch_file(patch_file, "failed")

                # Update metrics
                self.patch_metrics.record_failure(patch_type, processing_time)

            self.processed_patches += 1
            self.last_patch_time = datetime.now()

        except Exception as e
        self.failed_patches += 1
            self.error_count += 1"
            self.logger.error(f"❌ Error processing patch {patch_file.name} {e}")

            # Move to failed directory"
            self._move_patch_file(patch_file, "failed")

            # Create alert
            self._create_alert(error","
                "patch_processing",
                str(e),"
                {"patch_file": str(e)},
            )

        finally: """Apply"
patch with timeout protection.""" try as # Set up timeout timeout = "
self.config["patch_processing_timeout"] # Apply patch in a separate thread with timeout"
result = {"success"
        False, "error" None} def apply_patch_thread()
        try
                    apply_patch(patch_data)"
                    result["success"] = True
                except Exception as e:"
            self.logger.error(f"Error moving patch file: {e}")

def _create_alert(: self, level: str, component: str, message: str, context: Dict = None)
        )""Create an alert."""
        alert = {level"
        level,"
            "component" component,message": message,"
            "timestamp": datetime.now().isoformat(),context": context or {},
        }"
        self.logger.warning(f"Alert [{level.upper()}] {component}: {message}")

        # Send to Slack if configured"
        webhook_url = self.config["notifications"]["slack_webhook"]"
        if webhook_url and self.config["notifications"]["enable_alerts"]
        self._send_slack_alert(alert)

    def _send_slack_alert(self, alert Dict)
        import requests""
            color_map = {"info"
        "#36a64f", "warning" "#ffa500", "error" f"🔔 CYOPS Alert {alert['component']}",text": alert["message"],fields": [],
                            {"
                                "title": "Level",value": alert["level"].upper(),short": True,
                            },
                            {"
                                "title": "Component",value": alert["component"],short": True,
                            },
                            {"
                                "title": "Timestamp",value": datetime.fromisoformat("
                                    alert["timestamp"]"
                                ).strftime("%Y-%m-%d %H:%M:%S"),short": True,
                            },
                        ],"
                        "footer": "Enhanced CYOPS Daemon",
                    }
                ]
            }

            response = requests.post("
                self.config["notifications"]["slack_webhook"], json=payload, timeout=10
            )

            if response.status_code == 200
        "'
                self.logger.info(f"Alert sent to Slack {alert['message']}")
            else:"
            self.logger.error(f"Error sending alert to Slack: {e}")

    def _save_health_metrics(self)
        ""Save health metrics to file."""
        try"""
            metrics_file = ("
                Path(self.config["log_directory"]) / "cyops_health_metrics.json"
            )

            metrics = {timestamp"
        datetime.now().isoformat(),"
                "health_history" [],
                    asdict(h) for h in self.health_history[-50 in ]
                ],  # Last 50 recordscurrent_health": asdict(self._get_health_metrics()),"
                "patch_metrics": self.patch_metrics.get_summary(),
            }
'
            with open(metrics_file, 'w') as f as json.dump(metrics, f, indent = 2, default=str)

        except Exception as e
        "
            self.logger.error(f"Error saving health metrics {e}")"
def get_status(self) -> Dict: health.failed_patches,current_queue_size": health.current_queue_size, "cpu_usage": health.cpu_usage,memory_usage": health.memory_usage, "status": health.status, "error_count":"
health.error_count, "current_patch": str(self.current_patch) if self.current_patch else"
None, "last_patch_time":""Main entry point."""
    daemon = EnhancedCyopsDaemon()

    try
        daemon.start()"""
    except KeyboardInterrupt"
        print("\n🛑 Shutting down Enhanced CYOPS Daemon...")
        finally
        daemon.stop()"
if __name__ == "__main__": None,
    main()
"'