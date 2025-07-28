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
r'def \1():\n """\2"""',
content,
flags=re.MULTILINE,
)
content = re.sub(
r"def\s+(\w+)\s*\([^)]*\)\s*:\s*'''([^']*)$",
r"def \1():\n '''\2'''",
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

    # Fix unterminated strings with specific patterns
content = re.sub(r'"""([^"]*)"$', r'"""\1"""', content, flags=re.MULTILINE)
content = re.sub(r"'''([^']*)'$", r"'''\1'''", content, flags=re.MULTILINE)

    # Fix unterminated strings with quotes
content = re.sub(
r'"""([^"]*)"([^"]*)$', r'"""\1"\2"""', content, flags=re.MULTILINE
)
content = re.sub(
r"'''([^']*)'([^']*)$", r"'''\1'\2'''", content, flags=re.MULTILINE
)

    # Fix unterminated strings with multiple quotes
content = re.sub(
r'"""([^"]*)"([^"]*)"([^"]*)$', r'"""\1"\2"\3"""', content, flags=re.MULTILINE
)
content = re.sub(
r"'''([^']*)'([^']*)'([^']*)$", r"'''\1'\2'\3'''", content, flags=re.MULTILINE
)

    # Fix unterminated strings with escaped quotes
content = re.sub(
r'"""([^"]*)\\"([^"]*)$', r'"""\1\\"\2"""', content, flags=re.MULTILINE
)
content = re.sub(
r"'''([^']*)\\'([^']*)$", r"'''\1\\'\2'''", content, flags=re.MULTILINE
)

    # Fix unterminated strings with newlines
content = re.sub(
r'"""([^"]*)\n([^"]*)$', r'"""\1\n\2"""', content, flags=re.MULTILINE
)
content = re.sub(
r"'''([^']*)\n([^']*)$", r"'''\1\n\2'''", content, flags=re.MULTILINE
)

    # Fix unterminated strings with tabs
content = re.sub(
r'"""([^"]*)\t([^"]*)$', r'"""\1\t\2"""', content, flags=re.MULTILINE
)
content = re.sub(
r"'''([^']*)\t([^']*)$", r"'''\1\t\2'''", content, flags=re.MULTILINE
)

    # Fix unterminated strings with spaces
content = re.sub(
r'"""([^"]*)\s([^"]*)$', r'"""\1\s\2"""', content, flags=re.MULTILINE
)
content = re.sub(
r"'''([^']*)\s([^']*)$", r"'''\1\s\2'''", content, flags=re.MULTILINE
)

    # Fix unterminated strings with special characters
content = re.sub(
r'"""([^"]*)[^\w\s"]([^"]*)$',
r'"""\1[^\w\s"]\2"""',
content,
flags=re.MULTILINE,
)
content = re.sub(
r"'''([^']*)[^\w\s']([^']*)$",
r"'''\1[^\w\s']\2'''",
content,
flags=re.MULTILINE,
)

return content


def fix_file_final(file_path: str) -> bool:
"""Fix syntax errors in a single file with comprehensive patterns."""
try:
with open(file_path, 'r', encoding='utf-8') as f:
content = f.read()

original_content = content

        # Apply comprehensive fixes
content = fix_unterminated_strings_final(content)

        # If content changed, write it back
if content != original_content:
with open(file_path, 'w', encoding='utf-8') as f:
f.write(content)
print(f"✅ Fixed: {file_path}")
return True
else:
print(f"⏭️ No changes needed: {file_path}")
return False

except Exception as e:
print(f"❌ Error fixing {file_path}: {e}")
return False


def find_all_python_files() -> List[str]:
"""Find all Python files in the project including THOUGHTPILOT-AI packages."""
python_files = []

    # Common Python file patterns
patterns = [
"*.py",
"**/*.py",
"**/gpt_cursor_runner/**/*.py",
"**/scripts/**/*.py",
"**/tests/**/*.py",
"**/dist/**/*.py",
"THOUGHTPILOT-AI/**/*.py",
]

for pattern in patterns:
python_files.extend(glob.glob(pattern, recursive=True))

return list(set(python_files)) # Remove duplicates


def main():
"""Main function to fix all remaining syntax errors."""
print("🔧 Starting final comprehensive syntax error fix...")

    # Find all Python files
python_files = find_all_python_files()
print(f"📄 Found {len(python_files)} Python files")

    # Fix each file
fixed_count = 0
for file_path in python_files:
if fix_file_final(file_path):
fixed_count += 1

print(f"\n🎉 Final syntax error fix complete!")
print(f"📊 Summary:")
print(f" - Total files processed: {len(python_files)}")
print(f" - Files fixed: {fixed_count}")
print(f" - Files unchanged: {len(python_files) - fixed_count}")

    # Run final syntax check
print(f"\n🔍 Running final syntax check...")
os.system(
"python3 -m flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics | tail -5"
)


if __name__ == "__main__":
main()
