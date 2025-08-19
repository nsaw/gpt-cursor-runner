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
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
#!/usr/bin/env python3
"""
Comprehensive syntax error fixer for all remaining issues.
This script fixes common Python syntax errors in files.
"""

import os
import re
import glob
from typing import List


def fix_all_syntax_errors(content: str) -> str:
    """Fix all types of syntax errors in content."""

    # Fix unterminated docstrings at file start
    content = re.sub(r'^"""([^"]*)$', r'"""\1"""', content, flags=re.MULTILINE)
    content = re.sub(r"^'''([^']*)$", r"'''\1'''", content, flags=re.MULTILINE)

    # Fix unterminated docstrings in function definitions
    content = re.sub(
        r'def\s+(\w+)\s*\([^)]*\)\s*"""([^"]*)$',
        r'def \1()\n    """\2"""',
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"def\s+(\w+)\s*\([^)]*\)\s*'''([^']*)$",
        r"def \1()\n    '''\2'''",
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

    # Fix unterminated strings in format strings
    content = re.sub(
        r'format\s*\(\s*"""([^"]*)$', r'format("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"format\s*\(\s*'''([^']*)$", r"format('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in join calls
    content = re.sub(
        r'join\s*\(\s*"""([^"]*)$', r'join("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"join\s*\(\s*'''([^']*)$", r"join('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in split calls
    content = re.sub(
        r'split\s*\(\s*"""([^"]*)$', r'split("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"split\s*\(\s*'''([^']*)$", r"split('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in replace calls
    content = re.sub(
        r'replace\s*\(\s*"""([^"]*)$', r'replace("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"replace\s*\(\s*'''([^']*)$", r"replace('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in strip calls
    content = re.sub(
        r'strip\s*\(\s*"""([^"]*)$', r'strip("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"strip\s*\(\s*'''([^']*)$", r"strip('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in lstrip calls
    content = re.sub(
        r'lstrip\s*\(\s*"""([^"]*)$', r'lstrip("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"lstrip\s*\(\s*'''([^']*)$", r"lstrip('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in rstrip calls
    content = re.sub(
        r'rstrip\s*\(\s*"""([^"]*)$', r'rstrip("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"rstrip\s*\(\s*'''([^']*)$", r"rstrip('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in startswith calls
    content = re.sub(
        r'startswith\s*\(\s*"""([^"]*)$',
        r'startswith("""\1""")',
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"startswith\s*\(\s*'''([^']*)$",
        r"startswith('''\1''')",
        content,
        flags=re.MULTILINE,
    )

    # Fix unterminated strings in endswith calls
    content = re.sub(
        r'endswith\s*\(\s*"""([^"]*)$',
        r'endswith("""\1""")',
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"endswith\s*\(\s*'''([^']*)$",
        r"endswith('''\1''')",
        content,
        flags=re.MULTILINE,
    )

    # Fix unterminated strings in find calls
    content = re.sub(
        r'find\s*\(\s*"""([^"]*)$', r'find("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"find\s*\(\s*'''([^']*)$", r"find('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in index calls
    content = re.sub(
        r'index\s*\(\s*"""([^"]*)$', r'index("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"index\s*\(\s*'''([^']*)$", r"index('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in count calls
    content = re.sub(
        r'count\s*\(\s*"""([^"]*)$', r'count("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"count\s*\(\s*'''([^']*)$", r"count('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in encode calls
    content = re.sub(
        r'encode\s*\(\s*"""([^"]*)$', r'encode("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"encode\s*\(\s*'''([^']*)$", r"encode('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in decode calls
    content = re.sub(
        r'decode\s*\(\s*"""([^"]*)$', r'decode("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"decode\s*\(\s*'''([^']*)$", r"decode('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in title calls
    content = re.sub(
        r'title\s*\(\s*"""([^"]*)$', r'title("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"title\s*\(\s*'''([^']*)$", r"title('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in upper calls
    content = re.sub(
        r'upper\s*\(\s*"""([^"]*)$', r'upper("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"upper\s*\(\s*'''([^']*)$", r"upper('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in lower calls
    content = re.sub(
        r'lower\s*\(\s*"""([^"]*)$', r'lower("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"lower\s*\(\s*'''([^']*)$", r"lower('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in capitalize calls
    content = re.sub(
        r'capitalize\s*\(\s*"""([^"]*)$',
        r'capitalize("""\1""")',
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"capitalize\s*\(\s*'''([^']*)$",
        r"capitalize('''\1''')",
        content,
        flags=re.MULTILINE,
    )

    # Fix unterminated strings in swapcase calls
    content = re.sub(
        r'swapcase\s*\(\s*"""([^"]*)$',
        r'swapcase("""\1""")',
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"swapcase\s*\(\s*'''([^']*)$",
        r"swapcase('''\1''')",
        content,
        flags=re.MULTILINE,
    )

    # Fix unterminated strings in casefold calls
    content = re.sub(
        r'casefold\s*\(\s*"""([^"]*)$',
        r'casefold("""\1""")',
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"casefold\s*\(\s*'''([^']*)$",
        r"casefold('''\1''')",
        content,
        flags=re.MULTILINE,
    )

    # Fix unterminated strings in center calls
    content = re.sub(
        r'center\s*\(\s*"""([^"]*)$', r'center("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"center\s*\(\s*'''([^']*)$", r"center('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in ljust calls
    content = re.sub(
        r'ljust\s*\(\s*"""([^"]*)$', r'ljust("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"ljust\s*\(\s*'''([^']*)$", r"ljust('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in rjust calls
    content = re.sub(
        r'rjust\s*\(\s*"""([^"]*)$', r'rjust("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"rjust\s*\(\s*'''([^']*)$", r"rjust('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in zfill calls
    content = re.sub(
        r'zfill\s*\(\s*"""([^"]*)$', r'zfill("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"zfill\s*\(\s*'''([^']*)$", r"zfill('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in expandtabs calls
    content = re.sub(
        r'expandtabs\s*\(\s*"""([^"]*)$',
        r'expandtabs("""\1""")',
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"expandtabs\s*\(\s*'''([^']*)$",
        r"expandtabs('''\1''')",
        content,
        flags=re.MULTILINE,
    )

    # Fix unterminated strings in translate calls
    content = re.sub(
        r'translate\s*\(\s*"""([^"]*)$',
        r'translate("""\1""")',
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"translate\s*\(\s*'''([^']*)$",
        r"translate('''\1''')",
        content,
        flags=re.MULTILINE,
    )

    # Fix unterminated strings in maketrans calls
    content = re.sub(
        r'maketrans\s*\(\s*"""([^"]*)$',
        r'maketrans("""\1""")',
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"maketrans\s*\(\s*'''([^']*)$",
        r"maketrans('''\1''')",
        content,
        flags=re.MULTILINE,
    )

    # Fix unterminated strings in partition calls
    content = re.sub(
        r'partition\s*\(\s*"""([^"]*)$',
        r'partition("""\1""")',
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"partition\s*\(\s*'''([^']*)$",
        r"partition('''\1''')",
        content,
        flags=re.MULTILINE,
    )

    # Fix unterminated strings in rpartition calls
    content = re.sub(
        r'rpartition\s*\(\s*"""([^"]*)$',
        r'rpartition("""\1""")',
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"rpartition\s*\(\s*'''([^']*)$",
        r"rpartition('''\1''')",
        content,
        flags=re.MULTILINE,
    )

    # Fix unterminated strings in splitlines calls
    content = re.sub(
        r'splitlines\s*\(\s*"""([^"]*)$',
        r'splitlines("""\1""")',
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"splitlines\s*\(\s*'''([^']*)$",
        r"splitlines('''\1''')",
        content,
        flags=re.MULTILINE,
    )

    # Fix unterminated strings in isalnum calls
    content = re.sub(
        r'isalnum\s*\(\s*"""([^"]*)$', r'isalnum("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"isalnum\s*\(\s*'''([^']*)$", r"isalnum('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in isalpha calls
    content = re.sub(
        r'isalpha\s*\(\s*"""([^"]*)$', r'isalpha("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"isalpha\s*\(\s*'''([^']*)$", r"isalpha('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in isdigit calls
    content = re.sub(
        r'isdigit\s*\(\s*"""([^"]*)$', r'isdigit("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"isdigit\s*\(\s*'''([^']*)$", r"isdigit('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in islower calls
    content = re.sub(
        r'islower\s*\(\s*"""([^"]*)$', r'islower("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"islower\s*\(\s*'''([^']*)$", r"islower('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in isupper calls
    content = re.sub(
        r'isupper\s*\(\s*"""([^"]*)$', r'isupper("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"isupper\s*\(\s*'''([^']*)$", r"isupper('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in istitle calls
    content = re.sub(
        r'istitle\s*\(\s*"""([^"]*)$', r'istitle("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"istitle\s*\(\s*'''([^']*)$", r"istitle('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in isspace calls
    content = re.sub(
        r'isspace\s*\(\s*"""([^"]*)$', r'isspace("""\1""")', content, flags=re.MULTILINE
    )
    content = re.sub(
        r"isspace\s*\(\s*'''([^']*)$", r"isspace('''\1''')", content, flags=re.MULTILINE
    )

    # Fix unterminated strings in isdecimal calls
    content = re.sub(
        r'isdecimal\s*\(\s*"""([^"]*)$',
        r'isdecimal("""\1""")',
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"isdecimal\s*\(\s*'''([^']*)$",
        r"isdecimal('''\1''')",
        content,
        flags=re.MULTILINE,
    )

    # Fix unterminated strings in isnumeric calls
    content = re.sub(
        r'isnumeric\s*\(\s*"""([^"]*)$',
        r'isnumeric("""\1""")',
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"isnumeric\s*\(\s*'''([^']*)$",
        r"isnumeric('''\1''')",
        content,
        flags=re.MULTILINE,
    )

    # Fix unterminated strings in isidentifier calls
    content = re.sub(
        r'isidentifier\s*\(\s*"""([^"]*)$',
        r'isidentifier("""\1""")',
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"isidentifier\s*\(\s*'''([^']*)$",
        r"isidentifier('''\1''')",
        content,
        flags=re.MULTILINE,
    )

    # Fix unterminated strings in isprintable calls
    content = re.sub(
        r'isprintable\s*\(\s*"""([^"]*)$',
        r'isprintable("""\1""")',
        content,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"isprintable\s*\(\s*'''([^']*)$",
        r"isprintable('''\1''')",
        content,
        flags=re.MULTILINE,
    )

    return content


def fix_file_syntax(file_path: str) -> bool:
    """Fix syntax errors in a single file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        original_content = content
        fixed_content = fix_all_syntax_errors(content)

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
    print("Comprehensive Python Syntax Fixer")
    print("=" * 40)

    # Find all Python files
    python_files = find_python_files()

    if not python_files:
        print("No Python files found.")
        return

    print(f"Found {len(python_files)} Python files.")

    # Fix each file
    fixed_count = 0
    for file_path in python_files:
        if fix_file_syntax(file_path):
            fixed_count += 1

    print(
        f"\nSummary: Fixed syntax errors in {fixed_count} out of {len(python_files)} files."
    )


if __name__ == "__main__":
    main()
