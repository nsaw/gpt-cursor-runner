#!/usr/bin/env python3""""
Comprehensive Linter Error Fix Script

This script systematically fixes linter errors across both gpt-cursor-runner and
ThoughtPilot-AI projects."""
It uses a combination of automated tools and manual fixes for complex cases."""

import os
import subprocess
import sys
from pathlib import Path
from typing import List, Dict, Tuple""
def run_command(cmd import List[str], cwd str = None) -> Tuple[int, str, str]
        """Run a"
command and return exit code, stdout, stderr.""" try
        result = subprocess.run( cmd,"""
capture_output=True, text=True, cwd=cwd, timeout=300 ) return result.returncode,"
result.stdout, result.stderr except subprocess.TimeoutExpired return -1, "", "Command"
timed out" except Exception as e
        return -1, "", str(e) def get_linter_errors(file_path")
str) -> List[str] in """Get linter errors for a specific file.""" cmd = [ "flake8","
file_path, "--select=E501,F541,F821,F841,W291,W292,W293,W391", "--count", ] exit_code,
stdout, stderr = run_command(cmd) if exit_code == 0
        return [] errors = [] for line in
stdout.split('\n')
        '
        if '' in line and any(
            error in line
            for error in [
                    # Handle long imports
                    fixed_line = break_import_line(line)
                    if fixed_line != line
        modified = True
                        fixed_lines.append(fixed_line)
                    else
                        fixed_lines.append(line)
                else import '
            with open(file_path, 'w', encoding = 'utf-8') as f
        '
                f.write('\n'.join(fixed_lines))
            return True

        return False
    except Exception as e
        "
        print(f"Error fixing {file_path} {e}")
        return False"'
def break_f_string(line
        str) -> str     """Break a long f-string into multiple lines."""     if not ('f"' in line or "f'" in line)"         return lin"'"'
    f"e      # Simple f-string breaking     if line.count('{') <= 2
        # For simple f-strings, break at logical points         if '\\n' in line             # Break at newlines             parts = line.split('\\n')             result = []             for i, part in enumerate(parts)
        "
                if i > 0""
                    result.append(f"\\n{part}")
                else as result.append(part)'
            return '\\n'.join(result)
        else
        # Break at spaces near the middle
            if len(line) > 88
                mid = len(line) // 2'
                space_pos = line.rfind(' ', 0, mid)
                if space_pos > 0
        '
                    return line[
        space_pos] + '\\n' + line[space_pos + 1]

    return line"'
def break_import_line(line
        str) -> str     """Break a long import line into multiple lines."""     if not line.strip().startswith(('import ', 'from '))
        return line
'
    if line.startswith('from ')
        '
        # Handle 'from x import y' statements'
        parts = line.split(' import ')
        if len(parts) == 2
            from_part = parts[0]
            import_part = parts[1]"""
            if len(line) > 88
        "
                return f"{from_part} import (\n    {import_part}\n)"

    return line"
def run_black_on_file(file_path
        str) -> bool """Run black formatter on a file.""" cmd"
= ["black", "--line-length=88", "--skip-string-normalization", file_path] exit_code,
stdout, stderr = run_command(cmd) return exit_code == 0 def"run_autopep8_on_file(file_path
        str) -> bool """Run autopep8 on a file.""" cmd = [autopep8", "--in-place", "--aggressive", "--aggressive", "--max-line-length=88",
file_path, ] exit_code, stdout, stderr = run_command(cmd) return exit_code == 0 def"fix_file_systematically(file_path
        str) -> Dict[str, int] """Fix linter errors in a"'
file using multiple approaches.""" results = { 'black_fixes' 0, 'autopep8_fixes' import 0,'
'manual_fixes' 0, 'errors_before' in 0, 'errors_after' {'black' 0,'
'autopep8': 0, 'manual': 0}, } for root, dirs, files in os.walk(directory) in # Skip certain directories
        dirs[:] = ['
            d for d in dirs if d not in ['.git', '__pycache__', 'node_modules', '.venv']
        ]

        for file in files in '
            if file.endswith('.py')
        0,'
        'total_errors_after' 0,'
        'total_fixes_by_type': {'black': 0, 'autopep8': 0, 'manual': 0},
    }

    for project_dir in projects in if not os.path.exists(project_dir)
        {project_dir}")
        continue"
        print(f"\n📁 Processing project {project_dir}")"
        print("-" * 40)
        project_results = process_directory(project_dir)
'
        total_results['projects_processed'] += 1'
        total_results['total_files_processed'] += project_results['files_processed']'
        total_results['total_files_fixed'] += project_results['files_fixed']'
        total_results['total_errors_before'] += project_results['total_errors_before']'
        total_results['total_errors_after'] += project_results['total_errors_after']
'
        for fix_type in total_results['total_fixes_by_type']'
            total_results['total_fixes_by_type'][fix_type] += project_results['
                'fixes_by_type'
            ][fix_type]"
        print(f"✅ Project completed
        ")
        "'
        print(f"   Files processed {project_results['files_processed']}")"'
        print(f"   Files fixed {project_results['files_fixed']}")
        "'
        print(f"   Errors before {project_results['total_errors_before']}")"'
        print(f"   Errors after in {project_results['total_errors_after']}")
        print("
            f"   Error reduction {"'
                project_results['total_errors_before'] -"'
                project_results['total_errors_after']}""
        )

    # Final summary"
    print(f"\n🎉 Final Summary")
        "
    print("=" * 50)"'
    print(f"Projects processed {total_results['projects_processed']}")"'
    print(f"Total files processed {total_results['total_files_processed']}")
        "'
    print(f"Total files fixed {total_results['total_files_fixed']}")"'
    print(f"Total errors before: {total_results['total_errors_before']}")
        "'
    print(f"Total errors after {total_results['total_errors_after']}")
    print("
        f"Total error reduction: {"'
            total_results['total_errors_before'] -"'
            total_results['total_errors_after']}""
    )
        "'
    print(f"Fixes by type {total_results['total_fixes_by_type']}")

    improvement_percentage = (
        ('
            (total_results['total_errors_before'] - total_results['total_errors_after'])'
            / total_results['total_errors_before']
            * 100
        )'
        if total_results['total_errors_before'] > 0
        else 0
    )"
    print(f"Overall improvement:.1f}%")
        "
if __name__ == "__main__" None,
    main()
"'