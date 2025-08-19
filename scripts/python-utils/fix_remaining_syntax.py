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
Targeted fix for remaining unterminated string literals.
"""

import os
import re
import glob
from typing import List


def fix_unterminated_strings_in_file(file_path: str) -> bool:
    """Fix unterminated string literals in a specific file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        original_content = content

        # Patterns to fix unterminated strings
        patterns = [
            # Fix unterminated docstrings at file start
            (r'^"""([^"]*)$', r'"""\1"""', re.MULTILINE),
            (r"^'''([^']*)$", r"'''\1'''", re.MULTILINE),
            # Fix unterminated strings in variable assignments
            (r'(\w+)\s*=\s*"""([^"]*)$', r'\1 = """\2"""', re.MULTILINE),
            (r"(\w+)\s*=\s*'''([^']*)$", r"\1 = '''\2'''", re.MULTILINE),
            # Fix unterminated strings in print statements
            (r'print\s*\(\s*"""([^"]*)$', r'print("""\1""")', re.MULTILINE),
            (r"print\s*\(\s*'''([^']*)$", r"print('''\1''')", re.MULTILINE),
            # Fix unterminated strings in return statements
            (r'return\s+"""([^"]*)$', r'return """\1"""', re.MULTILINE),
            (r"return\s+'''([^']*)$", r"return '''\1'''", re.MULTILINE),
            # Fix unterminated strings in function calls
            (r'(\w+)\s*\(\s*"""([^"]*)$', r'\1("""\2""")', re.MULTILINE),
            (r"(\w+)\s*\(\s*'''([^']*)$", r"\1('''\2''')", re.MULTILINE),
            # Fix unterminated strings in list/dict literals
            (r'\[\s*"""([^"]*)$', r'["""\1"""]', re.MULTILINE),
            (r"\[\s*'''([^']*)$", r"['''\1''']", re.MULTILINE),
            # Fix unterminated strings in dict literals
            (r'{\s*"""([^"]*)$', r'{"""\1"""}', re.MULTILINE),
            (r"{\s*'''([^']*)$", r"{'''\1'''}", re.MULTILINE),
            # Fix unterminated strings in tuple literals
            (r'\(\s*"""([^"]*)$', r'("""\1""")', re.MULTILINE),
            (r"\(\s*'''([^']*)$", r"('''\1''')", re.MULTILINE),
            # Fix unterminated strings in f-strings
            (r'f"""([^"]*)$', r'f"""\1"""', re.MULTILINE),
            (r"f'''([^']*)$", r"f'''\1'''", re.MULTILINE),
            # Fix unterminated strings in raw strings
            (r'r"""([^"]*)$', r'r"""\1"""', re.MULTILINE),
            (r"r'''([^']*)$", r"r'''\1'''", re.MULTILINE),
            # Fix unterminated strings in bytes literals
            (r'b"""([^"]*)$', r'b"""\1"""', re.MULTILINE),
            (r"b'''([^']*)$", r"b'''\1'''", re.MULTILINE),
            # Fix unterminated strings in unicode literals
            (r'u"""([^"]*)$', r'u"""\1"""', re.MULTILINE),
            (r"u'''([^']*)$", r"u'''\1'''", re.MULTILINE),
        ]

        for pattern, replacement, flags in patterns:
            content = re.sub(pattern, replacement, content, flags=flags)

        # If content changed, write it back
        if content != original_content:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"✅ Fixed {file_path}")
            return True
        else:
            print(f"⏭️  No changes needed {file_path}")
            return False

    except Exception as e:
        print(f"❌ Error fixing {file_path}: {e}")
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
    """Fix remaining syntax errors."""
    print("🔧 Fixing remaining syntax errors...")

    # Files with known issues
    problem_files = [
        "autolinter.py",
        "braun_daemon.py",
        "braun_patch_processor.py",
        "cyops_daemon.py",
        "dist/ThoughtPilot-Enterprise/autolinter.py",
        "dist/ThoughtPilot-Enterprise/fix_all_syntax.py",
        "dist/ThoughtPilot-Enterprise/fix_linter_errors.py",
        "dist/ThoughtPilot-Enterprise/fix_syntax.py",
        "dist/ThoughtPilot-Enterprise/gpt_cursor_runner/__init__.py",
        "dist/ThoughtPilot-Enterprise/gpt_cursor_runner/apply_patch.py",
        "dist/ThoughtPilot-Enterprise/gpt_cursor_runner/config_manager.py",
        "dist/ThoughtPilot-Enterprise/gpt_cursor_runner/dashboard.py",
        "dist/ThoughtPilot-Enterprise/gpt_cursor_runner/demo_workflow.py",
        "dist/ThoughtPilot-Enterprise/gpt_cursor_runner/event_logger.py",
        "dist/ThoughtPilot-Enterprise/gpt_cursor_runner/event_viewer.py",
        "dist/ThoughtPilot-Enterprise/gpt_cursor_runner/file_watcher.py",
        "dist/ThoughtPilot-Enterprise/gpt_cursor_runner/main.py",
        "dist/ThoughtPilot-Enterprise/gpt_cursor_runner/patch_classifier.py",
        "dist/ThoughtPilot-Enterprise/gpt_cursor_runner/patch_metrics.py",
        "dist/ThoughtPilot-Enterprise/gpt_cursor_runner/patch_reverter.py",
    ]

    fixed_count = 0
    for file_path in problem_files:
        if os.path.exists(file_path):
            if fix_unterminated_strings_in_file(file_path):
                fixed_count += 1

    print(f"\n🎉 Fixed {fixed_count} files with remaining syntax errors")


if __name__ == "__main__":
    main()
