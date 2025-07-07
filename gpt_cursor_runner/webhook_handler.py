#!/usr/bin/env python3
"""
Webhook Handler for GPT-Cursor Runner.

Processes incoming GPT hybrid blocks and saves them as patches.
"""

import os
import json
from datetime import datetime
from typing import Dict, Any

def process_hybrid_block(block_data: Dict[str, Any]) -> Dict[str, Any]:
    """Process a GPT hybrid block and save it as a patch."""
    try:
        # Validate required fields
        required_fields = ["id", "role", "target_file", "patch"]
        for field in required_fields:
            if field not in block_data:
                return {"success": False, "error": f"Missing required field: {field}"}
        
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
        
        return {
            "success": True,
            "message": f"Patch saved to {filename}",
            "filepath": filepath,
            "patch_id": block_data["id"]
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Error processing hybrid block: {str(e)}"
        }

