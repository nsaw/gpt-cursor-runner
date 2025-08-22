#!/usr/bin/env python3
"""
Efficient Syntax Error Fixer
Excludes THOUGHTPILOT-AI directory and handles resource constraints.
"""

import os
import re
from pathlib import Path


def should_exclude_file(file_path):
    """Check if file should be excluded from processing."""
    exclude_patterns = [
        'THOUGHTPILOT-AI',
        '.git',
        '__pycache__',
        'node_modules',
        '.venv',
        'venv',
        '*.egg-info',
        'dist',
        'build',
        'logs',
        'temp',
        '*.log'
    ]
    
    file_path_str = str(file_path)
    for pattern in exclude_patterns:
        if pattern in file_path_str:
            return True
    return False


def fix_unterminated_strings(content):
    """Fix unterminated string literals."""
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


def fix_bracket_mismatches(content):
    """Fix bracket and parenthesis mismatches."""
    # Fix common bracket issues
    content = re.sub(r'\[\s*$', r'[]', content, flags=re.MULTILINE)
    content = re.sub(r'\(\s*$', r'()', content, flags=re.MULTILINE)
    content = re.sub(r'{\s*$', r'{}', content, flags=re.MULTILINE)
    
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
    
    # Fix import statements with missing modules
    content = re.sub(
        r'import\s+([^\s]+)\s*$',
        r'import \1',
        content,
        flags=re.MULTILINE
    )
    
    return content


def fix_file(file_path):
    """Fix a single file efficiently."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply all fixes
        content = fix_unterminated_strings(content)
        content = fix_bracket_mismatches(content)
        content = fix_function_definitions(content)
        content = fix_import_statements(content)
        
        # Only write if content changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
        
    except Exception as e:
        print(f"❌ Error fixing {file_path}: {e}")
        return False


def find_python_files():
    """Find all Python files in the project efficiently."""
    python_files = []
    
    for root, dirs, files in os.walk('.'):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if not should_exclude_file(Path(root) / d)]
        
        for file in files:
            if file.endswith('.py'):
                file_path = Path(root) / file
                if not should_exclude_file(file_path):
                    python_files.append(file_path)
    
    return python_files


def main():
    """Main function for efficient syntax fixing."""
    print("🔧 Efficient Syntax Error Fixer")
    print("=" * 40)
    
    python_files = find_python_files()
    print(f"📁 Found {len(python_files)} Python files to check")
    
    fixed_count = 0
    error_count = 0
    
    for file_path in python_files:
        print(f"🔍 Checking {file_path}...")
        
        # First check if file compiles
        try:
            import subprocess
            subprocess.run(['python3', '-m', 'py_compile', str(file_path)], 
                         check=True, capture_output=True)
            print(f"✅ {file_path} - No syntax errors")
        except (subprocess.CalledProcessError, ImportError):
            print(f"❌ {file_path} - Has syntax errors, attempting to fix...")
            
            if fix_file(file_path):
                # Check if fix worked
                try:
                    subprocess.run(['python3', '-m', 'py_compile', str(file_path)], 
                                 check=True, capture_output=True)
                    print(f"✅ {file_path} - Fixed successfully")
                    fixed_count += 1
                except subprocess.CalledProcessError:
                    print(f"❌ {file_path} - Fix failed")
                    error_count += 1
            else:
                print(f"❌ {file_path} - Could not fix")
                error_count += 1
    
    print("\n📊 Summary:")
    print(f"✅ Files fixed: {fixed_count}")
    print(f"❌ Files with errors: {error_count}")
    print(f"📁 Total files checked: {len(python_files)}")


if __name__ == "__main__":
    main() 
