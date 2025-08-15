# Company Confidential
# Company Confidential
# Company Confidential
from typing import List, Optional

# Company Confidential
# Company Confidential
# Company Confidential
#!/usr/bin/env python3
"""
File Watcher Daemon for GPT-Cursor Runner.

Monitors Cursor files for changes and triggers appropriate actions.
"""


# Import logging system
try:
    from .event_logger import EventLogger

    EVENT_LOGGER: Optional[EventLogger] = EventLogger()
except ImportError:
    EVENT_LOGGER = None

# Import notification system
try:
    from .slack_proxy import create_slack_proxy

    slack_proxy = create_slack_proxy()
except ImportError:
    slack_proxy = None


class CursorFileHandler(FileSystemEventHandler):
    """Handle file system events for Cursor files."""

    def __init__(
        self, watch_directories: List[str], exclude_patterns: List[str] = None
    ):
        self.watch_directories = watch_directories
        self.exclude_patterns = exclude_patterns or [
            "node_modules",
            ".git",
            ".venv",
            "venv",
            "__pycache__",
            "*.log",
            "*.tmp",
            "*.bak",
        ]
        self.last_events: dict[str, float] = {}  # Prevent duplicate events
        self.event_cooldown = 2  # seconds

    def should_watch_file(self, file_path: str) -> bool:
        """Check if file should be watched."""
        for pattern in self.exclude_patterns:
            if pattern in file_path:
                return False
        return True

    def on_created(self, event) -> None:
        """Handle file creation events."""
        if not event.is_directory and self.should_watch_file(event.src_path):
            self._handle_file_event("created", event.src_path)

    def on_modified(self, event) -> None:
        """Handle file modification events."""
        if not event.is_directory and self.should_watch_file(event.src_path):
            self._handle_file_event("modified", event.src_path)

    def on_deleted(self, event) -> None:
        """Handle file deletion events."""
        if not event.is_directory and self.should_watch_file(event.src_path):
            self._handle_file_event("deleted", event.src_path)

    def on_moved(self, event) -> None:
        """Handle file move/rename events."""
        if not event.is_directory and self.should_watch_file(event.src_path):
            self._handle_file_event("moved", event.src_path)

    def _handle_file_event(self, event_type: str, file_path: str) -> None:
        """Handle file events with deduplication."""
        current_time = time.time()
        event_key = f"{event_type}_{file_path}"

        # Check if this is a duplicate event
        if event_key in self.last_events:
            if current_time - self.last_events[event_key] < self.event_cooldown:
                return

        self.last_events[event_key] = current_time

        # Clean up old events
        cutoff_time = current_time - 60  # Keep last minute
        self.last_events = {
            k: v for k, v in self.last_events.items() if v > cutoff_time
        }

        # Log the event
        self._log_file_event(event_type, file_path)

        # Trigger appropriate actions
        self._trigger_actions(event_type, file_path)

    def _log_file_event(self, event_type: str, file_path: str) -> None:
        """Log file event."""
        event_data = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "file_path": file_path,
            "file_size": os.path.getsize(file_path) if os.path.exists(file_path) else 0,
        }

        if EVENT_LOGGER:
            EVENT_LOGGER.log_event("file_change", event_data)
        else:
            print(f"File event: {event_type} - {file_path}")

    def _trigger_actions(self, event_type: str, file_path: str) -> None:
        """Trigger appropriate actions based on file event."""
        try:
            # Notify Slack for important changes
            if event_type in ["created", "modified"] and slack_proxy:
                file_name = os.path.basename(file_path)
                slack_proxy.notify_file_change(event_type, file_name, file_path)

            # Auto-patch for certain file types
            if event_type == "modified" and self._should_auto_patch(file_path):
                self._trigger_auto_patch(file_path)

            # Run tests for certain file types
            if event_type == "modified" and self._should_run_tests(file_path):
                self._trigger_test_run(file_path)

        except Exception as e:
            print(f"Error triggering actions for {file_path}: {e}")

    def _should_auto_patch(self, file_path: str) -> bool:
        """Check if file should trigger auto-patch."""
        return file_path.endswith((".py", ".js", ".ts", ".tsx"))

    def _should_run_tests(self, file_path: str) -> bool:
        """Check if file should trigger test run."""
        return "test" in file_path.lower() or file_path.endswith("_test.py")

    def _trigger_auto_patch(self, file_path: str) -> None:
        """Trigger auto-patch for file."""
        try:
            patch_data = {
                "id": f"auto-patch-{datetime.now().timestamp()}",
                "target_file": file_path,
                "patch": {
                    "pattern": "auto-patch-placeholder",
                    "replacement": "auto-patch-applied",
                },
                "metadata": {
                    "author": "file-watcher",
                    "source": "auto_patch",
                    "timestamp": datetime.now().isoformat(),
                },
            }

            # Import and apply patch
            from .patch_runner import apply_patch

            result = apply_patch(patch_data, dry_run=True)
            print(f"🔧 Auto-patch triggered for {file_path}: {result.get('success')}")

        except Exception as e:
            print(f"Error in auto-patch for {file_path}: {e}")

    def _trigger_test_run(self, file_path: str) -> None:
        """Trigger test run for file."""
        try:
            print(f"🧪 Test run triggered for {file_path}")
            # Add test execution logic here
        except Exception as e:
            print(f"Error in test run for {file_path}: {e}")


