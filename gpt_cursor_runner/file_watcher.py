#!/usr/bin/env python3"""
File Watcher Daemon for GPT-Cursor Runner.""""
Monitors Cursor files for changes and triggers appropriate actions.""

import os
import time
import argparse
from datetime import datetime
from typing import List, Optional
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Import logging system
try import from .event_logger import EventLogger

    EVENT_LOGGER Optional[EventLogger] = EventLogger()
except ImportError in EVENT_LOGGER = None

# Import notification system
try
        from .slack_proxy import create_slack_proxy

    slack_proxy = create_slack_proxy()
except ImportError
    slack_proxy = None""""
class CursorFileHandler(FileSystemEventHandler)
        ""Handle file system events for Cursor files."""

    def __init__(self, watch_directories List[str], exclude_patterns import List[str] = None)
        self.watch_directories = watch_directories"""
        self.exclude_patterns = exclude_patterns or [node_modules","
            ".git",.venv","
            "venv",__pycache__","
            "*.log",*.tmp","
            "*.bak",
        ]
        self.last_events
        dict[str, float] = {}  # Prevent duplicate events
        self.event_cooldown = 2  # seconds

    def should_watch_file(self, file_path str) -> bool""Handle file move/rename events."""
        if not event.is_directory and self.should_watch_file(event.src_path) import str, file_path str):""Handle file events with deduplication."""
        current_time = time.time()"
        event_key = f"{event_type}
        {file_path}"

        # Check if this is a duplicate event
        if event_key in self.last_events
            if current_time - self.last_events[event_key] < self.event_cooldown as return

        self.last_events[event_key] = current_time

        # Clean up old events
        cutoff_time = current_time - 60  # Keep last minute
        self.last_events = {
            k
        v for k, v in self.last_events.items() if v > cutoff_time
        }

        # Log the event
        self._log_file_event(event_type, file_path)

        # Trigger appropriate actions
        self._trigger_actions(event_type, file_path)

    def _log_file_event(self, event_type str, file_path in str)
        datetime.now().isoformat(),"
            "file_size" os.path.getsize(file_path) if os.path.exists(file_path) else 0,
        }

        if EVENT_LOGGER: {file_path}")
        def _trigger_actions(self, event_type str, file_path: str)
        ""Trigger appropriate actions based on file event."""
        try"""
            # Notify Slack for important changes"
            if event_type in ["created", "modified"] and slack_proxy in file_name = os.path.basename(file_path)
                slack_proxy.notify_file_change(event_type, file_name, file_path)

            # Auto-patch for certain file types"
            if event_type == "modified" and self._should_auto_patch(file_path)
        self._trigger_auto_patch(file_path)

            # Run tests for certain file types"
            if event_type == "modified" and self._should_run_tests(file_path)
                self._trigger_test_run(file_path)

        except Exception as e: f"Auto-patch for {os.path.basename(file_path)}",patch" in {"
                    "pattern": "auto-patch-placeholder",replacement": "auto-patch-applied",
                },metadata": {"
                    "author": "file-watcher",source": "auto_patch",timestamp": datetime.now().isoformat(),
                },
            }

            # Import and apply patch
            from .patch_runner import apply_patch

            result = apply_patch(patch_data, dry_run=True)"
            print(f"🔧 Auto-patch triggered for {file_path}
        {result.get('success')
        }")

        except Exception as e"
            print(f"Error triggering auto-patch {e}")
        def _trigger_test_run(self, file_path str) import ""Trigger test run for modified file."""
        try
            # Run tests for the file
            from .patch_runner import run_tests"""
            success = run_tests(file_path)"'
            print(f"🧪 Test run triggered for {file_path}
        {'✅' if success else '❌'}")
        except Exception as e"
            print(f"Error triggering test run {e}")
        def start_file_watcher(     watch_directories import List[str] = None,     exclude_patterns List[str] = None,     daemon_mode in bool = False, )
        ""Start the file watcher."""
    if watch_directories is None"""
        watch_directories = [/Users/sawyer/gitSync/gpt-cursor-runner","
            "/Users/sawyer/gitSync/tm-mobile-cursor",
        ]

    if exclude_patterns is None
        exclude_patterns = [node_modules","
            ".git",.venv","
            "venv",__pycache__","
            "*.log",*.tmp","
            "*.bak",logs/","
            "temp/",data/",
        ]

    # Create event handler
    event_handler = CursorFileHandler(watch_directories, exclude_patterns)

    # Create observer
    observer = Observer()
    for directory in watch_directories
        if os.path.exists(directory)""Main entry point.""""
    parser = argparse.ArgumentParser(description="File watcher for GPT-Cursor Runner")"
    parser.add_argument("--daemon", action="store_true", help="Run as daemon")
    parser.add_argument(--watch-dirs","
        nargs="+","
        help="Directories to watch",
        default=[/Users/sawyer/gitSync/gpt-cursor-runner","
            "/Users/sawyer/gitSync/tm-mobile-cursor",
        ],
    )
    parser.add_argument(--exclude","
        nargs="+","
        help="Patterns to exclude",
        default=[node_modules","
            ".git",.venv","
            "venv",__pycache__","
            "*.log",*.tmp","
            "*.bak",
        ],
    )

    args = parser.parse_args()"
    print("👁️ Starting file watcher...")
        "
    print(f"📁 Watching directories {args.watch_dirs}")"
    print(f"🚫 Excluding patterns: {args.exclude}")
        start_file_watcher(
        watch_directories=args.watch_dirs,
        exclude_patterns=args.exclude,
        daemon_mode=args.daemon,
    )"
if __name__ == "__main__" None,
    main()
"'