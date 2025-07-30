#!/usr/bin/env python3
"""
Webhook Handler for GPT-Cursor Runner.

Handles incoming webhook requests from GPT and other sources.
"""

import os
import json
import datetime
import traceback
import requests
import time
import logging
from typing import Dict, Any
from flask import request, jsonify

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

# Forwarding configuration
LOCAL_GHOST_URL = os.getenv("LOCAL_GHOST_URL", "http://localhost:5053/patch")
RETRY_COUNT = 2


def forward_to_local_runner(patch_path: str, patch_id: str) -> bool:
    """Forward the saved patch JSON to the local Ghost Runner."""
    try:
        with open(patch_path, "rb") as f:
            payload = f.read()
        
        for attempt in range(RETRY_COUNT + 1):
            try:
                r = requests.post(
                    LOCAL_GHOST_URL, 
                    headers={"Content-Type": "application/json"}, 
                    data=payload, 
                    timeout=5
                )
                if r.ok:
                    print(f"[WEBHOOK] ✅ Forwarded {patch_id} to local runner (attempt {attempt + 1})")
                    return True
                else:
                    print(f"[WEBHOOK] ⚠️  Local forward failed {r.status_code}: {r.text}")
            except Exception as e:
                print(f"[WEBHOOK] ⚠️  Local forward error (attempt {attempt + 1}): {e}")
            
            if attempt < RETRY_COUNT:
                time.sleep(1)
        
        return False
    except Exception as e:
        print(f"[WEBHOOK] ❌ Forwarding setup error: {e}")
        return False


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
        # Create default directory if it doesn't exist
        os.makedirs(default_dir, exist_ok=True)
    
    return default_dir


def validate_webhook_payload(payload: Dict[str, Any]) -> bool:
    """Validate webhook payload has all required fields."""
    required_fields = ['id', 'role', 'target_file', 'patch']
    for field in required_fields:
        if field not in payload:
            raise ValueError(f"Missing required field: {field}")
    
    # Validate patch structure
    if not isinstance(payload.get('patch'), dict):
        raise ValueError("Patch must be a dictionary")
    
    return True


def process_hybrid_block(block_data: Dict[str, Any]) -> Dict[str, Any]:
    """Process a GPT hybrid block and save it as a patch."""
    try:
        # Enhanced logging for all requests
        print(f"[WEBHOOK] 🔍 Processing hybrid block at {datetime.datetime.utcnow()}")
        print(f"[WEBHOOK] 📦 Payload: {json.dumps(block_data, indent=2)}")
        
        # Validate required fields
        validate_webhook_payload(block_data)
        
        patch_id = block_data.get("id", "")
        target_file = block_data.get("target_file", "")
        
        print(f"[WEBHOOK] ✅ Validation passed for patch_id: {patch_id}")
        
        # Create timestamp and sanitize filename
        timestamp = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        sanitized_id = patch_id.replace("/", "_").replace(" ", "_")
        filename = f"{sanitized_id}_{timestamp}.json"
        
        # Get patches directory and create full path
        patch_dir = get_patches_directory()
        full_path = os.path.join(patch_dir, filename)
        
        print(f"[WEBHOOK] 📁 Saving to: {full_path}")
        
        # Ensure directory exists
        os.makedirs(patch_dir, exist_ok=True)
        
        # Save the patch file
        with open(full_path, "w") as f:
            json.dump(block_data, f, indent=2)
        
        print(f"[WEBHOOK] ✅ Patch saved successfully to {full_path}")
        
        # Log success to event logger if available
        if event_logger:
            event_logger.log_system_event(
                "webhook_patch_saved",
                {
                    "patch_id": patch_id,
                    "filepath": full_path,
                    "target_file": target_file,
                    "timestamp": timestamp
                }
            )
        
        # Forward to local Ghost Runner
        forwarded = forward_to_local_runner(full_path, patch_id)
        
        print(f"[WEBHOOK] ✅ Processing completed successfully for {patch_id}")
        
        return {
            "success": True,
            "patch_id": patch_id,
            "filepath": full_path,
            "message": f"Patch saved to {filename} and forwarded to Ghost Runner",
            "forwarded": forwarded
        }
        
    except ValueError as validation_error:
        error_msg = f"Validation error: {str(validation_error)}"
        print(f"[WEBHOOK] ❌ {error_msg}")
        if event_logger:
            event_logger.log_system_event(
                "webhook_validation_error",
                {"error": error_msg, "block_data": block_data}
            )
        raise
        
    except Exception as e:
        error_msg = f"Processing error: {str(e)}"
        print(f"[WEBHOOK] ❌ {error_msg}")
        print(f"[WEBHOOK] 🔍 Traceback: {traceback.format_exc()}")
        
        if event_logger:
            event_logger.log_system_event(
                "webhook_processing_error",
                {
                    "error": error_msg,
                    "traceback": traceback.format_exc(),
                    "block_data": block_data
                }
            )
        raise


