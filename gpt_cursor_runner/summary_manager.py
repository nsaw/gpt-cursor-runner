#!/usr/bin/env python3
"""
Summary Manager for GPT-Cursor Runner.

Enforces mandatory .md summary generation for all pipeline halts, failures, and pauses.
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

# Configuration
SUMMARIES_DIR = "/Users/sawyer/gitSync/gpt-cursor-runner/summaries"
SUMMARY_PREFIX = "summary-"

def ensure_summaries_directory():
    """Ensure the summaries directory exists."""
    os.makedirs(SUMMARIES_DIR, exist_ok=True)

def generate_summary_filename(event_type: str, context: str = "") -> str:
    """Generate a standardized summary filename."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_context = context.replace(" ", "_").replace("/", "_").replace("\\", "_")[:50]
    return f"{SUMMARY_PREFIX}{event_type}_{safe_context}_{timestamp}.md"

def write_summary_checkpoint(
    event_type: str,
    title: str,
    content: str,
    metadata: Optional[Dict[str, Any]] = None,
    context: str = ""
) -> str:
    """
    Write a mandatory summary checkpoint to summaries/ directory.
    
    Args:
        event_type: Type of event (pause, done, fallback, fail, manual, etc.)
        title: Summary title
        content: Summary content (markdown)
        metadata: Optional metadata dictionary
        context: Context string for filename generation
    
    Returns:
        Path to the written summary file
    """
    ensure_summaries_directory()
    
    # Generate filename
    filename = generate_summary_filename(event_type, context)
    filepath = os.path.join(SUMMARIES_DIR, filename)
    
    # Prepare summary content
    summary_content = f"""# {title}

**Event Type:** {event_type}
**Timestamp:** {datetime.now().isoformat()}
**Context:** {context}

{content}

"""
    
    # Add metadata if provided
    if metadata:
        summary_content += "\n## Metadata\n\n"
        summary_content += "```json\n"
        summary_content += json.dumps(metadata, indent=2)
        summary_content += "\n```\n"
    
    # Write summary file
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(summary_content)
    
    print(f"📝 Summary checkpoint written: {filepath}")
    return filepath

def write_pause_summary(
    reason: str,
    patch_data: Optional[Dict[str, Any]] = None,
    context: str = ""
) -> str:
    """Write a pause summary when DEV pauses for manual input."""
    title = f"Pipeline Pause: {reason}"
    content = f"""
## Pipeline Pause

The GPT-Cursor Runner pipeline has paused for manual input.

**Reason:** {reason}

### Next Steps
- Review the current state
- Provide manual input if required
- Resume pipeline when ready

### Current Status
- Pipeline: PAUSED
- Waiting for: Manual input
- Context: {context}
"""
    
    metadata = {
        "pause_reason": reason,
        "context": context,
        "patch_data": patch_data
    }
    
    return write_summary_checkpoint("pause", title, content, metadata, context)

def write_failure_summary(
    error_message: str,
    error_type: str = "unknown",
    patch_data: Optional[Dict[str, Any]] = None,
    context: str = ""
) -> str:
    """Write a failure summary when pipeline encounters an error."""
    title = f"Pipeline Failure: {error_type}"
    content = f"""
## Pipeline Failure

The GPT-Cursor Runner pipeline encountered an error and has stopped.

**Error Type:** {error_type}
**Error Message:** {error_message}

### Error Details
- Type: {error_type}
- Message: {error_message}
- Context: {context}
- Timestamp: {datetime.now().isoformat()}

### Recovery Steps
1. Review the error details above
2. Check logs for additional information
3. Fix the underlying issue
4. Restart the pipeline
"""
    
    metadata = {
        "error_type": error_type,
        "error_message": error_message,
        "context": context,
        "patch_data": patch_data
    }
    
    return write_summary_checkpoint("fail", title, content, metadata, context)

