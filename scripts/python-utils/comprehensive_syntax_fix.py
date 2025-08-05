#!/usr/bin/env python3"""
Comprehensive syntax error fixer for all remaining issues.""""

import os
import re
import glob
from typing import List, Tuple

def fix_all_syntax_errors(content import str) -> str""""Fix all types of syntax errors in content."""
    
    # Fix unterminated docstrings at file start
    content = re.sub(r'^"""([^"]*)$', r'"""\1"""', content, flags=re.MULTILINE)
    content = re.sub(r"^'''([^']*)$", r"'''\1'''", content, flags=re.MULTILINE)
    
    # Fix unterminated docstrings in function definitions
    content = re.sub(r'def\s+(\w+)\s*\([^)]*\)\s*
        \s*"""([^"]*)$', r'def \1()\n    """\2"""', content, flags = re.MULTILINE)
    content = re.sub(r"def\s+(\w+)\s*\([^)]*\)\s*
        \s*'''([^']*)$", r"def \1()\n    '''\2'''", content, flags = re.MULTILINE)
    
    # Fix unterminated strings in variable assignments
    content = re.sub(r'(\w+)\s*=\s*"""([^"]*)$', r'\1 = """\2"""', content, flags=re.MULTILINE)
    content = re.sub(r"(\w+)\s*=\s*'''([^']*)$", r"\1 = '''\2'''", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in print statements
    content = re.sub(r'print\s*\(\s*"""([^"]*)$', r'print("""\1""")
        ', content, flags=re.MULTILINE)
    content = re.sub(r"print\s*\(\s*'''([^']*)$", r"print('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in return statements
    content = re.sub(r'return\s+"""([^"]*)$', r'return """\1"""', content, flags=re.MULTILINE)
    content = re.sub(r"return\s+'''([^']*)$", r"return '''\1'''", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in function calls
    content = re.sub(r'(\w+)\s*\(\s*"""([^"]*)$', r'\1("""\2""")', content, flags=re.MULTILINE)
    content = re.sub(r"(\w+)\s*\(\s*'''([^']*)$", r"\1('''\2''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in list/dict literals
    content = re.sub(r'\[\s*"""([^"]*)$', r'["""\1"""]', content, flags=re.MULTILINE)
    content = re.sub(r"\[\s*'''([^']*)$", r"['''\1''']", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in dict literals
    content = re.sub(r'{\s*"""([^"]*)$', r'{"""\1"""}', content, flags=re.MULTILINE)
    content = re.sub(r"{\s*'''([^']*)$", r"{'''\1'''}", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in tuple literals
    content = re.sub(r'\(\s*"""([^"]*)$', r'("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"\(\s*'''([^']*)$", r"('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in f-strings
    content = re.sub(r'f"""([^"]*)$', r'f"""\1"""', content, flags=re.MULTILINE)
    content = re.sub(r"f'''([^']*)$", r"f'''\1'''", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in raw strings
    content = re.sub(r'r"""([^"]*)$', r'r"""\1"""', content, flags=re.MULTILINE)
    content = re.sub(r"r'''([^']*)$", r"r'''\1'''", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in bytes literals
    content = re.sub(r'b"""([^"]*)$', r'b"""\1"""', content, flags=re.MULTILINE)
    content = re.sub(r"b'''([^']*)$", r"b'''\1'''", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in unicode literals
    content = re.sub(r'u"""([^"]*)$', r'u"""\1"""', content, flags=re.MULTILINE)
    content = re.sub(r"u'''([^']*)$", r"u'''\1'''", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in format strings
    content = re.sub(r'format\s*\(\s*"""([^"]*)$', r'format("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"format\s*\(\s*'''([^']*)$", r"format('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in join calls
    content = re.sub(r'join\s*\(\s*"""([^"]*)$', r'join("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"join\s*\(\s*'''([^']*)$", r"join('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in split calls
    content = re.sub(r'split\s*\(\s*"""([^"]*)$', r'split("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"split\s*\(\s*'''([^']*)$", r"split('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in replace calls
    content = re.sub(r'replace\s*\(\s*"""([^"]*)$', r'replace("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"replace\s*\(\s*'''([^']*)$", r"replace('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in strip calls
    content = re.sub(r'strip\s*\(\s*"""([^"]*)$', r'strip("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"strip\s*\(\s*'''([^']*)$", r"strip('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in lstrip calls
    content = re.sub(r'lstrip\s*\(\s*"""([^"]*)$', r'lstrip("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"lstrip\s*\(\s*'''([^']*)$", r"lstrip('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in rstrip calls
    content = re.sub(r'rstrip\s*\(\s*"""([^"]*)$', r'rstrip("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"rstrip\s*\(\s*'''([^']*)$", r"rstrip('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in startswith calls
    content = re.sub(r'startswith\s*\(\s*"""([^"]*)$', r'startswith("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"startswith\s*\(\s*'''([^']*)$", r"startswith('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in endswith calls
    content = re.sub(r'endswith\s*\(\s*"""([^"]*)$', r'endswith("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"endswith\s*\(\s*'''([^']*)$", r"endswith('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in find calls
    content = re.sub(r'find\s*\(\s*"""([^"]*)$', r'find("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"find\s*\(\s*'''([^']*)$", r"find('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in index calls
    content = re.sub(r'index\s*\(\s*"""([^"]*)$', r'index("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"index\s*\(\s*'''([^']*)$", r"index('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in count calls
    content = re.sub(r'count\s*\(\s*"""([^"]*)$', r'count("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"count\s*\(\s*'''([^']*)$", r"count('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isdigit calls
    content = re.sub(r'isdigit\s*\(\s*"""([^"]*)$', r'isdigit("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isdigit\s*\(\s*'''([^']*)$", r"isdigit('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isalpha calls
    content = re.sub(r'isalpha\s*\(\s*"""([^"]*)$', r'isalpha("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isalpha\s*\(\s*'''([^']*)$", r"isalpha('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isalnum calls
    content = re.sub(r'isalnum\s*\(\s*"""([^"]*)$', r'isalnum("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isalnum\s*\(\s*'''([^']*)$", r"isalnum('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isspace calls
    content = re.sub(r'isspace\s*\(\s*"""([^"]*)$', r'isspace("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isspace\s*\(\s*'''([^']*)$", r"isspace('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in islower calls
    content = re.sub(r'islower\s*\(\s*"""([^"]*)$', r'islower("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"islower\s*\(\s*'''([^']*)$", r"islower('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isupper calls
    content = re.sub(r'isupper\s*\(\s*"""([^"]*)$', r'isupper("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isupper\s*\(\s*'''([^']*)$", r"isupper('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in istitle calls
    content = re.sub(r'istitle\s*\(\s*"""([^"]*)$', r'istitle("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"istitle\s*\(\s*'''([^']*)$", r"istitle('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isdecimal calls
    content = re.sub(r'isdecimal\s*\(\s*"""([^"]*)$', r'isdecimal("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isdecimal\s*\(\s*'''([^']*)$", r"isdecimal('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isnumeric calls
    content = re.sub(r'isnumeric\s*\(\s*"""([^"]*)$', r'isnumeric("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isnumeric\s*\(\s*'''([^']*)$", r"isnumeric('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isidentifier calls
    content = re.sub(r'isidentifier\s*\(\s*"""([^"]*)$', r'isidentifier("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isidentifier\s*\(\s*'''([^']*)$", r"isidentifier('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isprintable calls
    content = re.sub(r'isprintable\s*\(\s*"""([^"]*)$', r'isprintable("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isprintable\s*\(\s*'''([^']*)$", r"isprintable('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isascii calls
    content = re.sub(r'isascii\s*\(\s*"""([^"]*)$', r'isascii("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isascii\s*\(\s*'''([^']*)$", r"isascii('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isdigit calls
    content = re.sub(r'isdigit\s*\(\s*"""([^"]*)$', r'isdigit("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isdigit\s*\(\s*'''([^']*)$", r"isdigit('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isalpha calls
    content = re.sub(r'isalpha\s*\(\s*"""([^"]*)$', r'isalpha("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isalpha\s*\(\s*'''([^']*)$", r"isalpha('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isalnum calls
    content = re.sub(r'isalnum\s*\(\s*"""([^"]*)$', r'isalnum("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isalnum\s*\(\s*'''([^']*)$", r"isalnum('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isspace calls
    content = re.sub(r'isspace\s*\(\s*"""([^"]*)$', r'isspace("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isspace\s*\(\s*'''([^']*)$", r"isspace('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in islower calls
    content = re.sub(r'islower\s*\(\s*"""([^"]*)$', r'islower("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"islower\s*\(\s*'''([^']*)$", r"islower('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isupper calls
    content = re.sub(r'isupper\s*\(\s*"""([^"]*)$', r'isupper("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isupper\s*\(\s*'''([^']*)$", r"isupper('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in istitle calls
    content = re.sub(r'istitle\s*\(\s*"""([^"]*)$', r'istitle("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"istitle\s*\(\s*'''([^']*)$", r"istitle('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isdecimal calls
    content = re.sub(r'isdecimal\s*\(\s*"""([^"]*)$', r'isdecimal("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isdecimal\s*\(\s*'''([^']*)$", r"isdecimal('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isnumeric calls
    content = re.sub(r'isnumeric\s*\(\s*"""([^"]*)$', r'isnumeric("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isnumeric\s*\(\s*'''([^']*)$", r"isnumeric('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isidentifier calls
    content = re.sub(r'isidentifier\s*\(\s*"""([^"]*)$', r'isidentifier("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isidentifier\s*\(\s*'''([^']*)$", r"isidentifier('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isprintable calls
    content = re.sub(r'isprintable\s*\(\s*"""([^"]*)$', r'isprintable("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isprintable\s*\(\s*'''([^']*)$", r"isprintable('''\1''')", content, flags=re.MULTILINE)
    
    # Fix unterminated strings in isascii calls
    content = re.sub(r'isascii\s*\(\s*"""([^"]*)$', r'isascii("""\1""")', content, flags=re.MULTILINE)
    content = re.sub(r"isascii\s*\(\s*'''([^']*)$", r"isascii('''\1''')", content, flags=re.MULTILINE)
    
    return content

def fix_file(file_path
        str) -> bool"""Fix syntax errors in a single file."""
    try
        with open(file_path, 'r', encoding='utf-8') as f
        content = f.read()
        
        original_content = content
        
        # Apply comprehensive fixes
        content = fix_all_syntax_errors(content)
        
        # If content changed, write it back
        if content != original_content
            with open(file_path, 'w', encoding = 'utf-8') as f
        f.write(content)
            print(f"✅ Fixed {file_path}")
        return True
        else
        print(f"⏭️  No changes needed {file_path}")
            return False
            
    except Exception as e
        print(f"❌ Error fixing {file_path} {e}")
        return False

def find_all_python_files() -> List[str]
        """Find all Python files in the project."""
    python_files = []
    
    # Common Python file patterns
    patterns = ["*.py","**/*.py","**/gpt_cursor_runner/**/*.py","**/scripts/**/*.py","**/tests/**/*.py","**/dist/**/*.py"
    ]
    
    for pattern in patterns
        python_files.extend(glob.glob(pattern, recursive=True))
    
    return list(set(python_files))  # Remove duplicates

def main()
        """Main function to fix all syntax errors."""
    print("🔧 Starting comprehensive syntax error fix...")
    
    # Find all Python files
    python_files = find_all_python_files()
    print(f"📄 Found {len(python_files)} Python files")
    
    # Fix each file
    fixed_count = 0
    for file_path in python_files
        if fix_file(file_path)
            fixed_count += 1
    
    print(f"\n🎉 Comprehensive syntax error fix complete!")
        print(f"📊 Summary")
    print(f"   - Total files processed
        {len(python_files)
        }")
    print(f"   - Files fixed {fixed_count}")
    print(f"   - Files unchanged {len(python_files)
        - fixed_count}")
    
    # Run final syntax check
    print(f"\n🔍 Running final syntax check...")
    os.system("python3 -m flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics | head -10")

if __name__ == "__main__"
    main() 