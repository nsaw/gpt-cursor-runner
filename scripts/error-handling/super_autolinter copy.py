#!/usr/bin/env python3
"""
Super AutoLinter - Lightweight and Highly Effective Error Fixing Tool

A streamlined, fast, and reliable tool for fixing:
- Python syntax errors
- Flake8 linting errors  
- ESLint JavaScript/TypeScript errors
- Code formatting issues
- Import and dependency errors

Features:
- Fast error detection and fixing
- Minimal dependencies
- Real-time file monitoring
- Comprehensive error reporting
- Automatic backup and recovery
"""

import os
import sys
import time
import subprocess
import logging
import json
import signal
from pathlib import Path
from typing import List, Dict, Set, Optional
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import threading
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum


class LanguageType(Enum):
    """Supported language types."""
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"


@dataclass
class LinterStats:
    """Statistics for linter operations."""
    total_errors_fixed: int = 0
    files_processed: int = 0
    last_run: Optional[str] = None
    errors_by_type: Dict[str, int] = None
    fix_success_rate: float = 0.0
    language_stats: Dict[str, Dict] = None
    
    def __post_init__(self):
        if self.errors_by_type is None:
            self.errors_by_type = {}
        if self.language_stats is None:
            self.language_stats = {lang.value: {"files": 0, "errors": 0} for lang in LanguageType}