def write_completion_summary(
    result: Dict[str, Any],
    patch_data: Optional[Dict[str, Any]] = None,
    context: str = ""
) -> str:
    """Write a completion summary when pipeline finishes successfully."""
    title = "Pipeline Completion"
    content = f"""
## Pipeline Completion

The GPT-Cursor Runner pipeline has completed successfully.

**Status:** SUCCESS
**Context:** {context}

### Results
- Success: {result.get('success', False)}
- Message: {result.get('message', 'No message')}
- Changes Made: {result.get('changes_made', False)}

### Summary
The pipeline completed its task successfully. All operations have been completed as expected.
"""
    
    metadata = {
        "result": result,
        "context": context,
        "patch_data": patch_data
    }
    
    return write_summary_checkpoint("done", title, content, metadata, context)

def write_fallback_summary(
    fallback_reason: str,
    original_action: str,
    fallback_action: str,
    context: str = ""
) -> str:
    """Write a fallback summary when pipeline uses fallback mechanisms."""
    title = f"Pipeline Fallback: {fallback_reason}"
    content = f"""
## Pipeline Fallback

The GPT-Cursor Runner pipeline has activated a fallback mechanism.

**Fallback Reason:** {fallback_reason}
**Original Action:** {original_action}
**Fallback Action:** {fallback_action}

### Fallback Details
- Reason: {fallback_reason}
- Original: {original_action}
- Fallback: {fallback_action}
- Context: {context}

### Status
The pipeline has successfully switched to a fallback mechanism to ensure continued operation.
"""
    
    metadata = {
        "fallback_reason": fallback_reason,
        "original_action": original_action,
        "fallback_action": fallback_action,
        "context": context
    }
    
    return write_summary_checkpoint("fallback", title, content, metadata, context)

def write_manual_summary(
    action: str,
    user_input: str,
    context: str = ""
) -> str:
    """Write a manual intervention summary."""
    title = f"Manual Intervention: {action}"
    content = f"""
## Manual Intervention

A manual intervention has been recorded in the pipeline.

**Action:** {action}
**User Input:** {user_input}
**Context:** {context}

### Manual Action Details
- Action: {action}
- Input: {user_input}
- Context: {context}
- Timestamp: {datetime.now().isoformat()}

### Status
Manual intervention has been applied to the pipeline.
"""
    
    metadata = {
        "action": action,
        "user_input": user_input,
        "context": context
    }
    
    return write_summary_checkpoint("manual", title, content, metadata, context)

def write_daemon_summary(
    daemon_name: str,
    status: str,
    details: str,
    context: str = ""
) -> str:
    """Write a daemon status summary."""
    title = f"Daemon Status: {daemon_name}"
    content = f"""
## Daemon Status Update

**Daemon:** {daemon_name}
**Status:** {status}
**Context:** {context}

### Details
{details}

### Current Status
- Daemon: {daemon_name}
- Status: {status}
- Context: {context}
- Timestamp: {datetime.now().isoformat()}
"""
    
    metadata = {
        "daemon_name": daemon_name,
        "status": status,
        "details": details,
        "context": context
    }
    
    return write_summary_checkpoint("daemon", title, content, metadata, context)

def list_recent_summaries(limit: int = 10) -> list:
    """List recent summary files."""
    ensure_summaries_directory()
    
    summaries = []
    for filename in os.listdir(SUMMARIES_DIR):
        if filename.startswith(SUMMARY_PREFIX) and filename.endswith('.md'):
            filepath = os.path.join(SUMMARIES_DIR, filename)
            stat = os.stat(filepath)
            summaries.append({
                'filename': filename,
                'filepath': filepath,
                'size': stat.st_size,
                'modified': datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
    
    # Sort by modification time (newest first)
    summaries.sort(key=lambda x: x['modified'], reverse=True)
    return summaries[:limit]

def get_summary_content(filepath: str) -> str:
    """Get the content of a summary file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"Error reading summary file: {e}" 