#!/usr/bin/env python3
"""
AutoLinter - Continuous Linter Error Fixing System

This script continuously monitors Python files for linter errors and automatically fixes
them, while ignoring all MD lint errors as requested.

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
from typing import List, Dict, Optional
from datetime import datetime


class AutoLinter:
    """Continuous linter error fixing system."""

    def __init__(
        self, project_dirs: List[str], ignore_patterns: Optional[List[str]] = None
    ):
        self.project_dirs = project_dirs
        self.ignore_patterns = ignore_patterns or []
        self.last_run: Optional[datetime] = None
        self.errors_by_type: Dict[str, int] = {}
        self.setup_logging()

    def setup_logging(self) -> None:
        """Setup logging configuration."""
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)

        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(levelname)s - %(message)s",
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
        if path.suffix != ".py":
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
            for line in result.stdout.split("\n"):
                line = line.strip()
                if line and not line.startswith("MD"):  # Ignore MD lint errors
                    errors.append(line)

            return errors
        except subprocess.TimeoutExpired:
            self.logger.error(f"Linter timeout for {file_path}")
            return []
        except Exception as e:
            self.logger.error(f"Error running linter on {file_path}: {e}")
            return []

    def fix_linter_errors(self, file_path: str, errors: List[str]) -> bool:
        """Attempt to fix linter errors in a file."""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            original_content = content
            fixed = False

            for error in errors:
                # Parse error line and column
                parts = error.split(":")
                if len(parts) >= 3:
                    line_num = int(parts[1])
                    col_num = int(parts[2])
                    error_code = parts[3].split()[0] if len(parts) > 3 else ""

                    # Apply fixes based on error code
                    if error_code == "E501":  # Line too long
                        content = self._fix_line_length(content, line_num)
                        fixed = True
                    elif error_code == "F821":  # Undefined name
                        content = self._fix_undefined_name(content, line_num, col_num)
                        fixed = True
                    elif error_code == "F841":  # Unused variable
                        content = self._fix_unused_variable(content, line_num)
                        fixed = True

            if fixed and content != original_content:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)
                self.logger.info(f"Fixed errors in {file_path}")
                return True

            return False
        except Exception as e:
            self.logger.error(f"Error fixing {file_path}: {e}")
            return False

    def _fix_line_length(self, content: str, line_num: int) -> str:
        """Fix line length issues."""
        lines = content.split("\n")
        if line_num <= len(lines):
            line = lines[line_num - 1]
            if len(line) > 120:
                # Simple fix: break at spaces
                words = line.split()
                if len(words) > 1:
                    mid = len(words) // 2
                    lines[line_num - 1] = " ".join(words[:mid])
                    lines.insert(line_num, "    " + " ".join(words[mid:]))
        return "\n".join(lines)

    def _fix_undefined_name(self, content: str, line_num: int, col_num: int) -> str:
        """Fix undefined name issues."""
        # This is a placeholder - would need more sophisticated analysis
        return content

    def _fix_unused_variable(self, content: str, line_num: int) -> str:
        """Fix unused variable issues."""
        lines = content.split("\n")
        if line_num <= len(lines):
            line = lines[line_num - 1]
            # Add underscore prefix to indicate unused variable
            if "=" in line and not line.strip().startswith("_"):
                parts = line.split("=")
                if len(parts) == 2:
                    var_name = parts[0].strip()
                    if not var_name.startswith("_"):
                        lines[line_num - 1] = line.replace(var_name, f"_{var_name}")
        return "\n".join(lines)

    def scan_project(self) -> Dict[str, List[str]]:
        """Scan entire project for linter errors."""
        all_errors: Dict[str, List[str]] = {}

        for project_dir in self.project_dirs:
            for root, dirs, files in os.walk(project_dir):
                for file in files:
                    if file.endswith(".py"):
                        file_path = os.path.join(root, file)
                        if not self.should_ignore_file(file_path):
                            errors = self.get_linter_errors(file_path)
                            if errors:
                                all_errors[file_path] = errors

        return all_errors

    def run(self) -> None:
        """Run the autolinter."""
        self.logger.info("Starting AutoLinter...")

        while True:
            try:
                errors = self.scan_project()
                total_errors = sum(len(errs) for errs in errors.values())

                if total_errors > 0:
                    self.logger.info(
                        f"Found {total_errors} errors across {len(errors)} files"
                    )

                    for file_path, file_errors in errors.items():
                        self.fix_linter_errors(file_path, file_errors)
                else:
                    self.logger.info("No linter errors found")

                self.last_run = datetime.now()
                time.sleep(60)  # Check every minute

            except KeyboardInterrupt:
                self.logger.info("AutoLinter stopped by user")
                break
            except Exception as e:
                self.logger.error(f"Error in autolinter loop: {e}")
                time.sleep(60)


def main() -> None:
    """Main entry point."""
    project_dirs = ["."]  # Current directory
    ignore_patterns = [
        "__pycache__",
        ".git",
        "node_modules",
        "venv",
        ".venv",
        "env",
        ".env",
    ]

    autolinter = AutoLinter(project_dirs, ignore_patterns)
    autolinter.run()


if __name__ == "__main__":
    main()
