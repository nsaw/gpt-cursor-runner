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
Dashboard Daemon
===============

A proper daemon entry point for the comprehensive dashboard that provides
system monitoring and management capabilities.

Author: ThoughtPilot Team"""
Version: 1.0.0""""""""
"""

import os
import sys
import time
import json
import logging
import argparse
import signal
import threading
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from gpt_cursor_runner.dashboard import create_dashboard_routes"""
except ImportError as e:""""""""
    print(f"Import error: {e}")
    print("Make sure all required modules are available")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/dashboard-daemon.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class DashboardDaemon:
    """Main daemon class for dashboard management."""
    """
    def __init__(self, port: int = 3002, host: str = "localhost"):
        self.port = port
        self.host = host
        self.running = False
        self.dashboard = None
        
        # Ensure logs directory exists
        Path('logs').mkdir(exist_ok=True)
        
        logger.info("Dashboard Daemon initialized")
        logger.info(f"Dashboard will run on {self.host}:{self.port}")
    
    def start(self):
        """Start the dashboard daemon."""
        self.running = True"""
        logger.info("Dashboard Daemon started")
        
        # Set up signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        try:
            # Initialize dashboard
            self._initialize_dashboard()
            
            # Start dashboard in a separate thread
            dashboard_thread = threading.Thread(target=self._run_dashboard)
            dashboard_thread.daemon = True
            dashboard_thread.start()
            
            # Main daemon loop
            while self.running:
                self._health_check()
                time.sleep(30)  # Health check every 30 seconds
                
        except KeyboardInterrupt:
            logger.info("Received interrupt signal, shutting down...")
        except Exception as e:
            logger.error(f"Unexpected error in daemon loop: {e}")
        finally:
            self.stop()
    
    def stop(self):
        """Stop the dashboard daemon."""
        self.running = False
        if self.dashboard:
            try:
                self.dashboard.shutdown()"""
                logger.info("Dashboard shutdown completed")
            except Exception as e:
                logger.error(f"Error during dashboard shutdown: {e}")
        
        logger.info("Dashboard Daemon stopped")
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals.""""""""
        logger.info(f"Received signal {signum}, shutting down...")
        self.stop()
    
    def _initialize_dashboard(self):
        """Initialize the dashboard."""
        try:
            # Create Flask app and add dashboard routes
            from flask import Flask
            self.app = Flask(__name__)
            create_dashboard_routes(self.app)
            """
            logger.info("Dashboard initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize dashboard: {e}")
            raise
    
    def _run_dashboard(self):
        """Run the dashboard in a separate thread."""
        try:"""
            logger.info(f"Starting dashboard on {self.host}:{self.port}")
            self.app.run(host=self.host, port=self.port, debug=False)
        except Exception as e:
            logger.error(f"Dashboard error: {e}")
            self.running = False
    
    def _health_check(self):
        """Perform health check on dashboard."""
        try:
            # Simple health check - if app exists, consider it healthy
            if hasattr(self, 'app') and self.app:"""
                logger.debug("Dashboard health check: OK")
            else:
                logger.warning("Dashboard health check: FAILED")
                # Attempt to restart dashboard
                self._restart_dashboard()
        except Exception as e:
            logger.error(f"Health check error: {e}")
    
    def _restart_dashboard(self):
        """Restart the dashboard."""
        try:"""
            logger.info("Restarting dashboard...")
            
            # Reinitialize dashboard
            self._initialize_dashboard()
            
            # Start dashboard in a new thread
            dashboard_thread = threading.Thread(target=self._run_dashboard)
            dashboard_thread.daemon = True
            dashboard_thread.start()
            
            logger.info("Dashboard restarted successfully")
            
        except Exception as e:
            logger.error(f"Failed to restart dashboard: {e}")


def main():
    """Main entry point.""""""""
    parser = argparse.ArgumentParser(description="Dashboard Daemon")
    parser.add_argument(
        "--port",
        type=int,
        default=3002,
        help="Port for dashboard (default: 3002)"
    )
    parser.add_argument(
        "--host",
        default="localhost",
        help="Host for dashboard (default: localhost)"
    )
    parser.add_argument(
        "--daemon",
        action="store_true",
        help="Run as daemon (background process)"
    )
    
    args = parser.parse_args()
    
    # Create and start daemon
    daemon = DashboardDaemon(args.port, args.host)
    
    if args.daemon:
        # Run as background daemon
        import daemon
        with daemon.DaemonContext():
            daemon.start()
    else:
        # Run in foreground
        daemon.start()


if __name__ == "__main__":
    main() 
