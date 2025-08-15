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
Fix function definition syntax errors in Python files.
"""

import os
import re
import sys


def fix_function_syntax_errors(file_path: str) -> int:
    """Fix function definition syntax errors in a Python file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        lines = content.split("\n")
        fixed_lines = []
        fixes_count = 0

        for i, line in enumerate(lines):
            original_line = line
            fixed_line = line

            # Fix function definitions with missing parentheses
            # Pattern: def function_name (missing opening parenthesis)
            if re.match(r"^\s*def\s+\w+\s*$", line):
                # Find the function name
                match = re.match(r"^\s*def\s+(\w+)\s*$", line)
                if match:
                    func_name = match.group(1)
                    # Look at the next line to see if it has parameters
                    if i + 1 < len(lines):
                        next_line = lines[i + 1]
                        if next_line.strip().startswith(
                            "self,"
                        ) or next_line.strip().startswith("self"):
                            # This is likely a method definition
                            fixed_line = f"    def {func_name}(self):"
                            fixes_count += 1
                            print(
                                f"Fixed function definition at line {i+1} in {file_path}"
                            )

            # Fix function definitions with incomplete parameter lists
            # Pattern: def function_name( (missing closing parenthesis)
            if re.match(r"^\s*def\s+\w+\s*\(\s*$", line):
                match = re.match(r"^\s*def\s+(\w+)\s*\(\s*$", line)
                if match:
                    func_name = match.group(1)
                    # Look at the next line for parameters
                    if i + 1 < len(lines):
                        next_line = lines[i + 1]
                        if next_line.strip().endswith("):"):
                            # Parameters are on the next line
                            fixed_line = f"    def {func_name}({next_line.strip()}"
                            # Remove the next line since we're incorporating it
                            if i + 1 < len(fixed_lines):
                                fixed_lines[i + 1] = ""
                            fixes_count += 1
                            print(
                                f"Fixed function definition at line {i+1} in {file_path}"
                            )

            fixed_lines.append(fixed_line)

        if fixes_count > 0:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write("\n".join(fixed_lines))
            print(f"Applied {fixes_count} function syntax fixes to {file_path}")

        return fixes_count

    except Exception as e:
        print(f"Error fixing function syntax errors in {file_path}: {e}")
        return 0


def scan_and_fix_files(directory: str = ".") -> int:
    """Scan all Python files in directory and fix function syntax errors."""
    total_fixes = 0
    files_processed = 0

    for root, dirs, files in os.walk(directory):
        # Skip certain directories
        dirs[:] = [
            d
            for d in dirs
            if d not in [".git", "__pycache__", "node_modules", ".venv", "venv"]
        ]

        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                fixes = fix_function_syntax_errors(file_path)
                if fixes > 0:
                    total_fixes += fixes
                files_processed += 1

    print(
        f"\nSummary: Processed {files_processed} Python files, applied {total_fixes} function syntax fixes"
    )
    return total_fixes


if __name__ == "__main__":
    if len(sys.argv) > 1:
        target = sys.argv[1]
    else:
        target = "."

    print(f"Scanning for function syntax errors in {target}")
    total_fixes = scan_and_fix_files(target)
    print(f"Total function syntax fixes applied: {total_fixes}")
