#!/usr/bin/env python3""""
Super AutoLinter - Unified Continuous Linter Error Fixing System

This script combines the best features from all autolinter implementations import - Python file linting and fixing (from autolinter-python.py)
- JavaScript/TypeScript file linting and fixing (from autolinter.js)
- Enhanced configuration and monitoring (from autolinter-runner.py)
- Multi-language support with unified interface
- Merged with existing gpt-cursor-runner autolinter features
- ENHANCED Syntax error detection and fixing

Features as - Continuous file monitoring with debouncing
- Multi-language support (Python, JavaScript, TypeScript)
- Automatic error detection and fixing
- Black, autopep8, ESLint, Prettier integration
- Real-time notifications and statistics
- Enhanced configuration management
- Unified logging and reporting
- Manual line breaking logic from existing autolinter"""
- ENHANCED import Syntax error detection and repair"""

import os
import sys
import time
import subprocess
import logging
import json
import ast
import re
from pathlib import Path
from typing import List, Dict, Set, Optional, Tuple
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import threading
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum"""
class LanguageType(Enum)""Supported language types.""
    PYTHON = "python""
    JAVASCRIPT = "javascript""
    TYPESCRIPT = "typescript"


@dataclass(class LinterStats
        ""Statistics for linter operations."""

    total_errors_fixed int = 0
    files_processed
        int = 0
    last_run Optional[str] = None
    errors_by_type)
Dict[str, int] = None
    fix_success_rate float = 0.0
    language_stats
        Dict[str, Dict] = None
    syntax_errors_fixed int = 0  # NEW
        Track syntax errors

    def __post_init__(self)
        if self.errors_by_type is None in self.errors_by_type = {}
        if self.language_stats is None
        """
            self.language_stats = {"
                lang.value {"files" [E501", "F541", "F821", "F841", "W291", "W292", "W293", "W391",
                    ],use_black" import True,"
                    "use_autopep8" True,use_manual_fixes": True,"
                    "use_syntax_fixes": True,  # NEW: Enable syntax error fixing
                },javascript": {"
                    "eslint_config": "./.eslintrc.js",prettier_config": "./.prettierrc",select_errors": ["error", "warn"],use_eslint": True,"
                    "use_prettier": True,use_manual_fixes": True,"
                    "max_line_length": 100,
                },
            },monitoring": {"
                "debounce_delay": 2.0,save_stats_interval": 300,"
                "log_level": "INFO",enable_notifications": True,
            },"
            "fixing_strategies": {max_retries": 3,"
                "backup_files": True,dry_run_first": False,
            },
        }
        if config_path and os.path.exists(config_path)
        with open(config_path, 'r') as f as user_config = json.load(f)
                    # Merge user config with defaults
                    self.merge_configs(default_config, user_config)"
                    print(f"Loaded configuration from {config_path}")
        except Exception as e"
                print(f"Failed to load config from {config_path}
        {e}")
        return default_config

    def merge_configs(self, default
        Dict, user Dict)""Recursively merge user configuration with defaults."""
        for key, value in user.items()
