#!/usr/bin/env python3
"""
Summary Watcher Daemon
=====================

A proper daemon entry point for the summary watcher that monitors summary files
and posts them to ChatGPT threads.

Author: ThoughtPilot Team
Version: 1.0.0
"""

import os
import sys
import time
import logging
import argparse
import signal
from pathlib import Path
from typing import Set, Optional
from threading import Thread, Event

# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from gpt_cursor_runner.file_watcher import CursorFileHandler
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure all required modules are available")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/summary_watcher_daemon.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


class SummaryWatcherDaemon:
    """Summary Watcher Daemon for monitoring summary files."""

    def __init__(self, summaries_dir: str, check_interval: int = 30) -> None:
        """Initialize the daemon."""
        self.summaries_dir = summaries_dir
        self.check_interval = check_interval
        self.running = False
        self.stop_event = Event()

        # Ensure logs directory exists
        Path('logs').mkdir(exist_ok=True)

        logger.info("Summary Watcher Daemon initialized")

    def start(self) -> None:
        """Start the daemon."""
        self.running = True
        logger.info("Summary Watcher Daemon started")

        # Set up signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        # Start the main loop
        self._run_watcher()

    def stop(self) -> None:
        """Stop the daemon."""
        self.running = False
        self.stop_event.set()
        logger.info("Summary Watcher Daemon stopped")

    def _signal_handler(self, signum: int, frame) -> None:
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down...")
        self.stop()

    def _run_watcher(self) -> None:
        """Run the summary watcher in a separate thread."""
        try:
            # Initialize the file handler
            file_handler = CursorFileHandler(self.summaries_dir)
            logger.info("Summary watcher initialized successfully")

            # Main monitoring loop
            while self.running and not self.stop_event.is_set():
                try:
                    # Check for new summary files
                    self._check_summaries()
                    time.sleep(self.check_interval)
                except Exception as e:
                    logger.error(f"Error in watcher loop: {e}")
                    time.sleep(5)  # Brief pause on error

        except Exception as e:
            logger.error(f"Fatal error in watcher: {e}")
        finally:
            try:
                self.watcher.shutdown()
                logger.info("Summary watcher shutdown completed")
            except Exception as e:
                logger.error(f"Error during shutdown: {e}")

    def _check_summaries(self) -> None:
        """Check for new summary files and process them."""
        try:
            # This would contain the actual summary processing logic
            # For now, just log that we're checking
            logger.debug("Checking for new summary files...")
        except Exception as e:
            logger.error(f"Error checking summaries: {e}")

    def _restart_watcher(self) -> None:
        """Restart the watcher."""
        try:
            logger.info("Restarting summary watcher...")
            self.stop()
            time.sleep(1)
            self.start()
        except Exception as e:
            logger.error(f"Error restarting watcher: {e}")


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Summary Watcher Daemon")
    parser.add_argument(
        "--summaries-dir",
        default="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries",
        help="Directory to monitor for summary files"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=30,
        help="Check interval in seconds"
    )

    args = parser.parse_args()

    # Create and start daemon
    daemon = SummaryWatcherDaemon(args.summaries_dir, args.interval)

    try:
        daemon.start()
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    finally:
        daemon.stop()


if __name__ == "__main__":
    main() 