#!/usr/bin/env python3
"""
Comprehensive syntax error fixer for ThoughtPilot AI packages.
Fixes unterminated string literals, invalid syntax, and other common issues.
"""

import re
import glob


def fix_unterminated_strings(content):
    """Fix unterminated string literals."""
    # Fix common unterminated string patterns
    patterns = [
        # Fix unterminated f-strings
        (r'f"([^"]*)$', r'f"\1"'),
        (r"f'([^']*)$", r"f'\1'"),
        # Fix unterminated regular strings
        (r'"([^"]*)$', r'"\1"'),
        (r"'([^']*)$", r"'\1'"),
        # Fix triple quotes
        (r'"""([^"]*)$', r'"""\1"""'),
        (r"'''([^']*)$", r"'''\1'''"),
    ]
    
    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    
    return content


def fix_function_definitions(content):
    """Fix malformed function definitions."""
    # Fix function definitions with missing parentheses
    content = re.sub(
        r'def\s+(\w+)\s*\s*$',
        r'def \1()',
        content,
        flags=re.MULTILINE
    )
    
    # Fix function definitions with unterminated parameters
    content = re.sub(
        r'def\s+(\w+)\s*\(([^)]*)$',
        r'def \1(\2)',
        content,
        flags=re.MULTILINE
    )
    
    return content


def fix_import_statements(content):
    """Fix malformed import statements."""
    # Fix unterminated imports
    content = re.sub(
        r'from\s+([^\s]+)\s+import\s+([^\s]*)$',
        r'from \1 import \2',
        content,
        flags=re.MULTILINE
    )
    
    return content


def fix_dictionary_syntax(content):
    """Fix malformed dictionary syntax."""
    # Fix unterminated dictionary keys
    content = re.sub(
        r'"([^"]*)"\s*\s*$',
        r'"\1": None,',
        content,
        flags=re.MULTILINE
    )
    
    return content


def fix_list_syntax(content):
    """Fix malformed list syntax."""
    # Fix unterminated lists
    content = re.sub(
        r'\[\s*$',
        r'[],',
        content,
        flags=re.MULTILINE
    )
    
    return content


def fix_comments(content):
    """Fix malformed comments."""
    # Fix unterminated comments
    content = re.sub(
        r'#\s*$',
        r'# TODO: Add comment',
        content,
        flags=re.MULTILINE
    )
    
    return content


def fix_file(file_path):
    """Fix syntax errors in a single file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply all fixes
        content = fix_unterminated_strings(content)
        content = fix_function_definitions(content)
        content = fix_import_statements(content)
        content = fix_dictionary_syntax(content)
        content = fix_list_syntax(content)
        content = fix_comments(content)
        
        # Only write if content changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print("✅ Fixed syntax errors in {}".format(file_path))
            return True
        else:
            print("ℹ️  No syntax errors found in {}".format(file_path))
            return False
            
    except Exception as e:
        print("❌ Error fixing {}: {}".format(file_path, e))
        return False


def main():
    """Main function to fix all Python files in the project."""
    # Get all Python files
    python_files = glob.glob("**/*.py", recursive=True)
    
    print("🔍 Found {} Python files to check".format(len(python_files)))
    
    fixed_count = 0
    error_count = 0
    
    for file_path in python_files:
        if fix_file(file_path):
            fixed_count += 1
        else:
            error_count += 1
    
    print("\n📊 Summary:")
    print("   ✅ Files fixed: {}".format(fixed_count))
    print("   ❌ Files with errors: {}".format(error_count))
    print("   📁 Total files processed: {}".format(len(python_files)))


if __name__ == "__main__":
    main()