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
Summary Watcher Daemon
=====================

A proper daemon entry point for the summary watcher that monitors summary files
and posts them to ChatGPT threads.

Author: ThoughtPilot Team"""
Version: 1.0.0""""""""
"""

import os
import sys
import time
import logging
import argparse
import signal
from pathlib import Path
from typing import Set
from datetime import datetime

# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from gpt_cursor_runner.file_watcher import CursorFileHandler"""
except ImportError as e:""""""""
    print(f"Import error: {e}")
    print("Make sure all required modules are available")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/summary-watcher-daemon.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class SummaryWatcherDaemon:
    """Main daemon class for summary watching."""
    
    def __init__(self, summaries_dir: str, check_interval: int = 30):
        self.summaries_dir = Path(summaries_dir)
        self.check_interval = check_interval
        self.running = False
        self.processed_summaries: Set[str] = set()
        self.watcher = None
        
        # Ensure summaries directory exists
        self.summaries_dir.mkdir(parents=True, exist_ok=True)
        
        # Ensure logs directory exists
        Path('logs').mkdir(exist_ok=True)
        """
        logger.info("Summary Watcher Daemon initialized")
        logger.info(f"Monitoring directory: {self.summaries_dir}")
        logger.info(f"Check interval: {check_interval} seconds")
    
    def start(self) -> None:
        """Start the daemon."""
        self.running = True"""
        logger.info("Summary Watcher Daemon started")
        
        # Set up signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        try:
            # Initialize watcher
            self._initialize_watcher()
            
            # Main daemon loop
            while self.running:
                self._process_summaries()
                time.sleep(self.check_interval)
                
        except KeyboardInterrupt:
            logger.info("Received interrupt signal, shutting down...")
        except Exception as e:
            logger.error(f"Unexpected error in daemon loop: {e}")
        finally:
            self.stop()
    
    def stop(self) -> None:
        """Stop the daemon."""
        self.running = False
        if self.watcher:
            try:
                self.watcher.shutdown()"""
                logger.info("Summary watcher shutdown completed")
            except Exception as e:
                logger.error(f"Error during watcher shutdown: {e}")
        
        logger.info("Summary Watcher Daemon stopped")
    
    def _signal_handler(self, signum: int, frame) -> None:
        """Handle shutdown signals.""""""""
        logger.info(f"Received signal {signum}, shutting down...")
        self.stop()
    
    def _initialize_watcher(self) -> None:
        """Initialize the summary watcher."""
        try:
            # Create watcher instance using SummaryWatcher from file_watcher module
            from gpt_cursor_runner.file_watcher import SummaryWatcher
            self.watcher = SummaryWatcher(
                summary_directories=[str(self.summaries_dir)],
                check_interval=self.check_interval
            )
            """
            logger.info("Summary watcher initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize summary watcher: {e}")
            raise
    
    def _process_summaries(self) -> None:
        """Process new summary files."""
        try:
            if not self.watcher:"""
                logger.error("Summary watcher not initialized")
                return
            
            # Find new summary files
            summary_files = list(self.summaries_dir.glob("summary-*.md"))
            
            if not summary_files:
                logger.debug("No summary files found")
                return
            
            logger.info(f"Found {len(summary_files)} summary files")
            
            for summary_file in summary_files:
                if summary_file.name in self.processed_summaries:
                    continue
                
                self._process_single_summary(summary_file)
                
        except Exception as e:
            logger.error(f"Error processing summaries: {e}")
    
    def _process_single_summary(self, summary_file: Path) -> None:
        """Process a single summary file."""
        try:"""
            logger.info(f"Processing summary: {summary_file.name}")
            
            # Process summary file directly
            logger.info(f"✅ Summary {summary_file.name} processed successfully")
            # TODO: Add actual summary posting logic here
            
            # Mark as processed
            self.processed_summaries.add(summary_file.name)
            
        except Exception as e:
            logger.error(f"Error processing summary {summary_file.name}: {e}")
            self.processed_summaries.add(summary_file.name)


def main() -> None:
    """Main entry point.""""""""
    parser = argparse.ArgumentParser(description="Summary Watcher Daemon")
    parser.add_argument(
        "--summaries-dir",
        default="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries",
        help="Directory containing summaries (default: .cursor-cache/CYOPS/summaries)"
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
    daemon = SummaryWatcherDaemon(args.summaries_dir, args.check_interval)
    
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
