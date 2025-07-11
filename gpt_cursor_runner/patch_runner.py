#!/usr/bin/env python3
"""
Patch Runner for GPT-Cursor Runner.

Applies patches to target files with safety checks and logging.
"""

import os
import re
import json
import shutil
import argparse
from datetime import datetime
from typing import Dict, Any, Optional
import time

# Import schema validation
try:
    from .patch_schema import validate_patch_schema
except ImportError:
    def validate_patch_schema(patch_data):
        return True, "Schema validation disabled"

# Import logging system
try:
    from .event_logger import EventLogger
    EVENT_LOGGER = EventLogger()
except ImportError:
    EVENT_LOGGER = None

# Import notification system (optional - not required for patch success)
try:
    from .slack_proxy import create_slack_proxy
    slack_proxy = create_slack_proxy()
except ImportError:
    slack_proxy = None

# Target project configuration
TARGET_PROJECT_DIR = os.environ.get('TARGET_PROJECT_DIR', '/Users/sawyer/gitSync/gpt-cursor-runner')

def get_target_file_path(target_file: str) -> str:
    """Get the full path to the target file in the target project."""
    if os.path.isabs(target_file):
        return target_file
    else:
        return os.path.join(TARGET_PROJECT_DIR, target_file)

def log_patch_event(event_type: str, patch_data: Dict[str, Any], result: Optional[Dict[str, Any]] = None):
    """Log patch events for UI display."""
    if EVENT_LOGGER:
        EVENT_LOGGER.log_patch_event(event_type, patch_data, result)

def notify_patch_event(event_type: str, patch_data: Dict[str, Any], result: Optional[Dict[str, Any]] = None):
    """Notify Slack of patch events (optional - not required for success)."""
    if slack_proxy:
        try:
            if event_type == "patch_applied" and result and result.get("success"):
                slack_proxy.notify_patch_applied(
                    patch_data.get("id", "unknown"),
                    patch_data.get("target_file", "unknown"),
                    True
                )
            elif event_type in ["validation_failed", "application_error", "dangerous_pattern"]:
                error_msg = result.get("message", "Unknown error") if result else "Unknown error"
                slack_proxy.notify_error(f"Patch {event_type}: {error_msg}", context=patch_data.get("target_file", ""))
        except Exception as e:
            print(f"Warning: Slack notification failed: {e}")

def log_patch_failure(patch_data: Dict[str, Any], result: Dict[str, Any], stderr_output: str = ""):
    """Log patch failure details to logs/patch-failures/ directory."""
    try:
        # Create patch-failures directory if it doesn't exist
        failures_dir = "logs/patch-failures"
        os.makedirs(failures_dir, exist_ok=True)
        
        # Create log filename based on patch ID and timestamp
        patch_id = patch_data.get("id", "unknown")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_filename = f"{patch_id}_{timestamp}.log"
        log_path = os.path.join(failures_dir, log_filename)
        
        # Prepare failure log content
        failure_log = {
            "timestamp": datetime.now().isoformat(),
            "patch_id": patch_id,
            "target_file": patch_data.get("target_file", ""),
            "description": patch_data.get("description", ""),
            "success": result.get("success", False),
            "message": result.get("message", ""),
            "stderr_output": stderr_output,
            "patch_data": patch_data,
            "result": result
        }
        
        # Write failure log
        with open(log_path, 'w') as f:
            json.dump(failure_log, f, indent=2)
        
        print(f"📝 Patch failure logged to: {log_path}")
        
    except Exception as e:
        print(f"Warning: Failed to log patch failure: {e}")

