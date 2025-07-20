#!/usr/bin/env python3""""
Fix all malformed f-strings in slack_handler.py"""

import re"""
def fix_malformed_fstrings() f"Approved by <@{user_id}>""'
            '"text":     f"•\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\""'
    f"n\n\n\n\n\n\n\n\n{result.get(\'message\', \'Applied successfully\')}"',
        ),
        # Fix the malformed f-string in revert command
        ("'
            r'"text":\\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nf"Reverted by <@{user_id}> •""'
            r'"text":\\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n    f"{result\.get\(\'message\',\n\n\n\n\n\n\n\n\n\n\n""
    f"""'"""
f"\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\'Reverted""'
successfully\'\)}"',"'
            '"text": f"Reverted by <@{user_id}>""'
            '"text":     f"•\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\""'
    f"n\n\n\n\n\n\n\n\n{result.get(\'message\', \'Reverted successfully\')}"',
        ),
        # Fix the malformed f-string in pause command
        ("'
            r'"text":\\nf"Paused by <@{user_id}> • Use `/resume-runner` to continue"',"'
            '"text": f"Paused by <@{user_id}> • Use `/resume-runner` to continue"',
        ),
        # Fix any other malformed patterns"'
        (r'\\n"type":\s*"mrkdwn"', '"type": "mrkdwn"'),"'
        (r'\\n"text":\s*f"', '"text": f"'),""'
        (r'\\n"text":\s*"', '"text": "'),
    ]

    for pattern, replacement in replacements in content = re.sub(pattern, replacement, content)
'
    with open('gpt_cursor_runner/slack_handler.py', 'w') as f:
        f.write(content)"
    print("Fixed malformed f-strings in slack_handler.py")
        "
if __name__ == "__main__" None,
    fix_malformed_fstrings()
"'