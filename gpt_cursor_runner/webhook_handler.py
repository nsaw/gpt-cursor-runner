#!/usr/bin/env python3
"""
Webhook Handler for GPT-Cursor Runner.

Processes incoming GPT hybrid blocks and saves them as patches.
"""

import os
import json
from datetime import datetime
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
    event_logger = None

def create_webhook_handler():
    """Create webhook handler function for Flask integration."""
    return process_hybrid_block

def process_hybrid_block(block_data: Dict[str, Any]) -> Dict[str, Any]:
    """Process a GPT hybrid block and save it as a patch."""
    try:
        # Validate required fields
        required_fields = ["id", "role", "target_file", "patch"]
        for field in required_fields:
            if field not in block_data:
                error_msg = f"Missing required field: {field}"
                if event_logger:
                    event_logger.log_system_event("webhook_validation_error", {"error": error_msg, "block_data": block_data})
                if slack_proxy:
                    slack_proxy.notify_error(error_msg, context="process_hybrid_block")
                return {"success": False, "error": error_msg}
        
        # Create patches directory if it doesn't exist
        patches_dir = "patches"
        os.makedirs(patches_dir, exist_ok=True)
        
        # Generate timestamped filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{block_data['id']}_{timestamp}.json"
        filepath = os.path.join(patches_dir, filename)
        
        # Save the block
        with open(filepath, "w") as f:
            json.dump(block_data, f, indent=2)
        
        # Log success
        if event_logger:
            event_logger.log_system_event("patch_created", {
                "patch_id": block_data["id"],
                "target_file": block_data.get("target_file"),
                "filepath": filepath
            })
        
        # Notify Slack of patch creation
        if slack_proxy:
            slack_proxy.notify_patch_created(
                block_data["id"],
                block_data.get("target_file", "Unknown"),
                block_data.get("description", "No description")
            )
        
        return {
            "success": True,
            "message": f"Patch saved to {filename}",
            "filepath": filepath,
            "patch_id": block_data["id"]
        }
        
    except Exception as e:
        error_msg = f"Error processing hybrid block: {str(e)}"
        
        # Log error
        if event_logger:
            event_logger.log_system_event("webhook_processing_error", {
                "error": error_msg,
                "block_data": block_data
            })
        
        # Notify Slack of error
        if slack_proxy:
            slack_proxy.notify_error(error_msg, context="process_hybrid_block")
        
        return {
            "success": False,
            "error": error_msg
        }