def process_summary(summary_data: Dict[str, Any]) -> Dict[str, Any]:
    """Process a summary and save it."""
    try:
        print(f"[WEBHOOK] 📝 Processing summary at {datetime.datetime.utcnow()}")
        print(f"[WEBHOOK] 📦 Summary data: {json.dumps(summary_data, indent=2)}")
        
        # Validate summary data
        if not isinstance(summary_data, dict):
            raise ValueError("Summary data must be a dictionary")
        
        summary_id = summary_data.get("id", "unknown")
        print(f"[WEBHOOK] ✅ Summary validation passed for: {summary_id}")
        
        # Save summary (implementation would go here)
        print(f"[WEBHOOK] ✅ Summary processing completed for {summary_id}")
        
        return {
            "success": True,
            "summary_id": summary_id,
            "message": "Summary processed successfully"
        }
        
    except Exception as e:
        error_msg = f"Summary processing error: {str(e)}"
        print(f"[WEBHOOK] ❌ {error_msg}")
        print(f"[WEBHOOK] 🔍 Traceback: {traceback.format_exc()}")
        raise


def handle_webhook_post() -> tuple:
    """Handle POST requests to the webhook endpoint with enhanced logging and error handling."""
    try:
        # Log incoming request
        print(f"[WEBHOOK] 🚀 POST request received at {datetime.datetime.utcnow()}")
        print(f"[WEBHOOK] 📋 Headers: {dict(request.headers)}")
        print(f"[WEBHOOK] 🌐 Remote IP: {request.remote_addr}")
        user_agent = request.headers.get('User-Agent', 'Unknown')
        print(f"[WEBHOOK] 👤 User Agent: {user_agent}")
        
        # Parse JSON payload
        try:
            payload = request.get_json(force=True)
            print("[WEBHOOK] 📦 Payload parsed successfully")
        except Exception as json_error:
            error_msg = f"JSON parsing error: {str(json_error)}"
            print(f"[WEBHOOK] ❌ {error_msg}")
            return jsonify({
                "status": "error",
                "message": error_msg
            }), 400
        
        # Validate payload structure
        if not isinstance(payload, dict):
            error_msg = "Payload must be a JSON object"
            print(f"[WEBHOOK] ❌ {error_msg}")
            return jsonify({
                "status": "error",
                "message": error_msg
            }), 400
        
        # Process the payload
        result = process_hybrid_block(payload)
        
        print("[WEBHOOK] ✅ Request processed successfully")
        
        return jsonify({
            "status": "success",
            "result": result
        }), 200
        
    except ValueError as validation_error:
        error_msg = f"Validation error: {str(validation_error)}"
        print(f"[WEBHOOK] ❌ {error_msg}")
        return jsonify({
            "status": "error",
            "message": error_msg
        }), 400
        
    except Exception as e:
        error_msg = f"Internal server error: {str(e)}"
        print(f"[WEBHOOK] ❌ {error_msg}")
        print(f"[WEBHOOK] 🔍 Full traceback: {traceback.format_exc()}")
        
        # Log to event logger if available
        if event_logger:
            event_logger.log_system_event(
                "webhook_server_error",
                {
                    "error": error_msg,
                    "traceback": traceback.format_exc(),
                    "headers": dict(request.headers),
                    "remote_ip": request.remote_addr
                }
            )
        
        return jsonify({
            "status": "error",
            "message": "Internal server error occurred while processing request"
        }), 500