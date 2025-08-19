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
# Company Confidential
#!/usr/bin/env python3
"""
Fix malformed f-strings and syntax errors in Python files.
"""

import re
import os
import glob
from typing import List


def fix_malformed_fstrings(content: str) -> str:
    """Fix malformed f-strings in content."""
    # Common malformed f-string patterns and their fixes
    replacements = [
        # Fix unterminated f-strings
        (r'f"([^"]*)$', r'f"\1"', re.MULTILINE),
        (r"f'([^']*)$", r"f'\1'", re.MULTILINE),
        # Fix f-strings with missing quotes
        (r'f"([^"]*)\n', r'f"\1"\n', re.MULTILINE),
        (r"f'([^']*)\n", r"f'\1'\n", re.MULTILINE),
        # Fix f-strings with extra backslashes
        (r'f"([^"]*)\\\\n([^"]*)"', r'f"\1\n\2"'),
        (r"f'([^']*)\\\\n([^']*)'", r"f'\1\n\2'"),
        # Fix f-strings with malformed expressions
        (r'f"([^"]*)\{([^}]*)\n([^"]*)"', r'f"\1{\2}\n\3"'),
        (r"f'([^']*)\{([^}]*)\n([^']*)'", r"f'\1{\2}\n\3'"),
    ]

    for pattern, replacement, flags in replacements:
        content = re.sub(pattern, replacement, content, flags=flags)

    return content


def fix_unterminated_strings(content: str) -> str:
    """Fix unterminated string literals."""
    # Fix unterminated docstrings
    content = re.sub(r'^"""([^"]*)$', r'"""\1"""', content, flags=re.MULTILINE)
    content = re.sub(r"^'''([^']*)$", r"'''\1'''", content, flags=re.MULTILINE)

    # Fix unterminated regular strings
    content = re.sub(r'^"([^"]*)$', r'"\1"', content, flags=re.MULTILINE)
    content = re.sub(r"^'([^']*)$", r"'\1'", content, flags=re.MULTILINE)

    return content


def fix_indentation_errors(content: str) -> str:
    """Fix indentation errors."""
    lines = content.split("\n")
    fixed_lines = []
    indent_stack = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            fixed_lines.append("")
            continue

        # Count leading spaces
        leading_spaces = len(line) - len(line.lstrip())

        # Determine expected indentation
        if stripped.endswith(":"):
            # This line should increase indentation
            expected_indent = len(indent_stack) * 4
            if leading_spaces != expected_indent:
                line = " " * expected_indent + stripped
            indent_stack.append(expected_indent + 4)
        else:
            # This line should match current indentation
            expected_indent = len(indent_stack) * 4
            if leading_spaces != expected_indent:
                line = " " * expected_indent + stripped

        fixed_lines.append(line)

    return "\n".join(fixed_lines)


def fix_syntax_errors_in_file(file_path: str) -> bool:
    """Fix syntax errors in a single file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        original_content = content

        # Apply fixes
        content = fix_malformed_fstrings(content)
        content = fix_unterminated_strings(content)
        content = fix_indentation_errors(content)

        # Write back if changed
        if content != original_content:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Fixed syntax errors in: {file_path}")
            return True
        else:
            print(f"No syntax errors found in: {file_path}")
            return False

    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False


def find_python_files(directory: str = ".") -> List[str]:
    """Find all Python files in directory."""
    python_files = []
    for pattern in ["*.py", "*.pyw", "*.pyx"]:
        python_files.extend(
            glob.glob(os.path.join(directory, "**", pattern), recursive=True)
        )
    return python_files


def main():
    """Main function to fix syntax errors in all Python files."""
    print("Python Syntax Fixer")
    print("=" * 30)

    # Find all Python files
    python_files = find_python_files()

    if not python_files:
        print("No Python files found.")
        return

    print(f"Found {len(python_files)} Python files.")

    # Fix each file
    fixed_count = 0
    for file_path in python_files:
        if fix_syntax_errors_in_file(file_path):
            fixed_count += 1

    print(
        f"\nSummary: Fixed syntax errors in {fixed_count} out of {len(python_files)} files."
    )


if __name__ == "__main__":
    main()