class SummaryWatcher:
    """Summary watcher for monitoring summary files."""

    def __init__(
        self, summary_directories: List[str], check_interval: int = 30
    ) -> None:
        self.summary_directories = summary_directories
        self.check_interval = check_interval
        self.running = False
        self.last_check = {}

    def start(self) -> None:
        """Start the summary watcher."""
        self.running = True
        print("📝 Summary Watcher started")

        while self.running:
            self._check_summaries()
            time.sleep(self.check_interval)

    def stop(self) -> None:
        """Stop the summary watcher."""
        self.running = False
        print("📝 Summary Watcher stopped")

    def _check_summaries(self) -> None:
        """Check for new summaries and post them."""
        for directory in self.summary_directories:
            try:
                if not os.path.exists(directory):
                    continue

                files = os.listdir(directory)
                summary_files = [
                    f for f in files if f.endswith(".md") and f.startswith("summary-")
                ]

                for summary_file in summary_files:
                    file_path = os.path.join(directory, summary_file)
                    file_mtime = os.path.getmtime(file_path)

                    # Check if this is a new or modified summary
                    if (
                        summary_file not in self.last_check
                        or self.last_check[summary_file] < file_mtime
                    ):
                        self._process_summary(file_path, summary_file)
                        self.last_check[summary_file] = file_mtime

            except Exception as e:
                print(f"Error checking summaries in {directory}: {e}")

    def _process_summary(self, file_path: str, filename: str) -> None:
        """Process a summary file."""
        try:
            print(f"📝 Processing summary: {filename}")
            # Add summary processing logic here
            # This could include posting to ChatGPT, Slack, etc.
        except Exception as e:
            print(f"Error processing summary {filename}: {e}")


def main() -> None:
    """Main entry point for summary watcher."""
    parser = argparse.ArgumentParser(description="Summary Watcher")
    parser.add_argument(
        "--summary-dirs",
        nargs="+",
        default=[
            "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries",
            "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries",
        ],
        help="Directories to watch for summaries",
    )
    parser.add_argument(
        "--check-interval",
        type=int,
        default=30,
        help="Check interval in seconds (default: 30)",
    )

    args = parser.parse_args()

    watcher = SummaryWatcher(args.summary_dirs, args.check_interval)

    try:
        watcher.start()
    except KeyboardInterrupt:
        watcher.stop()


if __name__ == "__main__":
    main()
