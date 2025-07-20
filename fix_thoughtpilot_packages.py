#!/usr/bin/env python3
"""
Fix all syntax errors in THOUGHTPILOT-AI packages.
"""

import os
import glob
import re

def fix_file_content(content):
    """Fix common syntax errors in Python files."""
    
    # Fix unterminated docstrings
    content = re.sub(r'"""([^"]*)$', r'"""\1"""', content, flags=re.MULTILINE)
    content = re.sub(r"'''([^']*)$", r"'''\1'''", content, flags=re.MULTILINE)
    
    # Fix malformed __all__ lists
    content = re.sub(r'__all__\s*=\s*\[([^\]]*),?\s*\]', 
                     r'__all__ = [\n    \1,\n]', content)
    
    # Fix unterminated strings in assignments
    content = re.sub(r'(\w+)\s*=\s*"([^"]*)$', r'\1 = "\2"', content, flags=re.MULTILINE)
    content = re.sub(r"(\w+)\s*=\s*'([^']*)$", r"\1 = '\2'", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in function calls
    content = re.sub(r'(\w+)\s*\(\s*"([^"]*)$', r'\1("\2")', content, flags=re.MULTILINE)
    content = re.sub(r"(\w+)\s*\(\s*'([^']*)$", r"\1('\2')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in print statements
    content = re.sub(r'print\s*\(\s*"([^"]*)$', r'print("\1")', content, flags=re.MULTILINE)
    content = re.sub(r"print\s*\(\s*'([^']*)$", r"print('\1')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in return statements
    content = re.sub(r'return\s+"([^"]*)$', r'return "\1"', content, flags=re.MULTILINE)
    content = re.sub(r"return\s+'([^']*)$", r"return '\1'", content, flags=re.MULTILINE)
    
    return content

def fix_thoughtpilot_packages():
    """Fix all THOUGHTPILOT-AI packages."""
    
    # Find all Python files in THOUGHTPILOT-AI packages
    thoughtpilot_files = glob.glob("THOUGHTPILOT-AI/**/*.py", recursive=True)
    
    print(f"Found {len(thoughtpilot_files)} Python files in THOUGHTPILOT-AI packages")
    
    fixed_count = 0
    
    for file_path in thoughtpilot_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            content = fix_file_content(content)
            
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ Fixed: {file_path}")
                fixed_count += 1
            else:
                print(f"⏭️  No changes: {file_path}")
                
        except Exception as e:
            print(f"❌ Error fixing {file_path}: {e}")
    
    print(f"\n🎉 Fixed {fixed_count} files in THOUGHTPILOT-AI packages")

if __name__ == "__main__":
    fix_thoughtpilot_packages() 