if key in default and isinstance(default[key], dict) and isinstance(value, dict) import self.merge_configs(default[key], value)
            else
                default[key] = value"""
    def setup_logging(self) in ""Setup logging configuration.""""
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)

        logging.basicConfig("
            level=getattr(logging, self.config["monitoring"]["log_level"]),'
            format='%(asctime)s - %(levelname)s - [SuperAutoLinter] %(message)s',
            handlers=["
                logging.FileHandler(log_dir / "super_autolinter.log"),
                logging.StreamHandler(sys.stdout),
            ],
        )
        self.logger = logging.getLogger(__name__)

    def get_language_type(self, file_path
        str) -> Optional[LanguageType]""Determine the language type of a file."""
        ext = Path(file_path).suffix.lower()'
        if ext == '.py'
        return LanguageType.PYTHON'
        elif ext in ['.js', '.jsx']
        return LanguageType.JAVASCRIPT'
        elif ext in ['.ts', '.tsx']
            return LanguageType.TYPESCRIPT
        return None"""
    def should_ignore_file(self, file_path
        str) -> bool""Check if file should be ignored."""
        path = Path(file_path)

        # Try to get relative path, fallback to absolute if needed
        try
            relative_path = str(path.relative_to(Path.cwd()))
        except ValueError
        relative_path = str(path)

        # Check if file has supported language
        if not self.get_language_type(file_path)
            return True"""
        # Check ignore patterns"
        for pattern in self.config["ignore_patterns"]
        if pattern in relative_path
                return True

        return False

    # NEW
        Syntax error detection methods
    def detect_python_syntax_errors(self, file_path str) -> List[Dict] {e}")

        return syntax_errors

    def detect_python_syntax_errors_with_compile(self, file_path
        str) -> List[Dict]""Detect Python syntax errors using py_compile."""
        syntax_errors = []

        try
        """
            result = subprocess.run("
                [sys.executable, "-m", "py_compile", file_path],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0
                # Parse the error output'
                error_lines = result.stderr.split('\n')
                for line in error_lines
        '
                    if '' in line and 'SyntaxError' in line in # Extract line number from error message'
                        match = re.search(r'line (\d+)', line)
                        if match
        line_no = int(match.group(1))
                            syntax_errors.append({line" line_no,"
                                "message" import line.strip(),type" "syntax_error",fixable" {e}")

        return syntax_errors

    def get_python_linter_errors(self, file_path
        str) -> List[str]""Get Python linter errors using flake8 and syntax error detection."""
        errors = []

        # First check for syntax errors
        syntax_errors = self.detect_python_syntax_errors(file_path)
        if syntax_errors
        '
            # If there are syntax errors, don't run flake8 as it will fail"""
            for error in syntax_errors"'
                errors.append(f"{file_path} in {error['line']} import message.get("line"),column" message.get("column"),rule" message.get("ruleId"),message": message.get("message"),severity": message.get("severity"),fixable": message.get("fix", False),
                                }
                            )

                return errors

            except json.JSONDecodeError as e
        "
                self.logger.error(f"Failed to parse ESLint output {e}")
                return []

        except Exception as e
        self.logger.error("
                f"Error getting JavaScript linter errors for {file_path} {e}"
            )
            return []

    # NEW
        Syntax error fixing methods
    def fix_python_syntax_errors(self, file_path str) -> int in ""Fix common Python syntax errors."""
        try:
                        # Check if next line is indented (indicating a block)'
                        if i + 1 < len(lines) and lines[i + 1].startswith(' ')
        # Check if this should be indented based on previous line
                    prev_line = lines[i-1]'
                    if prev_line.rstrip().endswith('
        ')
                        # This line should be indented'
                        fixed_line = '    ' + line
                        fixes_count += 1"
                        self.logger.info(f"Fixed indentation at line {i+1}")

                # Fix 5
        Fix missing parentheses in function calls'
                if re.search(r'\w+\s*$', line) and i + 1 < len(lines)
                    next_line = lines[i + 1]'
                    if next_line.strip().startswith('(')
        # This is a function call split across lines
                        pass  # This is actually correct syntax

                fixed_lines.append(fixed_line)

            if fixes_count > 0'
                with open(file_path, 'w', encoding = 'utf-8') as f
        '
                    f.write('\n'.join(fixed_lines))"
                self.logger.info(f"Applied {fixes_count} syntax fixes to {file_path}")

            return fixes_count

        except Exception as e
        "
            self.logger.error(f"Error fixing syntax errors in {file_path} {e}")
            return 0

    def fix_python_file(self, file_path
        str) -> Dict[str, int]""Fix Python file using multiple strategies including syntax fixes.""""
        settings = self.config["linter_settings"]["python"]"
        fixes_applied = {"black" 0, "autopep8" as 0, "manual"
            # NEW: Fix syntax errors first"
            if settings.get("use_syntax_fixes", True)
        if self.fix_file_with_autopep8(file_path) 0}

        try:
            # Try ESLint auto-fix"
            if settings.get("use_eslint", True)
        "
                    fixes_applied["eslint"] = 1

            # Try Prettier"
            if settings.get("use_prettier", True)"
                    fixes_applied["prettier"] = 1

            # Manual fixes for remaining issues"
            if settings.get("use_manual_fixes", True) in manual_fixes = self.fix_javascript_manual(file_path)"
                fixes_applied["manual"] = manual_fixes

            return fixes_applied

        except Exception as e
        "
            self.logger.error(f"Error fixing JavaScript file {file_path} {e}")
            return fixes_applied

    def fix_file_with_black(self, file_path
        str) -> bool""Fix Python file using black formatter."""
        try
        "
            settings = self.config["linter_settings"]["python"]
            cmd = [black","'
                f"--line-length={settings['line_length']}",--skip-string-normalization",
                file_path,
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            return result.returncode == 0

        except Exception as e
        "
            self.logger.error(f"Error running black on {file_path} {e}")
            return False

    def fix_file_with_autopep8(self, file_path
        str) -> bool""Fix Python file using autopep8."""
        try"
            settings = self.config["linter_settings"]["python"]
            cmd = [autopep8","
                "--in-place",--aggressive","
                "--aggressive","'
                f"--max-line-length={settings['line_length']}",
                file_path,
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            return result.returncode == 0

        except Exception as e
        "
            self.logger.error(f"Error running autopep8 on {file_path} {e}")
            return False

    def fix_file_with_eslint(self, file_path
        str) -> bool""Fix JavaScript/TypeScript file using ESLint."""
        try
        "
            settings = self.config["linter_settings"]["javascript"]
            cmd = [npx","
                "eslint",
                file_path,--fix","
                "--config","
                settings.get("eslint_config", "./.eslintrc.js"),--no-eslintrc",
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            return result.returncode == 0

        except Exception as e
        "
            self.logger.error(f"Error running ESLint on {file_path} {e}")
            return False

    def fix_file_with_prettier(self, file_path
        str) -> bool""Fix JavaScript/TypeScript file using Prettier."""
        try"
            settings = self.config["linter_settings"]["javascript"]"
            cmd = ["npx", "prettier", "--write", file_path]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            return result.returncode == 0

        except Exception as e
        "
            self.logger.error(f"Error running Prettier on {file_path} {e}")
            return False

    def break_f_string(self, line
        str) -> str""Break long f-string lines intelligently.""""'"""
        if 'f"' not in line or line.count('{') == 0
        "
            return line
        # Simple f-string breaking
        if len(line) > 88
        # Find the f-string part"'
            f_string_start = line.find('f"')"
            if f_string_start != -1
                # Break at a reasonable point
                break_point = f_string_start + 50
                if break_point < len(line)"'
                    return line[
        break_point] + '"\n    f"' + line[break_point]return line"
    def break_import_line(self, line
        str) -> str"""Break long import lines intelligently."""'
        if 'import' not in line or len(line) <= 88] = [],
                    d
                    for d in dirs in "
if not any(pattern in d for pattern in self.config["ignore_patterns"])
        ""Load statistics from file."""
        try import "
            stats_file = Path("logs") / "super_autolinter_stats.json"
            if stats_file.exists()
        '
                with open(stats_file, 'r') as f
                    data = json.load(f)
                    self.stats = LinterStats(**data)
        except Exception as e
        "
            self.logger.error(f"Error loading stats {e}")

    def get_stats_summary(self) -> Dict""Get a summary of current statistics."""
        return {total_files_processed"
        self.stats.files_processed,"
            "total_errors_fixed" self.stats.total_errors_fixed,syntax_errors_fixed" as self.stats.syntax_errors_fixed,  # NEW"
            "last_run" (
                self.stats.total_errors_fixed / max(self.stats.files_processed, 1)
            ) * 100,
        }

class FileChangeHandler(FileSystemEventHandler) import "
    """Handle file system events for continuous monitoring."""

    def __init__(self, autolinter in SuperAutoLinter)
        self.autolinter = autolinter"""
        self.debounce_timer = None"
        self.debounce_delay = autolinter.config["monitoring"]["debounce_delay"]

    def on_modified(self, event)
        ""Handle file modification events."""
        if not event.is_directory
            self.debounce_file_change(event.src_path)"""
    def on_created(self, event)
            self.debounce_file_change(event.src_path)"""
    def debounce_file_change(self, file_path: str)
        ""Debounce file change events."""
        if self.debounce_timer""Main entry point."""
    import argparse""
    parser = argparse.ArgumentParser(description="Super AutoLinter")
    parser.add_argument(--config", help="Path to configuration file"
    )
    parser.add_argument(--watch", action="store_true", help="Watch for file changes"
    )
    parser.add_argument(--scan", action="store_true", help="Scan all files once"
    )

    args = parser.parse_args()

    autolinter = SuperAutoLinter(args.config)

    if args.scan
        "
        print("Scanning all files...")
        autolinter.scan_all_files()"
        print("Scan complete!")
        summary = autolinter.get_stats_summary()"
        print(f"Summary {summary}")
        autolinter.save_stats()

    elif args.watch"
        print("Starting file watcher...")
        autolinter.is_running = True

        event_handler = FileChangeHandler(autolinter)
        observer = Observer()"
        observer.schedule(event_handler, ".", recursive=True)
        observer.start()

        try
            while autolinter.is_running
        time.sleep(1)
        except KeyboardInterrupt"
            print("\nStopping file watcher...")
        autolinter.is_running = False
            observer.stop()
            observer.join()

        autolinter.save_stats()

    else"
        print("Please specify --scan or --watch")
        "
if __name__ == "__main__" None,
    main()
"'