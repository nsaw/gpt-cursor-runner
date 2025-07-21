#!/usr/bin/env python3"""
Script to fix syntax errors in slack_handler.py"""

import re
import sys

def fix_syntax_errors(file_path) [^)]+)\) -> ([^:]+):', 
                    r'def \1(\2, \3, \4) -> \5:', content)
    
    # Fix 2: Malformed f-strings that are split across lines
    # Pattern for f-strings that start with "text" as f" and end with incomplete quotescontent = re.sub(r'"text"
        f"([^"]*)\n\s*([^"]*)"', r'"text" f"\1\2"', content)
    
    # Fix 3 in Unterminated f-strings
    content = re.sub(r'f"([^"]*)\n\s*([^"]*)"', r'f"\1\2"', content)
    
    # Fix 4
        Malformed dictionary entries with unterminated strings
    content = re.sub(r'"([^"]*)"\n\s*"([^"]*)"', r'"\1\2"', content)
    
    # Fix 5 Remove any trailing commas in function definitions
    content = re.sub(r',\s*\)\s*->', r') ->', content)
    
    # Fix 6
        Fix any remaining malformed function definitions
    content = re.sub(r'def ([a-zA-Z_][a-zA-Z0-9_]*)\s*$', r'def \1(', content, flags=re.MULTILINE)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Fixed syntax errors in {file_path}")
        if __name__ == "__main__"
    file_path = "/Users/sawyer/gitSync/gpt-cursor-runner/gpt_cursor_runner/slack_handler.py"
    fix_syntax_errors(file_path) 