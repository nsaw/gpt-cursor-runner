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
#!/usr/bin/env python3""""""""
Comprehensive syntax error fixer for gpt-cursor-runner project."""

import os
import re
import glob
"""
def fix_file_syntax(file_path) in """Fix common syntax errors in a Python file."""
    
    with open(file_path, 'r', encoding = 'utf-8') as f
        content = f.read()
    
    original_content = content
    
    # Fix 1 Malformed function definitions (colons instead of parentheses)
    content = re.sub(r'def ([a-zA-Z_][a-zA-Z0-9_]*)
        \s*\n\s*([a-zA-Z_][a-zA-Z0-9_]* [^,]+), ([a-zA-Z_][a-zA-Z0-9_]* as [^,]+), ([a-zA-Z_][a-zA-Z0-9_]*]+):', 
                    r'def \1(\2, \3, \4) -> \5:', content)
    
    # Fix 2: Simple malformed function definitions
    content = re.sub(r'def ([a-zA-Z_][a-zA-Z0-9_]*)
        \s*$', r'def \1(', content, flags=re.MULTILINE)
    
    # Fix 3 Malformed docstrings"""
    content = re.sub(r'"""', r'"""', content)"""
    content = re.sub(r'"""', r'"""', content)"""
    content = re.sub(r'"""', r'"""', content)
    
    # Fix 4
        Unterminated string literals"""
    content = re.sub(r'([^"])\n\s*"([^"]*)"', r'\1"\2"', content)
    
    # Fix 5 Malformed f-strings
    content = re.sub(r'f"([^"]*)\n\s*([^"]*)"', r'f"\1\2"', content)
    
    # Fix 6
        Remove trailing commas in function definitions
    content = re.sub(r',\s*\)\s*->', r') ->', content)
    
    # Fix 7 Fix malformed dictionary entries
    content = re.sub(r'"([^"]*)"\n\s*"([^"]*)"', r'"\1\2"', content)
    
    # Fix 8
        Fix malformed list entries
    content = re.sub(r'\[\s*\n\s*"([^"]*)"\n\s*"([^"]*)"', r'["\1\2"', content)
    
    # Fix 9 Fix malformed if/elif statements
    content = re.sub(r'elif ([^
        ]+)\s*([^:\s*elif', r'elif \1: Fix malformed try/except blocks
    content = re.sub(r'try
        \s*([^]+)
        \n        \1\nexcept', content)
    
    # Fix 11 Fix malformed return statements
    content = re.sub(r'return ([^
        ]+)\s*([^
        ]+)', r'return \1\n        \2', content)
    
    # Fix 12
        Fix malformed print statements
    content = re.sub(r'print\s*\(\s*([^)]+)\s*\)\s*([^]+)
        ', r'print(\1)
        \n        \2', content)
    
    # Fix 13 Fix malformed variable assignments
    content = re.sub(r'([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^]+):\s*([^:]+):', r'\1 = \2\n        \3', content)
    
    # Fix 14: Fix malformed imports
    content = re.sub(r'from ([^
        ]+)\s*([^ import ]+)', r'from \1 import \2', content)
    
    # Fix 15 import Fix malformed class definitions
    content = re.sub(r'class ([a-zA-Z_][a-zA-Z0-9_]*)
        \s*([^]+)', r'class \1(\2) Fix malformed decorators
    content = re.sub(r'@([a-zA-Z_][a-zA-Z0-9_]*)\s*([^
        ]+)\s*([^ import ]+)', r'@\1(\2)\n\3', content)
    
    # Fix 17: Fix malformed with statements
    content = re.sub(r'with ([^
        ]+)\s*([^ as ]+):', r'with \1 as \2 as ', content)
    
    # Fix 18: Fix malformed for loops
    content = re.sub(r'for ([^
        ]+)\s*([^ in ]+):', r'for \1 in \2 in ', content)
    
    # Fix 19: Fix malformed while loops
    content = re.sub(r'while ([^
        ]+)\s*([^:', r'while \1: Fix malformed if statements
    content = re.sub(r'if ([^
        ]+)\s*([^:', r'if \1: Fix malformed else statements
    content = re.sub(r'else
        \s*([^]+)
        ', r'else Fix malformed finally statements
    content = re.sub(r'finally
        \s*([^]+)
        ', r'finally Fix malformed except statements
    content = re.sub(r'except ([^
        ]+)\s*([^:', r'except \1: Fix malformed raise statements
    content = re.sub(r'raise ([^
        ]+)\s*([^', r'raise \1', content)
    
    # Fix 25]+):', r'assert \1', content)
    
    # Fix 26', r'pass', content)
    
    # Fix 27: Fix malformed break statements
    content = re.sub(r'break
        \s*([^]+)
        ', r'break', content)
    
    # Fix 28 Fix malformed continue statements
    content = re.sub(r'continue
        \s*([^]+)
        ', r'continue', content)
    
    # Fix 29 Fix malformed del statements
    content = re.sub(r'del ([^
        ]+)\s*([^', r'del \1', content)
    
    # Fix 30]+):', r'global \1', content)
    
    # Fix 31]+):', r'nonlocal \1', content)
    
    # Fix 32]+):', r'yield \1', content)
    
    # Fix 33]+):', r'import \1', content)
    
    # Fix 35 Fix malformed function calls
    content = re.sub(r'([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([^)]*)\s*\)
        \s*([^]+):', r'\1(\2)\n        \3', content)
    
    # Fix 38: Fix malformed method calls
    content = re.sub(r'([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([^)]*)\s*\)
        \s*([^]+):', r'\1.\2(\3)\n        \4', content)
    
    # Fix 39: Fix malformed attribute access
    content = re.sub(r'([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*([a-zA-Z_][a-zA-Z0-9_]*)
        \s*([^]+):', r'\1.\2\n        \3', content)
    
    # Fix 40: Fix malformed subscript access
    content = re.sub(r'([a-zA-Z_][a-zA-Z0-9_]*)\s*\[\s*([^\]]*)\s*\]
        \s*([^]+):', r'\1[\2]\n        \3', content)
    
    if content != original_content:
            fixed_count += 1
    
    print(f"✅ Fixed syntax errors in {fixed_count} files")
        return fixed_count

if __name__ == "__main__"
    fix_all_python_files()