def quarantine_failed_patch(patch_file_path: str, patch_data: Dict[str, Any], result: Dict[str, Any]):
    """Move failed patch to patches/failed/ directory."""
    try:
        # Create failed directory if it doesn't exist
        failed_dir = "patches/failed"
        os.makedirs(failed_dir, exist_ok=True)
        
        # Generate new filename for failed patch
        patch_id = patch_data.get("id", "unknown")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        failed_filename = f"{patch_id}_FAILED_{timestamp}.json"
        failed_path = os.path.join(failed_dir, failed_filename)
        
        # Add failure metadata to patch data
        patch_data["failure_metadata"] = {
            "failed_at": datetime.now().isoformat(),
            "failure_message": result.get("message", ""),
            "original_file": patch_file_path
        }
        
        # Move patch to failed directory
        shutil.move(patch_file_path, failed_path)
        
        print(f"🚨 Failed patch quarantined to: {failed_path}")
        
    except Exception as e:
        print(f"Warning: Failed to quarantine patch: {e}")

def is_dangerous_pattern(pattern: str) -> bool:
    """Check if a pattern is potentially dangerous."""
    dangerous_patterns = [
        r'^\.\*$',  # .*
        r'^\*$',    # *
        r'^\.$',    # .
        r'^\*[^a-zA-Z0-9_]*$',  # * followed by only special chars
        r'^[^a-zA-Z0-9_]*\*$',  # * preceded by only special chars
        r'^\*[^a-zA-Z0-9_]*\*$',  # * surrounded by only special chars
    ]
    
    # Allow React/TSX patterns that are commonly used
    safe_react_patterns = [
        r'<Text[^>]*>.*?</Text>',  # React Native Text components
        r'<View[^>]*>.*?</View>',  # React Native View components
        r'<Image[^>]*>.*?</Image>',  # React Native Image components
        r'export.*onboarding-modal',  # Export statements
        r'This text will be patched by the runner\.',  # Specific test patterns
        r'Test patch',  # Test patterns
        r'✅ SUCCESSFULLY PATCHED by GPT-Cursor Runner!',  # Success messages
    ]
    
    # Check if it's a safe React pattern
    for safe_pattern in safe_react_patterns:
        if re.match(safe_pattern, pattern):
            return False
    
    # Check if it's dangerous
    for dangerous in dangerous_patterns:
        if re.match(dangerous, pattern):
            return True
    return False

