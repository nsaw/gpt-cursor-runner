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
Patch Runner for GPT-Cursor Runner.

Handles patch application and validation.
"""

import os
import re
import json
import shutil
from datetime import datetime
from typing import Any, Dict, Optional, Union

# Import dependencies
try:
    from .event_logger import event_logger as EVENT_LOGGER
except ImportError:
    EVENT_LOGGER = None

try:
    from .slack_proxy import create_slack_proxy

    slack_proxy = create_slack_proxy()
except ImportError:
    slack_proxy = None

# Type aliases for better type checking
EVENT_LOGGER: Optional[Any] = EVENT_LOGGER
slack_proxy: Optional[Any] = slack_proxy


def validate_patch_schema(patch_data: dict[str, Any]) -> tuple[bool, str]:
    """Validate patch data against schema."""
    required_fields = ["id", "target_file", "patch"]

    for field in required_fields:
        if field not in patch_data:
            return False, f"Missing required field: {field}"

    patch_info = patch_data.get("patch", {})
    if not isinstance(patch_info, dict):
        return False, "Patch must be a dictionary"

    if "pattern" not in patch_info:
        return False, "Patch must contain 'pattern' field"

    if "replacement" not in patch_info:
        return False, "Patch must contain 'replacement' field"

    return True, ""


def log_patch_event(
    event_type: str,
    patch_data: dict[str, Any],
    result: Union[dict[str, Any], None] = None,
) -> None:
    """Log patch events for UI display."""
    if EVENT_LOGGER:
        EVENT_LOGGER.log_patch_event(event_type, patch_data, result)


def notify_patch_event(
    event_type: str,
    patch_data: dict[str, Any],
    result: Union[dict[str, Any], None] = None,
) -> None:
    """Notify Slack of patch events."""
    if slack_proxy:
        try:
            if event_type == "patch_applied" and result and result.get("success"):
                slack_proxy.notify_patch_applied(
                    patch_data.get("id", "unknown"),
                    patch_data.get("target_file", "unknown"),
                    True,
                )
            elif event_type in [
                "validation_failed",
                "application_error",
                "dangerous_pattern",
            ]:
                error_msg = (
                    result.get("message", "Unknown error")
                    if result
                    else "Unknown error"
                )
                slack_proxy.notify_error(
                    f"Patch {event_type}: {error_msg}",
                    context=patch_data.get("target_file", ""),
                )
        except Exception as e:
            print(f"Error notifying Slack: {e}")


def apply_patch(
    patch_data: Dict[str, Any], dry_run: bool = False, force: bool = False
) -> Dict[str, Any]:
    """Apply a patch to a target file."""
    result = {
        "success": False,
        "message": "",
        "changes_made": False,
        "backup_created": False,
        "patch_id": patch_data.get("id", ""),
        "target_file": patch_data.get("target_file", ""),
        "timestamp": datetime.now().isoformat(),
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

    if not os.path.exists(target_file):
        result["message"] = f"Target file not found: {target_file}"
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
        with open(target_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Check if pattern is a regex (contains special regex characters)
        is_regex = any(char in pattern for char in r"^$.*+?{}[]()|\\")

        if is_regex:
            # Use regex matching
            if not re.search(pattern, content, re.DOTALL):
                result["message"] = f"Regex pattern not found in file: {pattern}"
                log_patch_event("pattern_not_found", patch_data, result)
                notify_patch_event("pattern_not_found", patch_data, result)
                return result

            # Apply regex replacement
            new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        else:
            # Use simple string matching
            if pattern not in content:
                result["message"] = f"Pattern not found in file: {pattern}"
                log_patch_event("pattern_not_found", patch_data, result)
                notify_patch_event("pattern_not_found", patch_data, result)
                return result

            # Apply simple string replacement
            new_content = content.replace(pattern, replacement)

        if new_content == content:
            result["message"] = "No changes made (replacement identical)"
            log_patch_event("no_changes", patch_data, result)
            notify_patch_event("no_changes", patch_data, result)
            return result

        # Create backup if not dry run
        if not dry_run:
            backup_file = (
                f"{target_file}.bak_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            )
            shutil.copy2(target_file, backup_file)
            result["backup_created"] = True
            result["backup_file"] = backup_file

        # Write changes if not dry run
        if not dry_run:
            with open(target_file, "w", encoding="utf-8") as f:
                f.write(new_content)
            result["changes_made"] = True
            result["success"] = True
            result["message"] = f"Successfully applied patch to {target_file}"
            log_patch_event("patch_applied", patch_data, result)
            notify_patch_event("patch_applied", patch_data, result)
        else:
            result["message"] = f"Dry run: Would apply patch to {target_file}"
            result["success"] = True
            log_patch_event("dry_run", patch_data, result)
            notify_patch_event("dry_run", patch_data, result)

        return result

    except Exception as e:
        result["message"] = f"Error applying patch: {str(e)}"
        log_patch_event("application_error", patch_data, result)
        notify_patch_event("application_error", patch_data, result)
        return result


def is_dangerous_pattern(pattern: str) -> bool:
    """Check if a pattern is potentially dangerous."""
    dangerous_patterns = [
        r"^.*$",  # Matches entire file
        r".*",  # Matches everything
        r"^",  # Start of file
        r"$",  # End of file
    ]

    for dangerous in dangerous_patterns:
        if pattern == dangerous:
            return True

    return False


def load_latest_patch() -> Optional[Dict[str, Any]]:
    """Load the most recent patch from the patches directory."""
    patches_dir = os.getenv("PATCHES_DIRECTORY", "patches")

    if not os.path.exists(patches_dir):
        return None

    patch_files = []
    for file in os.listdir(patches_dir):
        if file.endswith(".json"):
            filepath = os.path.join(patches_dir, file)
            patch_files.append((filepath, os.path.getmtime(filepath)))

    if not patch_files:
        return None

    # Sort by modification time (newest first)
    patch_files.sort(key=lambda x: x[1], reverse=True)
    latest_file = patch_files[0][0]

    try:
        with open(latest_file, "r") as f:
            data = json.load(f)
            if isinstance(data, dict):
                return data
            else:
                print(f"Error: Patch file {latest_file} does not contain a dictionary")
                return None
    except Exception as e:
        print(f"Error loading latest patch: {e}")
        return None


def get_patch_status(patch_id: str) -> Dict[str, Any]:
    """Get the status of a specific patch."""
    # This is a placeholder function - in a real implementation,
    # you would load the actual patch status from storage
    return {
        "success": False,
        "message": "Patch status not available",
        "changes_made": False,
        "backup_created": False,
        "patch_id": patch_id,
        "timestamp": datetime.now().isoformat(),
    }
