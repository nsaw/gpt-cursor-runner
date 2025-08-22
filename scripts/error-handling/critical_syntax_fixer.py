#!/usr/bin/env python3
"""
Critical Syntax Error Fixer

Fixes the most critical syntax errors identified in the scan.
"""

import os
import re


def fix_cyops_daemon():
    """Fix cyops_daemon.py bracket mismatch."""
    file_path = "cyops_daemon.py"
    if not os.path.exists(file_path):
        print("❌ {} not found".format(file_path))
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix the specific bracket mismatch on line 114
        lines = content.split('\n')
        if len(lines) >= 114:
            # Look for the problematic line and fix it
            for i, line in enumerate(lines):
                if ']' in line and '{' in line and i >= 110:  # Around line 112-114
                    # Fix bracket mismatch
                    line = line.replace(']', '}')
                    lines[i] = line
                    print("🔧 Fixed bracket mismatch in line {}".format(i + 1))
        
        fixed_content = '\n'.join(lines)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        
        print("✅ Fixed {}".format(file_path))
        return True
        
    except Exception as e:
        print("❌ Error fixing {}: {}".format(file_path, e))
        return False


def fix_braun_daemon():
    """Fix braun_daemon.py bracket mismatch."""
    file_path = "braun_daemon.py"
    if not os.path.exists(file_path):
        print("❌ {} not found".format(file_path))
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix the specific bracket mismatch on line 113
        lines = content.split('\n')
        if len(lines) >= 113:
            # Look for the problematic line and fix it
            for i, line in enumerate(lines):
                if ']' in line and '{' in line and i >= 110:  # Around line 111-113
                    # Fix bracket mismatch
                    line = line.replace(']', '}')
                    lines[i] = line
                    print("🔧 Fixed bracket mismatch in line {}".format(i + 1))
        
        fixed_content = '\n'.join(lines)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        
        print("✅ Fixed {}".format(file_path))
        return True
        
    except Exception as e:
        print("❌ Error fixing {}: {}".format(file_path, e))
        return False


def fix_enhanced_braun_daemon():
    """Fix enhanced_braun_daemon.py unmatched parenthesis."""
    file_path = "enhanced_braun_daemon.py"
    if not os.path.exists(file_path):
        print("❌ {} not found".format(file_path))
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix unmatched parenthesis on line 41
        lines = content.split('\n')
        if len(lines) >= 41:
            # Look for the problematic line and fix it
            for i, line in enumerate(lines):
                if '(' in line and ')' not in line and i >= 38:  # Around line 39-41
                    # Add missing closing parenthesis
                    line = line + ')'
                    lines[i] = line
                    print("🔧 Fixed unmatched parenthesis in line {}".format(i + 1))
        
        fixed_content = '\n'.join(lines)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        
        print("✅ Fixed {}".format(file_path))
        return True
        
    except Exception as e:
        print("❌ Error fixing {}: {}".format(file_path, e))
        return False


def fix_summary_watcher_daemon():
    """Fix summary_watcher_daemon.py bracket mismatch."""
    file_path = "summary_watcher_daemon.py"
    if not os.path.exists(file_path):
        print("❌ {} not found".format(file_path))
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix the specific bracket mismatch on line 115
        lines = content.split('\n')
        if len(lines) >= 115:
            # Look for the problematic line and fix it
            for i, line in enumerate(lines):
                if ']' in line and '{' in line and i >= 112:  # Around line 113-115
                    # Fix bracket mismatch
                    line = line.replace(']', '}')
                    lines[i] = line
                    print("🔧 Fixed bracket mismatch in line {}".format(i + 1))
        
        fixed_content = '\n'.join(lines)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        
        print("✅ Fixed {}".format(file_path))
        return True
        
    except Exception as e:
        print("❌ Error fixing {}: {}".format(file_path, e))
        return False


def fix_dashboard_daemon():
    """Fix dashboard_daemon.py bracket mismatch."""
    file_path = "dashboard_daemon.py"
    if not os.path.exists(file_path):
        print("❌ {} not found".format(file_path))
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix the specific bracket mismatch on line 116
        lines = content.split('\n')
        if len(lines) >= 116:
            # Look for the problematic line and fix it
            for i, line in enumerate(lines):
                if ']' in line and '{' in line and i >= 113:  # Around line 114-116
                    # Fix bracket mismatch
                    line = line.replace(']', '}')
                    lines[i] = line
                    print("🔧 Fixed bracket mismatch in line {}".format(i + 1))
        
        fixed_content = '\n'.join(lines)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        
        print("✅ Fixed {}".format(file_path))
        return True
        
    except Exception as e:
        print("❌ Error fixing {}: {}".format(file_path, e))
        return False


def main():
    """Main function to run all fixes."""
    print("🔧 Critical Syntax Error Fixer")
    print("=" * 40)
    
    fixes = [
        fix_cyops_daemon,
        fix_braun_daemon,
        fix_enhanced_braun_daemon,
        fix_summary_watcher_daemon,
        fix_dashboard_daemon
    ]
    
    success_count = 0
    total_count = len(fixes)
    
    for fix_func in fixes:
        if fix_func():
            success_count += 1
    
    print("\n📊 Summary:")
    print("✅ Successful fixes: {}".format(success_count))
    print("❌ Failed fixes: {}".format(total_count - success_count))
    print("📈 Success rate: {:.1f}%".format((success_count / total_count) * 100))


if __name__ == "__main__":
    main() 
