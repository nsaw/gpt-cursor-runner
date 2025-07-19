#!/usr/bin/env python3
"""
Fix syntax errors in slack_handler.py
"""

import re
import sys


def fix_syntax_errors():
    file_path = "gpt_cursor_runner/slack_handler.py"

    with open(file_path, 'r') as f:
        content = f.read()

    # Pattern to find unterminated string literals
    # Look for lines that have "text": followed by a string that spans multiple lines
    pattern = r'("text":\s*{[^}]*"type":\s*"mrkdwn",\s*"text":\s*"[^"]*\n[^"]*")'

    # Find all matches
    matches = re.finditer(pattern, content, re.MULTILINE | re.DOTALL)

    fixed_content = content
    changes_made = 0

    for match in matches:
        original = match.group(1)
        # Fix the unterminated string by properly closing it
        fixed = original.replace('\n', '\\n').replace('",', '",')
        fixed_content = fixed_content.replace(original, fixed)
        changes_made += 1
        print(
            f"Fixed syntax error at line {content[:match.start()].count(chr(10)) + 1}"
        )

    # Write the fixed content back
    with open(file_path, 'w') as f:
        f.write(fixed_content)

    print(f"Fixed {changes_made} syntax errors in {file_path}")
    return changes_made


if __name__ == "__main__":
    try:
        changes = fix_syntax_errors()
        if changes > 0:
            print(f"✅ Successfully fixed {changes} syntax errors")
        else:
            print("✅ No syntax errors found")
    except Exception as e:
        print(f"❌ Error fixing syntax: {e}")
        sys.exit(1)
