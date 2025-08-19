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
Final comprehensive syntax fix for all remaining unterminated string literals.
This script addresses the specific patterns found in the remaining errors.
"""

import os
import re
import glob
from typing import List


def fix_unterminated_strings_final(content: str) -> str:
    """Fix all types of unterminated string literals with comprehensive patterns."""

    # Fix unterminated docstrings at file start (most common issue)
    content = re.sub(r'^"""([^"]*)$', r'"""\1"""', content, flags=re.MULTILINE)
    content = re.sub(r"^'''([^']*)$", r"'''\1'''", content, flags=re.MULTILINE)

    # Fix unterminated docstrings in function definitions
    content = re.sub(
        r'def\s+(\w+)\s*\([^)]*\)\s*:\s*"""([^"]*)$',
        r'def \1():\n    """\2"""',
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"def\s+(\w+)\s*\([^)]*\)\s*:\s*'''([^']*)$",
        r"def \1():\n    '''\2'''",
        content,
        flags=re.MULTILINE,
    )

    # Fix unterminated strings in variable assignments
    content = re.sub(
        r'(\w+)\s*=\s*"""([^"]*)$', r'\1 = """\2"""', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"(\w+)\s*=\s*'''([^']*)$", r"\1 = '''\2'''", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in print statements
    content = re.sub(
        r'print\s*\(\s*"""([^"]*)$', r'print("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"print\s*\(\s*'''([^']*)$", r"print('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in return statements
    content = re.sub(
        r'return\s+"""([^"]*)$', r'return """\1"""', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"return\s+'''([^']*)$", r"return '''\1'''", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in function calls
    content = re.sub(
        r'(\w+)\s*\(\s*"""([^"]*)$', r'\1("""\2""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"(\w+)\s*\(\s*'''([^']*)$", r"\1('''\2''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in list/dict literals
    content = re.sub(r'\[\s*"""([^"]*)$', r'["""\1"""]', content, flags=re.MULTILINE)
    content = re.sub(r"\[\s*'''([^']*)$", r"['''\1''']", content, flags=re.MULTILINE)

    # Fix unterminated strings in dict literals
    content = re.sub(r'{\s*"""([^"]*)$', r'{"""\1"""}', content, flags=re.MULTILINE)
    content = re.sub(r"{\s*'''([^']*)$", r"{'''\1'''}", content, flags=re.MULTILINE)

    # Fix unterminated strings in tuple literals
    content = re.sub(r'\(\s*"""([^"]*)$', r'("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"\(\s*'''([^']*)$", r"('''\1''')", content, flags=re.MULTILINE)

    # Fix unterminated strings in f-strings
    content = re.sub(r'f"""([^"]*)$', r'f"""\1"""', content, flags=re.MULTILINE)
    content = re.sub(r"f'''([^']*)$", r"f'''\1'''", content, flags=re.MULTILINE)

    # Fix unterminated strings in raw strings
    content = re.sub(r'r"""([^"]*)$', r'r"""\1"""', content, flags=re.MULTILINE)
    content = re.sub(r"r'''([^']*)$", r"r'''\1'''", content, flags=re.MULTILINE)

    # Fix unterminated strings in bytes literals
    content = re.sub(r'b"""([^"]*)$', r'b"""\1"""', content, flags=re.MULTILINE)
    content = re.sub(r"b'''([^']*)$", r"b'''\1'''", content, flags=re.MULTILINE)

    # Fix unterminated strings in unicode literals
    content = re.sub(r'u"""([^"]*)$', r'u"""\1"""', content, flags=re.MULTILINE)
    content = re.sub(r"u'''([^']*)$", r"u'''\1'''", content, flags=re.MULTILINE)

    # Fix specific patterns found in the errors
    # Fix unterminated strings at end of lines
    content = re.sub(r'"""([^"]*)$', r'"""\1"""', content, flags=re.MULTILINE)
    content = re.sub(r"'''([^']*)$", r"'''\1'''", content, flags=re.MULTILINE)

    return content


def fix_file_syntax_final(file_path: str) -> bool:
    """Fix syntax errors in a single file using final comprehensive patterns."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        original_content = content
        fixed_content = fix_unterminated_strings_final(content)

        if fixed_content != original_content:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(fixed_content)
            print(f"Fixed syntax errors in: {file_path}")
            return True
        else:
            print(f"No syntax errors found in: {file_path}")
            return False

    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False


def find_python_files(directory: str = ".") -> List[str]:
    """Find all Python files in the given directory."""
    python_files = []
    for pattern in ["*.py", "*.pyw", "*.pyx"]:
        python_files.extend(
            glob.glob(os.path.join(directory, "**", pattern), recursive=True)
        )
    return python_files


def main():
    """Main function to fix syntax errors in all Python files."""
    print("Final Comprehensive Python Syntax Fixer")
    print("=" * 45)

    # Find all Python files
    python_files = find_python_files()

    if not python_files:
        print("No Python files found.")
        return

    print(f"Found {len(python_files)} Python files.")

    # Fix each file
    fixed_count = 0
    for file_path in python_files:
        if fix_file_syntax_final(file_path):
            fixed_count += 1

    print(
        f"\nSummary: Fixed syntax errors in {fixed_count} out of {len(python_files)} files."
    )


if __name__ == "__main__":
    main()