class SuperAutoLinter:
    """Lightweight and highly effective error fixing system."""

    def __init__(self, config_path: str = None):
        self.config = self.load_config(config_path)
        self.stats = LinterStats()
        self.processed_files: Set[str] = set()
        self.is_running = False
        self.observer = None
        self.setup_logging()
        self.load_stats()

    def load_config(self, config_path: str = None) -> Dict:
        """Load configuration from file or use defaults."""
        default_config = {
            "project_directories": ["."],
            "ignore_patterns": [
                ".git", "__pycache__", "node_modules", ".venv", "venv",
                "*.egg-info", "dist", "build", "logs", "temp", "*.log"
            ],
            "linter_settings": {
                "python": {
                    "line_length": 88,
                    "select_errors": ["E501", "F541", "F821", "F841", "W291", "W292", "W293", "W391"],
                    "use_black": True,
                    "use_autopep8": True,
                    "use_manual_fixes": True
                },
                "javascript": {
                    "eslint_config": "./.eslintrc.js",
                    "prettier_config": "./.prettierrc",
                    "select_errors": ["error", "warn"],
                    "use_eslint": True,
                    "use_prettier": True,
                    "use_manual_fixes": True,
                    "max_line_length": 100
                }
            },
            "monitoring": {
                "debounce_delay": 1.0,
                "save_stats_interval": 300,
                "log_level": "INFO",
                "enable_notifications": True
            },
            "fixing_strategies": {
                "max_retries": 3,
                "backup_files": True,
                "dry_run_first": False,
                "stop_on_syntax_error": True
            }
        }

        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    user_config = json.load(f)
                    self.merge_configs(default_config, user_config)
                    self.logger.info(f"Loaded configuration from {config_path}")
            except Exception as e:
                self.logger.error(f"Failed to load config from {config_path}: {e}")
        
        return default_config

    def merge_configs(self, default: Dict, user: Dict):
        """Recursively merge user configuration with defaults."""
        for key, value in user.items():
            if key in default and isinstance(default[key], dict) and isinstance(value, dict):
                self.merge_configs(default[key], value)
            else:
                default[key] = value

    def setup_logging(self):
        """Setup logging configuration."""
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)

        logging.basicConfig(
            level=getattr(logging, self.config["monitoring"]["log_level"]),
            format='%(asctime)s - %(levelname)s - [SuperAutoLinter] %(message)s',
            handlers=[
                logging.FileHandler(log_dir / "super_autolinter.log"),
                logging.StreamHandler(sys.stdout),
            ],
        )
        self.logger = logging.getLogger(__name__)

    def get_language_type(self, file_path: str) -> Optional[LanguageType]:
        """Determine the language type of a file."""
        ext = Path(file_path).suffix.lower()
        
        if ext == '.py':
            return LanguageType.PYTHON
        elif ext in ['.js', '.jsx']:
            return LanguageType.JAVASCRIPT
        elif ext in ['.ts', '.tsx']:
            return LanguageType.TYPESCRIPT
        
        return None

    def should_ignore_file(self, file_path: str) -> bool:
        """Check if file should be ignored."""
        path = Path(file_path)
        
        try:
            relative_path = str(path.relative_to(Path.cwd()))
        except ValueError:
            relative_path = str(path)

        if not self.get_language_type(file_path):
            return True

        for pattern in self.config["ignore_patterns"]:
            if pattern in relative_path:
                return True

        return False

    def get_python_syntax_errors(self, file_path: str) -> List[Dict]:
        """Get Python syntax errors using compile validation."""
        errors = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                source = f.read()
            
            try:
                compile(source, file_path, 'exec')
            except SyntaxError as e:
                errors.append({
                    "type": "SyntaxError",
                    "line": e.lineno,
                    "column": e.offset,
                    "message": str(e),
                    "severity": "error",
                    "fixable": False
                })
            except IndentationError as e:
                errors.append({
                    "type": "IndentationError", 
                    "line": e.lineno,
                    "column": e.offset,
                    "message": str(e),
                    "severity": "error",
                    "fixable": False
                })
            except TabError as e:
                errors.append({
                    "type": "TabError",
                    "line": e.lineno,
                    "column": e.offset,
                    "message": str(e),
                    "severity": "error",
                    "fixable": False
                })

        except Exception as e:
            self.logger.error(f"Error checking syntax for {file_path}: {e}")
        
        return errors

    def get_python_linter_errors(self, file_path: str) -> List[str]:
        """Get Python linter errors using flake8."""
        try:
            settings = self.config["linter_settings"]["python"]
            cmd = [
                "flake8",
                file_path,
                f"--select={','.join(settings['select_errors'])}",
                "--count",
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

            if result.returncode == 0:
                return []

            errors = []
            for line in result.stdout.split('\n'):
                if ':' in line and any(error in line for error in settings['select_errors']):
                    errors.append(line.strip())

            return errors

        except Exception as e:
            self.logger.error(f"Error getting Python linter errors for {file_path}: {e}")
            return []

    def get_all_python_errors(self, file_path: str) -> List[Dict]:
        """Get all Python errors including syntax and linting errors."""
        errors = []
        
        # Get syntax errors first (critical)
        syntax_errors = self.get_python_syntax_errors(file_path)
        errors.extend(syntax_errors)
        
        # If there are critical syntax errors, don't run linter
        critical_errors = [e for e in syntax_errors if e.get("severity") == "error"]
        if critical_errors and self.config.get("fixing_strategies", {}).get("stop_on_syntax_error", True):
            self.logger.error(f"Critical syntax errors found in {file_path}, skipping linting")
            return errors
        
        # Get linting errors
        lint_errors = self.get_python_linter_errors(file_path)
        for error in lint_errors:
            parts = error.split(':')
            if len(parts) >= 4:
                errors.append({
                    "type": "LintError",
                    "line": int(parts[1]) if parts[1].isdigit() else 0,
                    "column": int(parts[2]) if parts[2].isdigit() else 0,
                    "code": parts[3].split()[0] if len(parts[3].split()) > 0 else "",
                    "message": ':'.join(parts[3:]).strip(),
                    "severity": "warning",
                    "fixable": True
                })
        
        return errors

    def get_javascript_linter_errors(self, file_path: str) -> List[Dict]:
        """Get JavaScript/TypeScript linter errors using ESLint."""
        try:
            settings = self.config["linter_settings"]["javascript"]
            cmd = [
                "npx", "eslint",
                file_path,
                "--format=json",
                "--config", settings.get("eslint_config", "./.eslintrc.js"),
                "--no-eslintrc"
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

            if result.returncode == 0:
                return []

            try:
                results = json.loads(result.stdout)
                errors = []
                
                for result_item in results:
                    for message in result_item.get("messages", []):
                        if message.get("severity") in settings["select_errors"]:
                            errors.append({
                                "line": message.get("line"),
                                "column": message.get("column"),
                                "rule": message.get("ruleId"),
                                "message": message.get("message"),
                                "severity": message.get("severity"),
                                "fixable": message.get("fix", False)
                            })
                
                return errors

            except json.JSONDecodeError as e:
                self.logger.error(f"Failed to parse ESLint output: {e}")
                return []

        except Exception as e:
            self.logger.error(f"Error getting JavaScript linter errors for {file_path}: {e}")
            return []

    def fix_python_file(self, file_path: str) -> Dict[str, int]:
        """Fix Python file using multiple strategies."""
        settings = self.config["linter_settings"]["python"]
        fixes_applied = {"black": 0, "autopep8": 0, "manual": 0}
        
        try:
            # Create backup if enabled
            if self.config.get("fixing_strategies", {}).get("backup_files", True):
                backup_path = f"{file_path}.backup"
                with open(file_path, 'r') as src, open(backup_path, 'w') as dst:
                    dst.write(src.read())

            # Try Black first
            if settings.get("use_black", True):
                if self.fix_file_with_black(file_path):
                    fixes_applied["black"] = 1

            # Try autopep8
            if settings.get("use_autopep8", True):
                if self.fix_file_with_autopep8(file_path):
                    fixes_applied["autopep8"] = 1

            # Manual fixes for remaining issues
            if settings.get("use_manual_fixes", True):
                manual_fixes = self.fix_python_manual(file_path)
                fixes_applied["manual"] = manual_fixes

            return fixes_applied

        except Exception as e:
            self.logger.error(f"Error fixing Python file {file_path}: {e}")
            return fixes_applied

    def fix_javascript_file(self, file_path: str) -> Dict[str, int]:
        """Fix JavaScript/TypeScript file using multiple strategies."""
        settings = self.config["linter_settings"]["javascript"]
        fixes_applied = {"eslint": 0, "prettier": 0, "manual": 0}
        
        try:
            # Create backup if enabled
            if self.config.get("fixing_strategies", {}).get("backup_files", True):
                backup_path = f"{file_path}.backup"
                with open(file_path, 'r') as src, open(backup_path, 'w') as dst:
                    dst.write(src.read())

            # Try ESLint auto-fix
            if settings.get("use_eslint", True):
                if self.fix_file_with_eslint(file_path):
                    fixes_applied["eslint"] = 1

            # Try Prettier
            if settings.get("use_prettier", True):
                if self.fix_file_with_prettier(file_path):
                    fixes_applied["prettier"] = 1

            # Manual fixes for remaining issues
            if settings.get("use_manual_fixes", True):
                manual_fixes = self.fix_javascript_manual(file_path)
                fixes_applied["manual"] = manual_fixes

            return fixes_applied

        except Exception as e:
            self.logger.error(f"Error fixing JavaScript file {file_path}: {e}")
            return fixes_applied

    def fix_file_with_black(self, file_path: str) -> bool:
        """Fix Python file using black formatter."""
        try:
            settings = self.config["linter_settings"]["python"]
            cmd = [
                "black",
                f"--line-length={settings['line_length']}",
                "--skip-string-normalization",
                file_path,
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            return result.returncode == 0

        except Exception as e:
            self.logger.error(f"Error running black on {file_path}: {e}")
            return False

    def fix_file_with_autopep8(self, file_path: str) -> bool:
        """Fix Python file using autopep8."""
        try:
            settings = self.config["linter_settings"]["python"]
            cmd = [
                "autopep8",
                "--in-place",
                "--aggressive",
                "--aggressive",
                f"--max-line-length={settings['line_length']}",
                file_path,
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            return result.returncode == 0

        except Exception as e:
            self.logger.error(f"Error running autopep8 on {file_path}: {e}")
            return False

    def fix_file_with_eslint(self, file_path: str) -> bool:
        """Fix JavaScript/TypeScript file using ESLint."""
        try:
            settings = self.config["linter_settings"]["javascript"]
            cmd = [
                "npx", "eslint",
                file_path,
                "--fix",
                "--config", settings.get("eslint_config", "./.eslintrc.js"),
                "--no-eslintrc"
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            return result.returncode == 0

        except Exception as e:
            self.logger.error(f"Error running ESLint on {file_path}: {e}")
            return False

    def fix_file_with_prettier(self, file_path: str) -> bool:
        """Fix JavaScript/TypeScript file using Prettier."""
        try:
            settings = self.config["linter_settings"]["javascript"]
            cmd = [
                "npx", "prettier",
                "--write",
                file_path
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            return result.returncode == 0

        except Exception as e:
            self.logger.error(f"Error running Prettier on {file_path}: {e}")
            return False

    def fix_python_manual(self, file_path: str) -> int:
        """Apply manual fixes to Python file."""
        fixes_applied = 0
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            modified = False
            
            # Fix common issues
            for i, line in enumerate(lines):
                original_line = line
                
                # Remove trailing whitespace
                if line.rstrip() != line:
                    line = line.rstrip() + '\n'
                    modified = True
                
                # Fix double spaces
                if '  ' in line and not line.strip().startswith('#'):
                    line = ' '.join(line.split())
                    if not line.endswith('\n'):
                        line += '\n'
                    modified = True
                
                if line != original_line:
                    lines[i] = line
                    fixes_applied += 1
            
            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(lines)
            
        except Exception as e:
            self.logger.error(f"Error applying manual fixes to {file_path}: {e}")
        
        return fixes_applied

    def fix_javascript_manual(self, file_path: str) -> int:
        """Apply manual fixes to JavaScript/TypeScript file."""
        fixes_applied = 0
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            modified = False
            
            # Fix common issues
            for i, line in enumerate(lines):
                original_line = line
                
                # Remove trailing whitespace
                if line.rstrip() != line:
                    line = line.rstrip() + '\n'
                    modified = True
                
                # Fix semicolon issues
                if line.strip() and not line.strip().endswith(';') and not line.strip().endswith('{') and not line.strip().endswith('}'):
                    if not line.strip().startswith('//') and not line.strip().startswith('/*'):
                        line = line.rstrip() + ';\n'
                        modified = True
                
                if line != original_line:
                    lines[i] = line
                    fixes_applied += 1
            
            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(lines)
            
        except Exception as e:
            self.logger.error(f"Error applying manual fixes to {file_path}: {e}")
        
        return fixes_applied

    def process_file(self, file_path: str) -> bool:
        """Process a single file for linting and fixing."""
        if file_path in self.processed_files:
            return False

        if self.should_ignore_file(file_path):
            return False

        language = self.get_language_type(file_path)
        if not language:
            return False

        self.logger.info(f"Processing {file_path} ({language.value})")

        try:
            # Get errors
            if language == LanguageType.PYTHON:
                errors = self.get_all_python_errors(file_path)
                
                # Check for critical syntax errors first
                critical_errors = [e for e in errors if e.get("severity") == "error"]
                if critical_errors:
                    self.logger.error(f"🚨 CRITICAL SYNTAX ERRORS found in {file_path}:")
                    for error in critical_errors:
                        self.logger.error(f"  Line {error.get('line', '?')}: {error.get('message', 'Unknown error')}")
                    
                    # Don't attempt to fix critical syntax errors automatically
                    if self.config.get("fixing_strategies", {}).get("stop_on_syntax_error", True):
                        self.logger.error(f"⛔ Stopping processing of {file_path} due to critical syntax errors")
                        return False
                
                if errors:
                    fixes = self.fix_python_file(file_path)
                else:
                    fixes = {"black": 0, "autopep8": 0, "manual": 0}
            else:
                errors = self.get_javascript_linter_errors(file_path)
                if errors:
                    fixes = self.fix_javascript_file(file_path)
                else:
                    fixes = {"eslint": 0, "prettier": 0, "manual": 0}

            # Update statistics
            total_fixes = sum(fixes.values())
            if total_fixes > 0:
                self.stats.total_errors_fixed += total_fixes
                self.stats.errors_by_type[language.value] = self.stats.errors_by_type.get(language.value, 0) + total_fixes
                self.logger.info(f"✅ Fixed {total_fixes} issues in {file_path}")

            # Log any remaining errors
            if errors:
                self.logger.info(f"📊 Found {len(errors)} issues in {file_path}")
                for error in errors[:5]:  # Show first 5 errors
                    self.logger.info(f"  - {error.get('type', 'Unknown')}: {error.get('message', 'No message')}")

            self.stats.files_processed += 1
            self.stats.language_stats[language.value]["files"] += 1
            self.stats.language_stats[language.value]["errors"] += len(errors)
            self.stats.last_run = datetime.now().isoformat()

            self.processed_files.add(file_path)
            return True

        except Exception as e:
            self.logger.error(f"❌ Error processing {file_path}: {e}")
            return False

    def scan_all_files(self):
        """Scan all files in project directories."""
        for project_dir in self.config["project_directories"]:
            if not os.path.exists(project_dir):
                continue

            for root, dirs, files in os.walk(project_dir):
                # Skip ignored directories
                dirs[:] = [d for d in dirs if not any(pattern in d for pattern in self.config["ignore_patterns"])]
                
                for file in files:
                    file_path = os.path.join(root, file)
                    self.process_file(file_path)

    def save_stats(self):
        """Save statistics to file."""
        try:
            stats_file = Path("logs") / "super_autolinter_stats.json"
            with open(stats_file, 'w') as f:
                json.dump(asdict(self.stats), f, indent=2)
        except Exception as e:
            self.logger.error(f"Error saving stats: {e}")

    def load_stats(self):
        """Load statistics from file."""
        try:
            stats_file = Path("logs") / "super_autolinter_stats.json"
            if stats_file.exists():
                with open(stats_file, 'r') as f:
                    data = json.load(f)
                    self.stats = LinterStats(**data)
        except Exception as e:
            self.logger.error(f"Error loading stats: {e}")

    def get_stats_summary(self) -> Dict:
        """Get a summary of current statistics."""
        return {
            "total_files_processed": self.stats.files_processed,
            "total_errors_fixed": self.stats.total_errors_fixed,
            "last_run": self.stats.last_run,
            "language_breakdown": self.stats.language_stats,
            "error_types": self.stats.errors_by_type,
            "success_rate": (self.stats.total_errors_fixed / max(self.stats.files_processed, 1)) * 100
        }

    def run_quick_scan(self):
        """Run a quick scan of all project directories to check for syntax errors."""
        self.logger.info("🔍 Running quick syntax scan...")
        
        total_files = 0
        files_with_errors = 0
        
        for project_dir in self.config["project_directories"]:
            if not os.path.exists(project_dir):
                continue
                
            self.logger.info(f"Scanning directory: {project_dir}")
            
            for root, dirs, files in os.walk(project_dir):
                # Skip ignored directories
                dirs[:] = [d for d in dirs if not any(pattern in d for pattern in self.config["ignore_patterns"])]
                
                for file in files:
                    file_path = os.path.join(root, file)
                    total_files += 1
                    
                    if self.should_ignore_file(file_path):
                        continue
                    
                    language = self.get_language_type(file_path)
                    if not language:
                        continue
                    
                    # Quick syntax check
                    if language == LanguageType.PYTHON:
                        errors = self.get_python_syntax_errors(file_path)
                        if errors:
                            files_with_errors += 1
                            self.logger.error(f"🚨 {file_path}: {len(errors)} syntax errors")
                    
                    elif language in [LanguageType.JAVASCRIPT, LanguageType.TYPESCRIPT]:
                        errors = self.get_javascript_linter_errors(file_path)
                        if errors:
                            files_with_errors += 1
                            self.logger.error(f"🚨 {file_path}: {len(errors)} linting errors")
        
        self.logger.info(f"📊 Quick scan complete: {files_with_errors} files with errors out of {total_files} total files")
        return files_with_errors == 0


class FileChangeHandler(FileSystemEventHandler):
    """Handle file system events for continuous monitoring."""

    def __init__(self, autolinter: SuperAutoLinter):
        self.autolinter = autolinter
        self.debounce_timer = None
        self.debounce_delay = autolinter.config["monitoring"]["debounce_delay"]

    def on_modified(self, event):
        """Handle file modification events."""
        if not event.is_directory:
            self.debounce_file_change(event.src_path)

    def on_created(self, event):
        """Handle file creation events."""
        if not event.is_directory:
            self.debounce_file_change(event.src_path)

    def debounce_file_change(self, file_path: str):
        """Debounce file change events to avoid excessive processing."""
        if self.debounce_timer:
            self.debounce_timer.cancel()
        
        self.debounce_timer = threading.Timer(self.debounce_delay, self.process_file_change, args=[file_path])
        self.debounce_timer.start()

    def process_file_change(self, file_path: str):
        """Process a file change after debouncing."""
        self.autolinter.process_file(file_path)


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Super AutoLinter - Lightweight Error Fixing Tool")
    parser.add_argument("--config", help="Configuration file path")
    parser.add_argument("--scan-only", action="store_true", help="Scan files once and exit")
    parser.add_argument("--stats", action="store_true", help="Show statistics and exit")
    parser.add_argument("--watch", action="store_true", help="Watch for file changes (default)")
    parser.add_argument("--project-dirs", nargs="+", help="Project directories to monitor")
    parser.add_argument("--quick-scan", action="store_true", help="Run a quick syntax scan of all files")
    parser.add_argument("--validate-config", action="store_true", help="Validate configuration and exit")

    args = parser.parse_args()

    # Create autolinter instance
    autolinter = SuperAutoLinter(config_path=args.config)
    
    # Override project directories if specified
    if args.project_dirs:
        autolinter.config["project_directories"] = args.project_dirs

    # Handle different modes
    if args.validate_config:
        print("✅ Configuration validation:")
        print(f"  - Project directories: {autolinter.config['project_directories']}")
        print(f"  - Python settings: {autolinter.config['linter_settings']['python']}")
        print(f"  - JavaScript settings: {autolinter.config['linter_settings']['javascript']}")
        return

    if args.quick_scan:
        success = autolinter.run_quick_scan()
        if success:
            print("✅ Quick scan completed successfully - no syntax errors found")
        else:
            print("❌ Quick scan found syntax errors")
        return

    if args.stats:
        stats = autolinter.get_stats_summary()
        print(json.dumps(stats, indent=2))
        return

    if args.scan_only:
        autolinter.logger.info("Starting one-time scan...")
        autolinter.scan_all_files()
        autolinter.save_stats()
        autolinter.logger.info("Scan complete!")
        return

    # Default: watch mode
    autolinter.logger.info("Starting Super AutoLinter in watch mode...")
    autolinter.logger.info(f"Monitoring directories: {autolinter.config['project_directories']}")
    
    # Setup file watching
    event_handler = FileChangeHandler(autolinter)
    observer = Observer()
    
    for project_dir in autolinter.config["project_directories"]:
        if os.path.exists(project_dir):
            observer.schedule(event_handler, project_dir, recursive=True)
    
    observer.start()
    autolinter.observer = observer

    try:
        # Initial scan
        autolinter.scan_all_files()
        
        # Keep running
        while True:
            time.sleep(1)
            # Save stats periodically
            if time.time() % autolinter.config["monitoring"]["save_stats_interval"] < 1:
                autolinter.save_stats()
                
    except KeyboardInterrupt:
        autolinter.logger.info("Stopping Super AutoLinter...")
        observer.stop()
        observer.join()
        autolinter.save_stats()
        autolinter.logger.info("Super AutoLinter stopped.")


if __name__ == "__main__":
    main() 