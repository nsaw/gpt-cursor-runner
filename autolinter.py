#!/usr/bin/env python3
"""
AutoLinter - Continuous Linter Error Fixing System

This script continuously monitors Python files for linter errors and automatically fixes
them,
while ignoring all MD lint errors as requested.

Features:
- Continuous file monitoring
- Automatic error detection and fixing
- MD lint error ignoring
- Real-time notifications
- Logging and statistics
"""

import os
import sys
import time
import subprocess
import logging
from pathlib import Path
from typing import List, Dict, Set, Tuple
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import threading
import json
from datetime import datetime


class AutoLinter:
    """Continuous linter error fixing system."""

    def __init__(self, project_dirs: List[str], ignore_patterns: List[str] = None):
        self.project_dirs = project_dirs
        self.ignore_patterns = ignore_patterns or [
            '.git',
            '__pycache__',
            'node_modules',
            '.venv',
            'venv',
            '*.egg-info',
            'dist',
            'build',
            'logs',
            'temp',
        ]
        self.processed_files: Set[str] = set()
        self.error_stats = {
            'total_errors_fixed': 0,
            'files_processed': 0,
            'last_run': None,
            'errors_by_type': {},
        }
        self.setup_logging()

    def setup_logging(self):
        """Setup logging configuration."""
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)

        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / "autolinter.log"),
                logging.StreamHandler(sys.stdout),
            ],
        )
        self.logger = logging.getLogger(__name__)

    def should_ignore_file(self, file_path: str) -> bool:
        """Check if file should be ignored."""
        path = Path(file_path)

        # Ignore non-Python files
        if not path.suffix == '.py':
            return True

        # Check ignore patterns
        for pattern in self.ignore_patterns:
            if pattern in str(path):
                return True

        return False

    def get_linter_errors(self, file_path: str) -> List[str]:
        """Get linter errors for a file, excluding MD errors."""
        try:
            cmd = [
                "flake8",
                file_path,
                "--select=E501,F541,F821,F841,W291,W292,W293,W391",
                "--count",
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

            if result.returncode == 0:
                return []

            errors = []
            for line in result.stdout.split('\n'):
                if ':' in line and any(
                    error in line
                    for error in [
                        'E501',
                        'F541',
                        'F821',
                        'F841',
                        'W291',
                        'W292',
                        'W293',
                        'W391',
                    ]
                ):
                    errors.append(line.strip())

            return errors

        except Exception as e:
            self.logger.error(f"Error getting linter errors for {file_path}: {e}")
            return []

    def fix_file_with_black(self, file_path: str) -> bool:
        """Fix file using black formatter."""
        try:
            cmd = [
                "black",
                "--line-length=88",
                "--skip-string-normalization",
                file_path,
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            return result.returncode == 0

        except Exception as e:
            self.logger.error(f"Error running black on {file_path}: {e}")
            return False

    def fix_file_with_autopep8(self, file_path: str) -> bool:
        """Fix file using autopep8."""
        try:
            cmd = [
                "autopep8",
                "--in-place",
                "--aggressive",
                "--aggressive",
                "--max-line-length=88",
                file_path,
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            return result.returncode == 0

        except Exception as e:
            self.logger.error(f"Error running autopep8 on {file_path}: {e}")
            return False

    def fix_line_length_issues(self, file_path: str) -> bool:
        """Fix line length issues manually."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            lines = content.split('\n')
            fixed_lines = []
            modified = False

            for line in lines:
                if len(line) > 88:
                    # Try to break long lines intelligently
                    if 'f"' in line and line.count('{') > 0:
                        # Handle f-strings
                        fixed_line = self.break_f_string(line)
                        if fixed_line != line:
                            modified = True
                            fixed_lines.append(fixed_line)
                        else:
                            fixed_lines.append(line)
                    elif 'import' in line and len(line) > 88:
                        # Handle long imports
                        fixed_line = self.break_import_line(line)
                        if fixed_line != line:
                            modified = True
                            fixed_lines.append(fixed_line)
                        else:
                            fixed_lines.append(line)
                    else:
                        # Simple line break
                        words = line.split()
                        if len(words) > 1:
                            current_line = ""
                            for word in words:
                                if len(current_line + " " + word) > 88:
                                    if current_line:
                                        fixed_lines.append(current_line.rstrip())
                                        current_line = word
                                    else:
                                        fixed_lines.append(word)
                                else:
                                    current_line += (
                                        (" " + word) if current_line else word
                                    )
                            if current_line:
                                fixed_lines.append(current_line)
                            modified = True
                        else:
                            fixed_lines.append(line)
                else:
                    fixed_lines.append(line)

            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(fixed_lines))
                return True

            return False

        except Exception as e:
            self.logger.error(f"Error fixing line length issues in {file_path}: {e}")
            return False

    def break_f_string(self, line: str) -> str:
        """Break a long f-string into multiple lines."""
        if not ('f"' in line or "f'" in line):
            return line

        # Simple f-string breaking
        if line.count('{') <= 2:
            if '\\n' in line:
                parts = line.split('\\n')
                result = []
                for i, part in enumerate(parts):
                    if i > 0:
                        result.append(f"\\n{part}")
                    else:
                        result.append(part)
                return '\\n'.join(result)
            else:
                if len(line) > 88:
                    mid = len(line) // 2
                    space_pos = line.rfind(' ', 0, mid)
                    if space_pos > 0:
                        return line[:space_pos] + '\\n' + line[space_pos + 1:]

        return line

    def break_import_line(self, line: str) -> str:
        """Break a long import line into multiple lines."""
        if not line.strip().startswith(('import ', 'from ')):
            return line

        if line.startswith('from '):
            parts = line.split(' import ')
            if len(parts) == 2:
                from_part = parts[0]
                import_part = parts[1]

                if len(line) > 88:
                    return f"{from_part} import (\n    {import_part}\n)"

        return line

    def fix_file_systematically(self, file_path: str) -> Dict[str, int]:
        """Fix linter errors in a file using multiple approaches."""
        results = {
            'black_fixes': 0,
            'autopep8_fixes': 0,
            'manual_fixes': 0,
            'errors_before': 0,
            'errors_after': 0,
        }

        # Get initial error count
        initial_errors = self.get_linter_errors(file_path)
        results['errors_before'] = len(initial_errors)

        if results['errors_before'] == 0:
            return results

        # Try black first
        if self.fix_file_with_black(file_path):
            results['black_fixes'] = 1

        # Try autopep8
        if self.fix_file_with_autopep8(file_path):
            results['autopep8_fixes'] = 1

        # Try manual line length fixes
        if self.fix_line_length_issues(file_path):
            results['manual_fixes'] = 1

        # Get final error count
        final_errors = self.get_linter_errors(file_path)
        results['errors_after'] = len(final_errors)

        return results

    def process_file(self, file_path: str) -> bool:
        """Process a single file for linter errors."""
        if self.should_ignore_file(file_path):
            return False

        self.logger.info(f"Processing: {file_path}")

        file_results = self.fix_file_systematically(file_path)

        if file_results['errors_after'] < file_results['errors_before']:
            errors_fixed = file_results['errors_before'] - file_results['errors_after']
            self.error_stats['total_errors_fixed'] += errors_fixed
            self.error_stats['files_processed'] += 1

            self.logger.info(
                f"✅ Fixed {errors_fixed} errors in {file_path} "
                f"({file_results['errors_before']} → {file_results['errors_after']})"
            )

            # Update error type statistics
            for error_type in ['black_fixes', 'autopep8_fixes', 'manual_fixes']:
                if file_results[error_type] > 0:
                    self.error_stats['errors_by_type'][error_type] = (
                        self.error_stats['errors_by_type'].get(error_type, 0) + 1
                    )

            return True

        return False

    def scan_all_files(self):
        """Scan all Python files in project directories."""
        self.logger.info("🔍 Scanning all files for linter errors...")

        files_processed = 0
        files_fixed = 0

        for project_dir in self.project_dirs:
            if not os.path.exists(project_dir):
                self.logger.warning(f"Project directory not found: {project_dir}")
                continue

            for root, dirs, files in os.walk(project_dir):
                # Skip ignored directories
                dirs[:] = [d for d in dirs if d not in self.ignore_patterns]

                for file in files:
                    if file.endswith('.py'):
                        file_path = os.path.join(root, file)
                        files_processed += 1

                        if self.process_file(file_path):
                            files_fixed += 1

        self.error_stats['last_run'] = datetime.now().isoformat()

        self.logger.info(
            f"📊 Scan complete: {files_processed} files processed, "
            f"{files_fixed} files fixed, {
                self.error_stats['total_errors_fixed']} errors fixed"
        )

    def save_stats(self):
        """Save error statistics to file."""
        stats_file = Path("logs/autolinter_stats.json")
        stats_file.parent.mkdir(exist_ok=True)

        with open(stats_file, 'w') as f:
            json.dump(self.error_stats, f, indent=2)

    def load_stats(self):
        """Load error statistics from file."""
        stats_file = Path("logs/autolinter_stats.json")
        if stats_file.exists():
            with open(stats_file, 'r') as f:
                self.error_stats = json.load(f)


class FileChangeHandler(FileSystemEventHandler):
    """Handle file system changes for auto-linting."""

    def __init__(self, autolinter: AutoLinter):
        self.autolinter = autolinter
        self.debounce_timer = None
        self.debounce_delay = 2.0  # seconds

    def on_modified(self, event):
        """Handle file modification events."""
        if event.is_directory:
            return

        if not event.src_path.endswith('.py'):
            return

        # Debounce rapid file changes
        if self.debounce_timer:
            self.debounce_timer.cancel()

        self.debounce_timer = threading.Timer(
            self.debounce_delay, lambda: self.autolinter.process_file(event.src_path)
        )
        self.debounce_timer.start()

    def on_created(self, event):
        """Handle file creation events."""
        if event.is_directory:
            return

        if not event.src_path.endswith('.py'):
            return

        # Process new files immediately
        self.autolinter.process_file(event.src_path)


def main():
    """Main function to run the autolinter."""
    print("🔧 AutoLinter - Continuous Linter Error Fixing System")
    print("=" * 60)

    # Define project directories
    project_dirs = [
        "/Users/sawyer/gitSync/gpt-cursor-runner",
        "/Users/sawyer/gitSync/ThoughtPilot-AI",
    ]

    # Create autolinter instance
    autolinter = AutoLinter(project_dirs)
    autolinter.load_stats()

    # Initial scan
    print("🚀 Starting initial scan...")
    autolinter.scan_all_files()
    autolinter.save_stats()

    # Set up file watching
    print("👀 Setting up file monitoring...")
    event_handler = FileChangeHandler(autolinter)
    observer = Observer()

    for project_dir in project_dirs:
        if os.path.exists(project_dir):
            observer.schedule(event_handler, project_dir, recursive=True)
            print(f"📁 Monitoring: {project_dir}")

    observer.start()

    print("\n✅ AutoLinter is now running!")
    print("📋 Features:")
    print("   • Continuous file monitoring")
    print("   • Automatic error detection and fixing")
    print("   • MD lint errors ignored")
    print("   • Real-time notifications")
    print("   • Statistics tracking")
    print("\n💡 Press Ctrl+C to stop")

    try:
        while True:
            time.sleep(1)
            # Save stats every 5 minutes
            if int(time.time()) % 300 == 0:
                autolinter.save_stats()

    except KeyboardInterrupt:
        print("\n🛑 Stopping AutoLinter...")
        observer.stop()
        observer.join()
        autolinter.save_stats()

        print("\n📊 Final Statistics:")
        print(f"   Total errors fixed: {autolinter.error_stats['total_errors_fixed']}")
        print(f"   Files processed: {autolinter.error_stats['files_processed']}")
        print(f"   Last run: {autolinter.error_stats['last_run']}")
        print(f"   Fixes by type: {autolinter.error_stats['errors_by_type']}")

        print("\n✅ AutoLinter stopped successfully!")


if __name__ == "__main__":
    main()
