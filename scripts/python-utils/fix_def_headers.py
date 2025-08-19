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
Aggressively fix malformed function headers in Python files.

Looks for lines starting with 'def' that do not end with ')',
attempts to merge with the next line if needed, and adds missing parentheses/colons.
Logs all changes and ambiguous cases for manual review.
"""

import os
import sys
from typing import List, Tuple


def fix_def_headers_in_file(file_path: str) -> int:
    """Fix malformed function headers in a single file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        lines = content.split("\n")
        fixed_lines = []
        fixes_count = 0
        ambiguous: List[Tuple[str, int, str]] = []

        i = 0
        while i < len(lines):
            line = lines[i]

            # Check if line starts with 'def' but doesn't end with ')'
            if line.strip().startswith("def ") and not line.rstrip().endswith(")"):
                # Try to merge with next line if it exists
                if i + 1 < len(lines):
                    next_line = lines[i + 1]
                    # If next line doesn't start with 'def', merge them
                    if not next_line.strip().startswith("def "):
                        merged = line.rstrip() + " " + next_line.lstrip()
                        # Check if merged line now ends with ')'
                        if merged.rstrip().endswith(")"):
                            # Add missing colon if not present
                            if not merged.rstrip().endswith("):"):
                                merged = merged.rstrip() + ":"
                            fixed_lines.append(merged)
                            fixes_count += 1
                            i += 1  # Skip next line since we merged it
                        else:
                            # Still malformed, try to fix by adding parentheses
                            if "(" not in merged:
                                merged = merged.rstrip() + "()"
                            if not merged.rstrip().endswith(":"):
                                merged = merged.rstrip() + ":"
                            fixed_lines.append(merged)
                            fixes_count += 1
                            ambiguous.append((file_path, i + 1, merged))
                            i += 1
                        i += 1
                        continue
                    else:
                        # Next line is also a def, just add missing parenthesis and colon
                        merged = line.rstrip() + "()"
                        if not merged.endswith(":"):
                            merged += ":"
                        fixed_lines.append(merged)
                        fixes_count += 1
                        ambiguous.append((file_path, i + 1, merged))
                else:
                    # No next line, just add missing parenthesis and colon
                    merged = line.rstrip() + "()"
                    if not merged.endswith(":"):
                        merged += ":"
                    fixed_lines.append(merged)
                    fixes_count += 1
                    ambiguous.append((file_path, i + 1, merged))
            else:
                fixed_lines.append(line)

            i += 1

        # Write back to file if changes were made
        if fixes_count > 0:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write("\n".join(fixed_lines))

            print(f"Fixed {fixes_count} function headers in {file_path}")

            # Log ambiguous cases
            if ambiguous:
                with open("fix_def_headers_ambiguous.log", "a", encoding="utf-8") as f:
                    for file_path, line_num, content in ambiguous:
                        f.write(f"{file_path}:{line_num}: {content}\n")

        return fixes_count
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return 0


def scan_and_fix_all(target: str) -> None:
    """Scan and fix all Python files in the target directory."""
    total_fixes = 0

    for root, dirs, files in os.walk(target):
        # Skip common directories that shouldn't be processed
        dirs[:] = [
            d for d in dirs if d not in ["__pycache__", ".git", "node_modules", "venv"]
        ]

        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                total_fixes += fix_def_headers_in_file(file_path)

    print(f"\nTotal function header fixes applied: {total_fixes}")


def main() -> None:
    """Main entry point."""
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    print(f"Scanning for malformed function headers in {target}")
    scan_and_fix_all(target)


if __name__ == "__main__":
    main()
