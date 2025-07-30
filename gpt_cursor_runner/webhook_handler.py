#!/usr/bin/env python3
"""
Webhook Handler for GPT-Cursor Runner.

Handles incoming webhook requests from GPT and other sources.
"""

import os
import json
import datetime
from typing import Dict, Any

# Import notification system
try:
    from .slack_proxy import create_slack_proxy
    slack_proxy = create_slack_proxy()
except ImportError:
    slack_proxy = None

# Import event logger
try:
    from .event_logger import event_logger
except ImportError:
    event_logger = None  # type: ignore


def get_patches_directory() -> str:
    """Get the patches directory from environment or use default."""
    # Check for environment variable first
    patches_dir = os.getenv("PATCHES_DIRECTORY")
    if patches_dir:
        return patches_dir
    
    # For Fly.io container, use /tmp/patches (writable)
    if os.getenv("FLY_APP_NAME"):
        fly_patches_dir = "/tmp/patches"
        os.makedirs(fly_patches_dir, exist_ok=True)
        return fly_patches_dir
    
    # Default to the centralized CYOPS location for local development
    default_dir = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches"
    # If default doesn't exist, try relative patches directory
    if not os.path.exists(default_dir):
        relative_dir = "patches"
        if os.path.exists(relative_dir):
            return relative_dir
    return default_dir


def create_webhook_handler() -> Any:
    """Create webhook handler function for Flask integration."""
    return process_hybrid_block


def process_hybrid_block(block_data: Dict[str, Any]) -> Dict[str, Any]:
    """Process a GPT hybrid block and save it as a patch."""
    try:
        # Add debug logging for Fly.io
        print(f"🔍 Processing hybrid block: {json.dumps(block_data, indent=2)}")
        
        # Validate required fields
        required_fields = ["id", "role", "target_file", "patch"]
        for field in required_fields:
            if field not in block_data:
                error_msg = f"Missing required field: {field}"
                print(f"❌ Validation error: {error_msg}")
                if event_logger:
                    event_logger.log_system_event(
                        "webhook_validation_error",
                        {"error": error_msg, "block_data": block_data},
                    )
                if slack_proxy:
                    slack_proxy.notify_error(error_msg, context="process_hybrid_block")
                return {"success": False, "error": error_msg}

        # Get patches directory from configuration
        patches_dir = get_patches_directory()
        print(f"📁 Using patches directory: {patches_dir}")
        os.makedirs(patches_dir, exist_ok=True)

        # Generate timestamped filename
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{block_data['id']}_{timestamp}.json"
        filepath = os.path.join(patches_dir, filename)
        print(f"💾 Saving patch to: {filepath}")

        # Save the block
        with open(filepath, "w") as f:
            json.dump(block_data, f, indent=2)

        print(f"✅ Patch saved successfully to {filepath}")

        # Log success
        if event_logger:
            event_logger.log_system_event(
                "patch_created",
                {
                    "patch_id": block_data["id"],
                    "target_file": block_data.get("target_file"),
                    "filepath": filepath,
                },
            )

        # Notify Slack of patch creation
        if slack_proxy:
            slack_proxy.notify_patch_created(block_data)

        # Forward patch to Ghost Runner for execution with enhanced error handling
        forward_success = forward_patch_to_ghost(block_data)

        return {
            "success": True,
            "message": f"Patch saved to {filename} and forwarded to Ghost Runner",
            "filepath": filepath,
            "patch_id": block_data["id"],
            "forwarded": forward_success
        }

    except Exception as e:
        import traceback
        error_msg = f"Error processing hybrid block: {str(e)}"
        print(f"❌ Exception in process_hybrid_block: {error_msg}")
        print(f"🔍 Traceback: {traceback.format_exc()}")
        if event_logger:
            event_logger.log_system_event(
                "webhook_error", {"error": error_msg, "block_data": block_data}
            )
        # Notify Slack of error
        if slack_proxy:
            slack_proxy.notify_error(error_msg, context="process_hybrid_block")
        return {"success": False, "error": error_msg}


def forward_patch_to_ghost(block_data: Dict[str, Any]) -> bool:
    """Forward patch to Ghost Runner with comprehensive error handling."""
    try:
        # Try multiple Ghost Runner endpoints
        ghost_endpoints = [
            "http://localhost:5053/patch",
            "http://127.0.0.1:5053/patch",
            "http://localhost:5053/execute"
        ]

        for endpoint in ghost_endpoints:
            try:
                print(f"[FORWARD] Attempting to forward to {endpoint}")
                import requests
                response = requests.post(endpoint, json=block_data, timeout=15)
                
                if response.status_code == 200:
                    print(f"[FORWARD SUCCESS] Patch {block_data['id']} sent to Ghost Runner at {endpoint}")
                    if event_logger:
                        event_logger.log_system_event(
                            "patch_forwarded_to_ghost",
                            {
                                "patch_id": block_data["id"],
                                "endpoint": endpoint,
                                "ghost_response": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
                            },
                        )
                    return True
                else:
                    print(f"[FORWARD ERROR] Ghost responded with status: {response.status_code} from {endpoint}")
                    
            except Exception as e:
                print(f"[FORWARD EXCEPTION] Failed to connect to {endpoint}: {str(e)}")
                continue

        # If all endpoints failed, log the failure
        error_msg = f"All Ghost Runner endpoints failed for patch {block_data['id']}"
        print(f"[FORWARD FAILURE] {error_msg}")
        if event_logger:
            event_logger.log_system_event(
                "ghost_forward_failed",
                {
                    "patch_id": block_data["id"],
                    "error": error_msg,
                },
            )
        return False

    except Exception as e:
        error_msg = f"Unexpected error forwarding patch: {str(e)}"
        print(f"[FORWARD EXCEPTION] {error_msg}")
        if event_logger:
            event_logger.log_system_event(
                "ghost_forward_error",
                {
                    "patch_id": block_data["id"],
                    "error": error_msg,
                },
            )
        return False


def process_summary(summary_data: Dict[str, Any]) -> Dict[str, Any]:
    """Process a summary and save it to the summaries directory."""
    try:
        # Validate required fields
        if "content" not in summary_data:
            error_msg = "Missing required field: content"
            if event_logger:
                event_logger.log_system_event(
                    "summary_validation_error",
                    {"error": error_msg, "summary_data": summary_data},
                )
            return {"success": False, "error": error_msg}

        # Get summaries directory from environment or use default
        summaries_dir = os.getenv(
            "SUMMARIES_DIRECTORY",
            "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries",
        )
        os.makedirs(summaries_dir, exist_ok=True)

        # Generate filename
        summary_id = summary_data.get("id", f"summary-{int(datetime.datetime.now().timestamp())}")
        filename = f"{summary_id}.md"
        filepath = os.path.join(summaries_dir, filename)

        # Save the summary
        with open(filepath, "w") as f:
            f.write(summary_data["content"])

        # Log success
        if event_logger:
            event_logger.log_system_event(
                "summary_created",
                {
                    "summary_id": summary_id,
                    "filepath": filepath,
                },
            )

        return {
            "success": True,
            "message": f"Summary saved to {filename}",
            "filepath": filepath,
            "summary_id": summary_id,
        }

    except Exception as e:
        error_msg = f"Error processing summary: {str(e)}"
        if event_logger:
            event_logger.log_system_event(
                "summary_error", {"error": error_msg, "summary_data": summary_data}
            )
        return {"success": False, "error": error_msg}