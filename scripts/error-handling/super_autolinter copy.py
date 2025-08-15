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
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
#!/usr/bin/env python3
"""
Super AutoLinter - Advanced linting and error detection system.
"""

import os
import sys
import json
import logging
import subprocess
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
from enum import Enum
from dataclasses import dataclass


class LanguageType(Enum):
    """Supported programming languages."""

    PYTHON = "python"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
    JSON = "json"
    YAML = "yaml"
    MARKDOWN = "markdown"


@dataclass
class LintError:
    """Represents a linting error."""

    file_path: str
    line: int
    column: int
    message: str
    error_type: str
    severity: str
    fixable: bool = False


class SuperAutoLinter:
    """Advanced linting system with automatic error detection and fixing."""

    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_config(config_path)
        self.setup_logging()
        self.logger = logging.getLogger(__name__)
        self.errors_found = 0
        self.errors_fixed = 0

    def _load_config(self, config_path: Optional[str]) -> Dict[str, Any]:
        """Load configuration from file or use defaults."""
        default_config = {
            "monitoring": {
                "enabled": True,
                "interval": 30,
                "log_level": "INFO",
            },
            "linters": {
                "python": {
                    "enabled": True,
                    "command": "ruff",
                    "args": ["--quiet", "--output-format=json"],
                },
                "javascript": {
                    "enabled": True,
                    "command": "eslint",
                    "args": ["--format=json"],
                },
                "typescript": {
                    "enabled": True,
                    "command": "eslint",
                    "args": ["--format=json"],
                },
            },
            "ignore_patterns": [
                ".git",
                "node_modules",
                "__pycache__",
                ".pytest_cache",
                "dist",
                "build",
                "venv",
                ".venv",
            ],
            "auto_fix": {
                "enabled": True,
                "max_fixes_per_file": 10,
                "backup_files": True,
            },
        }

        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, "r") as f:
                    user_config = json.load(f)
                    self.merge_configs(default_config, user_config)
                    self.logger.info(f"Loaded configuration from {config_path}")
            except Exception as e:
                self.logger.error(f"Failed to load config from {config_path}: {e}")

        return default_config

    def merge_configs(self, default: Dict[str, Any], user: Dict[str, Any]) -> None:
        """Recursively merge user configuration with defaults."""
        for key, value in user.items():
            if (
                key in default
                and isinstance(default[key], dict)
                and isinstance(value, dict)
            ):
                self.merge_configs(default[key], value)
            else:
                default[key] = value

    def setup_logging(self) -> None:
        """Setup logging configuration."""
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)

        logging.basicConfig(
            level=getattr(logging, self.config["monitoring"]["log_level"]),
            format="%(asctime)s - %(levelname)s - [SuperAutoLinter] %(message)s",
            handlers=[
                logging.FileHandler(log_dir / "super_autolinter.log"),
                logging.StreamHandler(sys.stdout),
            ],
        )

    def get_language_type(self, file_path: str) -> Optional[LanguageType]:
        """Determine the language type of a file."""
        ext = Path(file_path).suffix.lower()

        if ext == ".py":
            return LanguageType.PYTHON
        elif ext in [".js", ".jsx"]:
            return LanguageType.JAVASCRIPT
        elif ext in [".ts", ".tsx"]:
            return LanguageType.TYPESCRIPT
        elif ext == ".json":
            return LanguageType.JSON
        elif ext in [".yml", ".yaml"]:
            return LanguageType.YAML
        elif ext == ".md":
            return LanguageType.MARKDOWN

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

    def get_python_syntax_errors(self, file_path: str) -> List[LintError]:
        """Get Python syntax errors using compile validation."""
        errors = []

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                source = f.read()

            try:
                compile(source, file_path, "exec")
            except SyntaxError as e:
                errors.append(
                    LintError(
                        file_path=file_path,
                        line=e.lineno or 0,
                        column=e.offset or 0,
                        message=str(e),
                        error_type="SyntaxError",
                        severity="error",
                        fixable=False,
                    )
                )
            except IndentationError as e:
                errors.append(
                    LintError(
                        file_path=file_path,
                        line=e.lineno or 0,
                        column=e.offset or 0,
                        message=str(e),
                        error_type="IndentationError",
                        severity="error",
                        fixable=False,
                    )
                )
            except TabError as e:
                errors.append(
                    LintError(
                        file_path=file_path,
                        line=e.lineno or 0,
                        column=e.offset or 0,
                        message=str(e),
                        error_type="TabError",
                        severity="error",
                        fixable=False,
                    )
                )
        except Exception as e:
            errors.append(
                LintError(
                    file_path=file_path,
                    line=0,
                    column=0,
                    message=f"Failed to read file: {e}",
                    error_type="FileError",
                    severity="error",
                    fixable=False,
                )
            )

        return errors

    def run_linter(self, file_path: str, language: LanguageType) -> List[LintError]:
        """Run appropriate linter for the file."""
        errors = []

        if language == LanguageType.PYTHON:
            errors.extend(self.get_python_syntax_errors(file_path))

            # Run ruff if available
            if self.config["linters"]["python"]["enabled"]:
                try:
                    result = subprocess.run(
                        [self.config["linters"]["python"]["command"]]
                        + self.config["linters"]["python"]["args"]
                        + [file_path],
                        capture_output=True,
                        text=True,
                        timeout=30,
                    )

                    if result.returncode != 0:
                        # Parse ruff output
                        try:
                            ruff_errors = json.loads(result.stdout)
                            for error in ruff_errors:
                                errors.append(
                                    LintError(
                                        file_path=file_path,
                                        line=error.get("location", {}).get("row", 0),
                                        column=error.get("location", {}).get(
                                            "column", 0
                                        ),
                                        message=error.get("message", "Unknown error"),
                                        error_type=error.get("code", "RUFF"),
                                        severity="warning",
                                        fixable=error.get("fix", {}).get(
                                            "applicability"
                                        )
                                        == "Automatic",
                                    )
                                )
                        except json.JSONDecodeError:
                            # Fallback to parsing stderr
                            for line in result.stderr.split("\n"):
                                if line.strip():
                                    errors.append(
                                        LintError(
                                            file_path=file_path,
                                            line=0,
                                            column=0,
                                            message=line.strip(),
                                            error_type="RUFF",
                                            severity="warning",
                                            fixable=False,
                                        )
                                    )
                except subprocess.TimeoutExpired:
                    errors.append(
                        LintError(
                            file_path=file_path,
                            line=0,
                            column=0,
                            message="Linter timeout",
                            error_type="Timeout",
                            severity="warning",
                            fixable=False,
                        )
                    )
                except FileNotFoundError:
                    # Linter not installed, skip
                    pass

        return errors

    def find_files(self, directory: str = ".") -> List[str]:
        """Find all files to lint."""
        files = []

        for root, dirs, filenames in os.walk(directory):
            # Skip ignored directories
            dirs[:] = [
                d for d in dirs if not self.should_ignore_file(os.path.join(root, d))
            ]

            for filename in filenames:
                file_path = os.path.join(root, filename)
                if not self.should_ignore_file(file_path):
                    files.append(file_path)

        return files

    def lint_file(self, file_path: str) -> List[LintError]:
        """Lint a single file."""
        language = self.get_language_type(file_path)
        if not language:
            return []

        return self.run_linter(file_path, language)

    def lint_directory(self, directory: str = ".") -> List[LintError]:
        """Lint all files in a directory."""
        all_errors = []
        files = self.find_files(directory)

        self.logger.info(f"Found {len(files)} files to lint")

        for file_path in files:
            errors = self.lint_file(file_path)
            all_errors.extend(errors)

            if errors:
                self.logger.info(f"Found {len(errors)} errors in {file_path}")

        self.errors_found = len(all_errors)
        return all_errors

    def auto_fix_errors(self, errors: List[LintError]) -> List[LintError]:
        """Attempt to automatically fix errors."""
        if not self.config["auto_fix"]["enabled"]:
            return errors

        fixed_errors = []
        remaining_errors = []

        for error in errors:
            if error.fixable and self.fix_error(error):
                fixed_errors.append(error)
                self.errors_fixed += 1
            else:
                remaining_errors.append(error)

        self.logger.info(f"Auto-fixed {len(fixed_errors)} errors")
        return remaining_errors

    def fix_error(self, error: LintError) -> bool:
        """Attempt to fix a single error."""
        try:
            if error.error_type == "RUFF" and "fix" in error.error_type.lower():
                # Run ruff with --fix
                result = subprocess.run(
                    ["ruff", "--fix", error.file_path],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                return result.returncode == 0

            return False
        except Exception as e:
            self.logger.error(f"Failed to fix error in {error.file_path}: {e}")
            return False

    def generate_report(self, errors: List[LintError]) -> Dict[str, Any]:
        """Generate a comprehensive linting report."""
        report = {
            "timestamp": time.time(),
            "total_errors": len(errors),
            "errors_fixed": self.errors_fixed,
            "errors_by_type": {},
            "errors_by_file": {},
            "severity_breakdown": {
                "error": 0,
                "warning": 0,
                "info": 0,
            },
        }

        for error in errors:
            # Count by type
            error_type = error.error_type
            report["errors_by_type"][error_type] = (
                report["errors_by_type"].get(error_type, 0) + 1
            )

            # Count by file
            file_path = error.file_path
            if file_path not in report["errors_by_file"]:
                report["errors_by_file"][file_path] = []
            report["errors_by_file"][file_path].append(
                {
                    "line": error.line,
                    "column": error.column,
                    "message": error.message,
                    "type": error.error_type,
                    "severity": error.severity,
                    "fixable": error.fixable,
                }
            )

            # Count by severity
            report["severity_breakdown"][error.severity] += 1

        return report

    def save_report(
        self, report: Dict[str, Any], output_path: str = "lint_report.json"
    ) -> None:
        """Save the linting report to a file."""
        try:
            with open(output_path, "w") as f:
                json.dump(report, f, indent=2)
            self.logger.info(f"Report saved to {output_path}")
        except Exception as e:
            self.logger.error(f"Failed to save report: {e}")

    def run(self, directory: str = ".") -> Dict[str, Any]:
        """Run the complete linting process."""
        self.logger.info("Starting SuperAutoLinter...")

        # Find and lint all files
        errors = self.lint_directory(directory)

        # Attempt to fix errors
        remaining_errors = self.auto_fix_errors(errors)

        # Generate report
        report = self.generate_report(remaining_errors)

        # Save report
        self.save_report(report)

        self.logger.info(
            f"Linting complete. Found {self.errors_found} errors, fixed {self.errors_fixed}"
        )

        return report


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Super AutoLinter")
    parser.add_argument("directory", nargs="?", default=".", help="Directory to lint")
    parser.add_argument("--config", help="Configuration file path")
    parser.add_argument(
        "--output", default="lint_report.json", help="Output report file"
    )

    args = parser.parse_args()

    linter = SuperAutoLinter(args.config)
    report = linter.run(args.directory)

    if args.output != "lint_report.json":
        linter.save_report(report, args.output)

    # Exit with error code if there are unfixed errors
    if report["total_errors"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
