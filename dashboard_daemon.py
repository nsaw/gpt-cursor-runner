#!/usr/bin/env python3
"""
Dashboard Daemon
===============

A daemon for managing the dashboard application with system monitoring and management capabilities.

Author: ThoughtPilot Team
Version: 1.0.0
"""

import os
import sys
import time
import logging
import argparse
import signal
import threading
from pathlib import Path
from typing import Optional

# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from gpt_cursor_runner.dashboard import create_dashboard_routes
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure all required modules are available")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/dashboard_daemon.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


class DashboardDaemon:
    """Main daemon class for dashboard management."""

    def __init__(self, port: int = 3002, host: str = "localhost") -> None:
        """Initialize the dashboard daemon."""
        self.port = port
        self.host = host
        self.running = False
        self.app = None
        self.server_thread = None

        # Ensure logs directory exists
        Path('logs').mkdir(exist_ok=True)

        logger.info("Dashboard Daemon initialized")

    def start(self) -> None:
        """Start the dashboard daemon."""
        self.running = True
        logger.info("Dashboard Daemon started")

        # Set up signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        # Initialize dashboard
        self._initialize_dashboard()

        # Start the dashboard server
        self._run_dashboard()

    def stop(self) -> None:
        """Stop the dashboard daemon."""
        self.running = False
        logger.info("Dashboard Daemon stopping...")

        if self.app:
            try:
                self.dashboard.shutdown()
                logger.info("Dashboard shutdown completed")
            except Exception as e:
                logger.error(f"Error during dashboard shutdown: {e}")

        logger.info("Dashboard Daemon stopped")

    def _signal_handler(self, signum: int, frame) -> None:
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down...")
        self.stop()

    def _initialize_dashboard(self) -> None:
        """Initialize the dashboard application."""
        try:
            # Import Flask or similar web framework
            from flask import Flask

            self.app = Flask(__name__)
            create_dashboard_routes(self.app)
            logger.info("Dashboard initialized successfully")

        except ImportError as e:
            logger.error(f"Failed to import Flask: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize dashboard: {e}")
            raise

    def _run_dashboard(self) -> None:
        """Run the dashboard in a separate thread."""
        try:
            logger.info(f"Starting dashboard on {self.host}:{self.port}")

            if self.app:
                self.app.run(
                    host=self.host,
                    port=self.port,
                    debug=False,
                    use_reloader=False
                )

        except Exception as e:
            logger.error(f"Error running dashboard: {e}")
            raise

    def health_check(self) -> bool:
        """Perform a health check on the dashboard."""
        try:
            # Simple health check - if app exists, consider it healthy
            if hasattr(self, 'app') and self.app:
                logger.debug("Dashboard health check: OK")
                return True
            else:
                logger.warning("Dashboard health check: App not initialized")
                return False
        except Exception as e:
            logger.error(f"Dashboard health check failed: {e}")
            return False

    def _restart_dashboard(self) -> None:
        """Restart the dashboard."""
        try:
            logger.info("Restarting dashboard...")
            self.stop()
            time.sleep(1)
            self.start()
        except Exception as e:
            logger.error(f"Error restarting dashboard: {e}")


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Dashboard Daemon")
    parser.add_argument(
        "--host",
        default="localhost",
        help="Host to bind the dashboard to"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=3002,
        help="Port to bind the dashboard to"
    )

    args = parser.parse_args()

    # Create and start daemon
    daemon = DashboardDaemon(port=args.port, host=args.host)

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
