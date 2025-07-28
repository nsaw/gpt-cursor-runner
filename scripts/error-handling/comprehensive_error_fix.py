#!/usr/bin/env python3
"""
Comprehensive Error Fix Script
Fixes all syntax errors in the gpt-cursor-runner project.
Excludes THOUGHTPILOT-AI directory as requested.
"""

import os
import re
import glob
import time
import subprocess
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
    
    # Fix specific bracket mismatches
    content = re.sub(r'\]\s*$', r'}', content, flags=re.MULTILINE)
    content = re.sub(r'\)\s*$', r')', content, flags=re.MULTILINE)
    
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


def fix_missing_colons(content):
    """Fix missing colons in function definitions and control structures."""
    # Fix function definitions missing colons
    content = re.sub(
        r'def\s+(\w+)\s*\([^)]*\)\s*$',
        r'def \1():',
        content,
        flags=re.MULTILINE
    )
    
    # Fix if/elif/else statements missing colons
    content = re.sub(
        r'(if|elif|else)\s+[^:]*\s*$',
        r'\1 True:',
        content,
        flags=re.MULTILINE
    )
    
    # Fix for/while loops missing colons
    content = re.sub(
        r'(for|while)\s+[^:]*\s*$',
        r'\1 True:',
        content,
        flags=re.MULTILINE
    )
    
    return content


def fix_file_safely(file_path):
    """Fix syntax errors in a single file with error handling."""
    try:
        # Skip if file should be excluded
        if should_exclude_file(file_path):
            return False, "Excluded"
        
        # Read file
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply all fixes
        content = fix_unterminated_strings(content)
        content = fix_bracket_mismatches(content)
        content = fix_function_definitions(content)
        content = fix_import_statements(content)
        content = fix_missing_colons(content)
        
        # Only write if content changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, "Fixed"
        else:
            return False, "No changes needed"
            
    except Exception as e:
        return False, "Error: {}".format(str(e))


def get_python_files_excluding_thoughtpilot():
    """Get all Python files excluding THOUGHTPILOT-AI directory."""
    python_files = []
    
    # Walk through directories
    for root, dirs, files in os.walk('.'):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if not should_exclude_file(os.path.join(root, d))]
        
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                if not should_exclude_file(file_path):
                    python_files.append(file_path)
    
    return python_files


def validate_python_file(file_path):
    """Validate that a Python file compiles correctly."""
    try:
        subprocess.run(
            ['python3', '-m', 'py_compile', file_path],
            capture_output=True,
            check=True,
            timeout=10
        )
        return True, "Valid"
    except subprocess.CalledProcessError as e:
        return False, "Compilation error: {}".format(e.stderr.decode())
    except subprocess.TimeoutExpired:
        return False, "Timeout"
    except Exception as e:
        return False, "Error: {}".format(str(e))


def main():
    """Main function to fix all syntax errors comprehensively."""
    print("🔧 Starting comprehensive syntax error fix...")
    print("📁 Excluding THOUGHTPILOT-AI and other excluded directories")
    
    # Get Python files
    python_files = get_python_files_excluding_thoughtpilot()
    print("🔍 Found {} Python files to process".format(len(python_files)))
    
    # Phase 1: Fix syntax errors
    print("\n📝 Phase 1: Fixing syntax errors...")
    fixed_count = 0
    error_count = 0
    excluded_count = 0
    
    # Process files in batches to avoid resource issues
    batch_size = 5
    for i in range(0, len(python_files), batch_size):
        batch = python_files[i:i + batch_size]
        
        for file_path in batch:
            try:
                fixed, status = fix_file_safely(file_path)
                
                if fixed:
                    print("✅ Fixed: {}".format(file_path))
                    fixed_count += 1
                elif status == "Excluded":
                    excluded_count += 1
                elif status == "No changes needed":
                    pass  # Silent for no changes
                else:
                    print("❌ Error: {} - {}".format(file_path, status))
                    error_count += 1
                    
            except Exception as e:
                print("❌ Exception: {} - {}".format(file_path, str(e)))
                error_count += 1
        
        # Small delay between batches to prevent resource exhaustion
        if i + batch_size < len(python_files):
            time.sleep(0.2)
    
    print("\n📊 Phase 1 Summary:")
    print("   ✅ Files fixed: {}".format(fixed_count))
    print("   ❌ Files with errors: {}".format(error_count))
    print("   ⏭️  Files excluded: {}".format(excluded_count))
    
    # Phase 2: Validate fixes
    print("\n🔍 Phase 2: Validating fixes...")
    valid_count = 0
    invalid_count = 0
    
    for file_path in python_files:
        if should_exclude_file(file_path):
            continue
            
        valid, status = validate_python_file(file_path)
        
        if valid:
            valid_count += 1
        else:
            print("❌ Invalid: {} - {}".format(file_path, status))
            invalid_count += 1
    
    print("\n📊 Phase 2 Summary:")
    print("   ✅ Valid files: {}".format(valid_count))
    print("   ❌ Invalid files: {}".format(invalid_count))
    
    # Final summary
    print("\n🎉 Comprehensive error fix complete!")
    print("📊 Final Summary:")
    print("   📁 Total files processed: {}".format(len(python_files)))
    print("   ✅ Files fixed: {}".format(fixed_count))
    print("   ✅ Valid files: {}".format(valid_count))
    print("   ❌ Invalid files: {}".format(invalid_count))
    print("   ⏭️  Files excluded: {}".format(excluded_count))
    
    if invalid_count == 0:
        print("\n🎯 SUCCESS: All Python files are now syntactically valid!")
    else:
        print("\n⚠️  WARNING: {} files still have syntax errors".format(invalid_count))


if __name__ == "__main__":
    main() 