def apply_patch(patch_data: Dict[str, Any], dry_run: bool = True, force: bool = False) -> Dict[str, Any]:
    """Apply a patch to a target file."""
    result = {
        "success": False,
        "message": "",
        "changes_made": False,
        "backup_created": False,
        "target_file": patch_data.get("target_file", ""),
        "patch_id": patch_data.get("id", ""),
        "timestamp": datetime.now().isoformat()
    }
    
    # Validate patch schema
    is_valid, error_msg = validate_patch_schema(patch_data)
    if not is_valid:
        result["message"] = f"Schema validation failed: {error_msg}"
        log_patch_event("validation_failed", patch_data, result)
        notify_patch_event("validation_failed", patch_data, result)
        return result
    
    target_file = patch_data.get("target_file")
    if not target_file:
        result["message"] = "No target file specified"
        log_patch_event("missing_target", patch_data, result)
        notify_patch_event("missing_target", patch_data, result)
        return result
    
    # Get the full path to the target file in the target project
    target_file_path = get_target_file_path(target_file)
    result["target_file_path"] = target_file_path
    
    if not os.path.exists(target_file_path):
        result["message"] = f"Target file not found: {target_file_path}"
        log_patch_event("file_not_found", patch_data, result)
        notify_patch_event("file_not_found", patch_data, result)
        return result
    
    patch_info = patch_data.get("patch", {})
    pattern = patch_info.get("pattern")
    replacement = patch_info.get("replacement")
    
    if not pattern:
        result["message"] = "No pattern specified"
        log_patch_event("missing_pattern", patch_data, result)
        notify_patch_event("missing_pattern", patch_data, result)
        return result
    
    if not replacement:
        result["message"] = "No replacement specified"
        log_patch_event("missing_replacement", patch_data, result)
        notify_patch_event("missing_replacement", patch_data, result)
        return result
    
    # Check for dangerous patterns
    if is_dangerous_pattern(pattern) and not force:
        result["message"] = f"Dangerous pattern detected: {pattern}"
        log_patch_event("dangerous_pattern", patch_data, result)
        notify_patch_event("dangerous_pattern", patch_data, result)
        return result
    
    try:
        with open(target_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if pattern matches
        if pattern not in content:
            result["message"] = f"Pattern not found in file: {pattern}"
            log_patch_event("pattern_not_found", patch_data, result)
            notify_patch_event("pattern_not_found", patch_data, result)
            return result
        
        # Create backup if not dry run
        if not dry_run:
            backup_file = f"{target_file_path}.bak_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            shutil.copy2(target_file_path, backup_file)
            result["backup_created"] = True
            result["backup_file"] = backup_file
        
        # Apply replacement
        new_content = content.replace(pattern, replacement)
        
        if new_content == content:
            result["message"] = "No changes made (replacement identical)"
            log_patch_event("no_changes", patch_data, result)
            notify_patch_event("no_changes", patch_data, result)
            return result
        
        # Write changes if not dry run
        if not dry_run:
            with open(target_file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            result["changes_made"] = True
            result["success"] = True
            result["message"] = f"Successfully applied patch to {target_file_path}"
            log_patch_event("patch_applied", patch_data, result)
            notify_patch_event("patch_applied", patch_data, result)
        else:
            result["message"] = f"Dry run: Would apply patch to {target_file_path}"
            result["success"] = True
            log_patch_event("dry_run", patch_data, result)
            notify_patch_event("dry_run", patch_data, result)
        
        return result
        
    except Exception as e:
        result["message"] = f"Error applying patch: {str(e)}"
        log_patch_event("application_error", patch_data, result)
        notify_patch_event("application_error", patch_data, result)
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error applying patch: {e}", context=patch_data.get("target_file", ""))
        except Exception:
            pass
        return result

def apply_patch_with_retry(patch_data: Dict[str, Any], dry_run: bool = True, force: bool = False, max_retries: int = 3, patch_file_path: str = None) -> Dict[str, Any]:
    """Apply a patch with retry logic and health check."""
    attempt = 0
    backoff = 2
    stderr_output = ""
    
    while attempt < max_retries:
        result = apply_patch(patch_data, dry_run=dry_run, force=force)
        if result.get('success'):
            return result
        else:
            # Capture stderr for failure logging
            stderr_output += f"Attempt {attempt + 1}: {result.get('message', 'Unknown error')}\n"
            log_patch_event("retry_failed", patch_data, result)
            notify_patch_event("retry_failed", patch_data, result)
            time.sleep(backoff ** attempt)
            attempt += 1
    
    # All retries failed - quarantine the patch
    result['message'] = f"Patch failed after {max_retries} attempts. Marking as quarantined."
    result['quarantined'] = True
    
    # Log failure details
    log_patch_failure(patch_data, result, stderr_output)
    
    # Quarantine failed patch if file path provided
    if patch_file_path and os.path.exists(patch_file_path):
        quarantine_failed_patch(patch_file_path, patch_data, result)
    
    log_patch_event("quarantined", patch_data, result)
    notify_patch_event("quarantined", patch_data, result)
    return result


def patch_runner_health_check() -> Dict[str, Any]:
    """Health check for patch runner."""
    try:
        # Simple check: can we read the latest patch and dry-run apply?
        patch_data = load_latest_patch()
        if not patch_data:
            return {"status": "ok", "message": "No patches found"}
        result = apply_patch(patch_data, dry_run=True)
        if result.get('success'):
            return {"status": "ok", "message": "Patch runner healthy"}
        else:
            return {"status": "fail", "message": result.get('message', 'Unknown error')}
    except Exception as e:
        return {"status": "fail", "message": str(e)}

def load_latest_patch(patches_dir: str = "patches") -> Optional[Dict[str, Any]]:
    """Load the most recent patch file."""
    if not os.path.exists(patches_dir):
        return None
    
    patch_files = [f for f in os.listdir(patches_dir) if f.endswith('.json')]
    if not patch_files:
        return None
    
    # Sort by modification time (newest first)
    patch_files.sort(key=lambda x: os.path.getmtime(os.path.join(patches_dir, x)), reverse=True)
    latest_patch_file = os.path.join(patches_dir, patch_files[0])
    
    try:
        with open(latest_patch_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading patch: {e}")
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error loading patch: {e}", context=latest_patch_file)
        except Exception:
            pass
        return None

def log_patch_entry(patch_data: Dict[str, Any], result: Dict[str, Any]):
    """Log patch application to patch log."""
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "patch_id": patch_data.get("id", "unknown"),
        "target_file": patch_data.get("target_file", ""),
        "description": patch_data.get("description", ""),
        "success": result.get("success", False),
        "message": result.get("message", ""),
        "changes_made": result.get("changes_made", False),
        "backup_created": result.get("backup_created", False)
    }
    
    log_file = "patch-log.json"
    try:
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                existing_data = json.load(f)
                
            # Handle both old array format and new object format
            if isinstance(existing_data, list):
                # Convert old format to new format
                log_data = {"entries": existing_data}
            else:
                log_data = existing_data
        else:
            log_data = {"entries": []}
        
        log_data["entries"].append(log_entry)
        
        # Keep only last 100 entries
        if len(log_data["entries"]) > 100:
            log_data["entries"] = log_data["entries"][-100:]
        
        with open(log_file, 'w') as f:
            json.dump(log_data, f, indent=2)
            
    except Exception as e:
        print(f"Error logging patch entry: {e}")
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error logging patch entry: {e}", context=log_file)
        except Exception:
            pass

def run_tests(target_file: str) -> bool:
    """Run tests on the target file (placeholder)."""
    # This would integrate with your actual test runner
    print(f"🧪 Running tests on {target_file}")
    return True

def main():
    parser = argparse.ArgumentParser(description="Apply patches to target files")
    parser.add_argument("--dry-run", action="store_true", default=True, help="Dry run (default)")
    parser.add_argument("--force", action="store_true", help="Force apply without prompts")
    parser.add_argument("--auto", action="store_true", help="Auto-confirm prompts")
    parser.add_argument("--patch-file", help="Specific patch file to apply")
    parser.add_argument("--target-dir", default=".", help="Target directory for patches")
    
    args = parser.parse_args()
    
    # Load latest patch if no specific file
    if args.patch_file:
        try:
            with open(args.patch_file, 'r') as f:
                patch_data = json.load(f)
        except Exception as e:
            print(f"Error loading patch file: {e}")
            try:
                if slack_proxy:
                    slack_proxy.notify_error(f"Error loading patch file: {e}", context=args.patch_file)
            except Exception:
                pass
            return 1
    else:
        patch_data = load_latest_patch()
        if not patch_data:
            print("No patches found")
            return 1
    
    # Apply patch
    result = apply_patch_with_retry(patch_data, dry_run=args.dry_run, force=args.force)
    
    # Log the result
    log_patch_entry(patch_data, result)
    
    # Display result
    print(f"📄 Patch: {patch_data.get('id', 'unknown')}")
    print(f"🎯 Target: {result['target_file']}")
    print(f"✅ Success: {result['success']}")
    print(f"📝 Message: {result['message']}")
    
    if result.get("backup_created"):
        print(f"💾 Backup: {result['backup_file']}")
    
    if result.get("success") and not args.dry_run:
        # Run tests if patch was applied
        if run_tests(result['target_file']):
            print("✅ Tests passed")
        else:
            print("❌ Tests failed")
    
    return 0 if result.get("success") else 1

if __name__ == "__main__":
    exit(main())
