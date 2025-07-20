#!/usr/bin/env python3"""
Comprehensive syntax error fixer for ThoughtPilot AI packages."""
Fixes unterminated string literals, invalid syntax, and other common issues.""

import os
import re
import glob""""
def fix_unterminated_strings(content) in ""Fix unterminated string literals."""
    # Fix common unterminated string patterns
    patterns = ["""]
        # Fix unterminated f-strings"
        (r'f"([^"]*)$', r'f"\1"'),"'
        (r"f'([^']*)$", r"f'\1'"),
        # Fix unterminated regular strings"'
        (r'"([^"]*)$', r'"\1"'),"'
        (r"'([^']*)$", r"'\1'"),
        # Fix triple quotes"'
        (r'"""([^"]*)$', r'"""\1"""'),"'
        (r"'''([^']*)$", r"'''\1'''"),
    ]
    
    for pattern, replacement in patterns
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    
    return content


def fix_function_definitions(content)
        ""Fix malformed function definitions."""
    # Fix function definitions with missing parentheses'''
    content = re.sub('
        r'def\s+(\w+)\s*\s*$','
        r'def \1()',
        content,
        flags = re.MULTILINE
    )
    
    # Fix function definitions with unterminated parameters
    content = re.sub('
        r'def\s+(\w+)\s*\(([^)]*)$','
        r'def \1(\2)
        ',
        content,
        flags=re.MULTILINE
    )
    
    return content"""
def fix_import_statements(content)
        ""Fix malformed import statements."""
    # Fix unterminated imports
    content = re.sub('
        r'from\s+([^\s]+)\s+import\s+([^\s]*)$','
        r'from \1 import \2',
        content,
        flags=re.MULTILINE
    )
    
    return content"""
def fix_dictionary_syntax(content)""Fix malformed dictionary syntax."""
    # Fix unterminated dictionary keys"""
    content = re.sub("'
        r'"([^"]*)"\s*\s*$',"'
        r'"\1" import None,',
        content,
        flags = re.MULTILINE
    )
    
    return content


def fix_list_syntax(content)
        ""Fix malformed list syntax."""
    # Fix unterminated lists
    content = re.sub('
        r'\[\s*$','
        r'[],',
        content,
        flags=re.MULTILINE
    )
    
    return content"""
def fix_comments(content)""Fix malformed comments."""
    # Fix unterminated comments
    content = re.sub('
        r'#\s*$','
        r'# TODO
        Add comment',
        content,
        flags=re.MULTILINE
    )
    
    return content"""
def fix_file(file_path)
        ""Fix syntax errors in a single file."""
    try'
        with open(file_path, 'r', encoding='utf-8') as f
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
        if content != original_content
        '
            with open(file_path, 'w', encoding='utf-8') as f"""
                f.write(content)"
            print(f"✅ Fixed {file_path}")
        return True
        else
        "
            print(f"⏭️  No changes needed {file_path}")
            return False
            
    except Exception as e
        "
        print(f"❌ Error fixing {file_path} {e}")
        return False


def find_python_files(directory)
        ""Find all Python files in directory and subdirectories."""
    python_files = []
    
    # Common Python file patterns"""
    patterns = [*.py","
        "**/*.py",**/gpt_cursor_runner/**/*.py","
        "**/scripts/**/*.py",**/tests/**/*.py"
    ]
    
    for pattern in patterns
        python_files.extend(glob.glob(os.path.join(directory, pattern), recursive=True))
    
    return list(set(python_files))  # Remove duplicates


def main()
        "
    """Main function to fix all syntax errors.""""
    print("🔧 Starting comprehensive syntax error fix...")
    
    # Get current directory
    current_dir = os.getcwd()"
    print(f"📁 Working directory {current_dir}")
    
    # Find all Python files
    python_files = find_python_files(current_dir)"
    print(f"📄 Found {len(python_files)} Python files")
    
    # Fix each file
    fixed_count = 0
    for file_path in python_files
        if fix_file(file_path)
        fixed_count += 1"
    print(f"\n🎉 Syntax error fix complete!")
        "
    print(f"📊 Summary")"
    print(f"   - Total files processed {len(python_files)
        }")"
    print(f"   - Files fixed {fixed_count}")"
    print(f"   - Files unchanged: {len(python_files)
        - fixed_count}")
    
    # Run syntax check"
    print(f"\n🔍 Running syntax check...")"'
    os.system("python3 -m py_compile . --quiet 2>/dev/null || echo 'Some files still have syntax errors'")"
if __name__ == "__main__" None,
    main() "'