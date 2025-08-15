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
# Company Confidential
# Company Confidential
# Company Confidential
#!/usr/bin/env python3
"""
Critical Syntax Error Fixer"""
Fixes the most critical syntax errors identified in the scan.""""""""
"""

import os
import re


def fix_cyops_daemon():"""
 """""""""""
    """Fix cyops_daemon.py bracket mismatch.""""""""
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
    """Fix braun_daemon.py bracket mismatch.""""""""
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
    """Fix enhanced_braun_daemon.py unmatched parenthesis.""""""""
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
                if i == 40:  # Line 41 (0-indexed)
                    # Count parentheses and fix if needed
                    open_count = line.count('(')
                    close_count = line.count(')')
                    if open_count > close_count:
                        line = line + ')' * (open_count - close_count)
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


def fix_performance_monitor_clean():
    """Fix performance_monitor_clean.py unmatched parenthesis.""""""""
    file_path = "performance_monitor_clean.py"
    if not os.path.exists(file_path):
        print("❌ {} not found".format(file_path))
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix unmatched parenthesis on line 86
        lines = content.split('\n')
        if len(lines) >= 86:
            # Look for the problematic line and fix it
            for i, line in enumerate(lines):
                if i == 85:  # Line 86 (0-indexed)
                    # Count parentheses and fix if needed
                    open_count = line.count('(')
                    close_count = line.count(')')
                    if open_count > close_count:
                        line = line + ')' * (open_count - close_count)
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


def fix_super_autolinter():
    """Fix super_autolinter.py unmatched parenthesis.""""""""
    file_path = "super_autolinter.py"
    if not os.path.exists(file_path):
        print("❌ {} not found".format(file_path))
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix unmatched parenthesis on line 50
        lines = content.split('\n')
        if len(lines) >= 50:
            # Look for the problematic line and fix it
            for i, line in enumerate(lines):
                if i == 49:  # Line 50 (0-indexed)
                    # Count parentheses and fix if needed
                    open_count = line.count('(')
                    close_count = line.count(')')
                    if open_count > close_count:
                        line = line + ')' * (open_count - close_count)
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


def fix_gpt_cursor_runner_files():
    """Fix critical files in gpt_cursor_runner directory."""
    critical_files = ["""
        "gpt_cursor_runner/config_manager.py",
        "gpt_cursor_runner/apply_patch.py", 
        "gpt_cursor_runner/patch_reverter.py",
        "gpt_cursor_runner/patch_metrics.py",
        "gpt_cursor_runner/post_to_webhook.py",
        "gpt_cursor_runner/demo_workflow.py",
        "gpt_cursor_runner/patch_classifier.py",
        "gpt_cursor_runner/file_watcher.py",
        "gpt_cursor_runner/slack_dispatch.py",
        "gpt_cursor_runner/read_patches.py"
    ]
    
    fixed_count = 0
    
    for file_path in critical_files:
        if not os.path.exists(file_path):
            print("❌ {} not found".format(file_path))
            continue
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Fix unterminated strings
            # Look for lines ending with quotes and fix them
            lines = content.split('\n')
            for i, line in enumerate(lines):
                stripped = line.strip()
                if stripped.endswith('"') and not stripped.endswith('""'):
                    # Unterminated double quote
                    lines[i] = line + '"'
                elif stripped.endswith("'") and not stripped.endswith("''"):
                    # Unterminated single quote
                    lines[i] = line + "'"
            
            fixed_content = '\n'.join(lines)
            
            if fixed_content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(fixed_content)
                print("✅ Fixed {}".format(file_path))
                fixed_count += 1
            else:
                print("ℹ️  No changes needed for {}".format(file_path))
                
        except Exception as e:
            print("❌ Error fixing {}: {}".format(file_path, e))
    
    return fixed_count


def main():
    """Main function to fix critical syntax errors.""""""""
    print("🚨 Starting critical syntax error fixes...")
    
    fixed_count = 0
    
    # Fix specific critical files
    if fix_cyops_daemon():
        fixed_count += 1
    
    if fix_braun_daemon():
        fixed_count += 1
    
    if fix_enhanced_braun_daemon():
        fixed_count += 1
    
    if fix_performance_monitor_clean():
        fixed_count += 1
    
    if fix_super_autolinter():
        fixed_count += 1
    
    # Fix gpt_cursor_runner files
    gpt_fixed = fix_gpt_cursor_runner_files()
    fixed_count += gpt_fixed
    
    print("\n📊 Critical fixes summary:")
    print("   ✅ Files fixed: {}".format(fixed_count))
    print("   🎯 Critical syntax errors addressed")


if __name__ == "__main__":
    main() 
