#!/usr/bin/env python3
"""
Fix syntax errors in slack_handler.py - Version 2
"""

import re


def fix_syntax_errors():
    file_path = "gpt_cursor_runner/slack_handler.py"

    with open(file_path, 'r') as f:
        content = f.read()

    # Fix the specific problematic patterns
    fixes = [
        # Fix the detailed roadmap text
        (
r'"text":\s*"(\*📜 GPT-Cursor Runner Detailed Roadmap\*\\n\\n\*Current Features:\*\\n•
Code patch\ncreation and application\\n• Real-time patch status tracking\\n• Dashboard
for patch\nlogs\\n• Auto-patching with approval\\n• System status monitoring\\n• Command
center for\nall actions\\n\\n\*Future Plans:\*\\n• Advanced error handling and
recovery\\n• Multi-language\nsupport\\n• More sophisticated patch logic\\n• Enhanced
dashboard features\\n• AI-powered\nsuggestions)"',
            r'"text": "\1"',
        ),
        # Fix other multi-line strings
        (r'"text":\s*"([^"]*)\n([^"]*)"', r'"text": "\1\\n\2"'),
    ]

    fixed_content = content
    changes_made = 0

    for pattern, replacement in fixes:
        matches = re.findall(pattern, fixed_content, re.MULTILINE | re.DOTALL)
        if matches:
            fixed_content = re.sub(
                pattern, replacement, fixed_content, flags=re.MULTILINE | re.DOTALL
            )
            changes_made += len(matches)
            print(f"Fixed {len(matches)} pattern(s)")

    # Manual fixes for specific problematic lines
    manual_fixes = [
        # Line 982 - Detailed roadmap
        (
'"text": "*📜 GPT-Cursor Runner Detailed Roadmap*\\n\\n*Current Features:*\\n• Code
patch\ncreation and application\\n• Real-time patch status tracking\\n• Dashboard for
patch\nlogs\\n• Auto-patching with approval\\n• System status monitoring\\n• Command
center for\nall actions\\n\\n*Future Plans:*\\n• Advanced error handling and
recovery\\n• Multi-language\nsupport\\n• More sophisticated patch logic\\n• Enhanced
dashboard features\\n• AI-powered\nsuggestions"',
'"text": "*📜 GPT-Cursor Runner Detailed Roadmap*\\n\\n*Current Features:*\\n• Code patch
creation and application\\n• Real-time patch status tracking\\n• Dashboard for patch
logs\\n• Auto-patching with approval\\n• System status monitoring\\n• Command center for
all actions\\n\\n*Future Plans:*\\n• Advanced error handling and recovery\\n•
Multi-language support\\n• More sophisticated patch logic\\n• Enhanced dashboard
features\\n• AI-powered suggestions"',
        ),
    ]

    for old, new in manual_fixes:
        if old in fixed_content:
            fixed_content = fixed_content.replace(old, new)
            changes_made += 1
            print("Applied manual fix")

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
        import sys

        sys.exit(1)
