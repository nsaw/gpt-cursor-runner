#!/usr/bin/env python3
"""
Patch Viewer for GPT-Cursor Runner.

Provides patch viewing and management capabilities.
"""

import os
import json
import glob
from datetime import datetime
from typing import Dict, Any, List, Optional

# Import dependencies
try:
    from .event_logger import event_logger
except ImportError:
    event_logger = None

try:
    from .slack_proxy import create_slack_proxy
    slack_proxy = create_slack_proxy()
except ImportError:
    slack_proxy = None


def list_patches(patches_dir: Optional[str] = None) -> List[Dict[str, Any]]:
    """List all patches with metadata."""
    if patches_dir is None:
        # Try to get patches directory from environment or config
        patches_dir = os.getenv("PATCHES_DIRECTORY", "patches")

    patches: List[Dict[str, Any]] = []
    
    if not os.path.exists(patches_dir):
        return patches
    
    patch_files = glob.glob(os.path.join(patches_dir, "*.json"))
    
    for filepath in patch_files:
        try:
            with open(filepath, "r") as f:
                patch_data = json.load(f)

            # Get file metadata
            stat = os.stat(filepath)
            
            patch_info = {
                "filename": os.path.basename(filepath),
                "filepath": filepath,
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "patch_id": patch_data.get("id", "unknown"),
                "target_file": patch_data.get("target_file", ""),
                "description": patch_data.get("description", ""),
                "author": patch_data.get("metadata", {}).get("author", "unknown"),
                "source": patch_data.get("metadata", {}).get("source", "unknown"),
                "status": patch_data.get("status", "unknown"),
            }

            patches.append(patch_info)

        except Exception as e:
            error_info = {
                "filename": os.path.basename(filepath),
                "filepath": filepath,
                "error": str(e),
                "status": "error",
            }
            patches.append(error_info)

            try:
                if slack_proxy:
                    slack_proxy.notify_error(f"Error reading patch file: {e}", context=filepath)
            except Exception:
                pass

    # Sort by modification time (newest first)
    patches.sort(key=lambda x: x.get("modified", ""), reverse=True)
    
    return patches


def view_patch(patch_id: str, patches_dir: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """View a specific patch by ID."""
    if patches_dir is None:
        patches_dir = os.getenv("PATCHES_DIRECTORY", "patches")

    if not os.path.exists(patches_dir):
        return None
    
    patch_files = glob.glob(os.path.join(patches_dir, "*.json"))
    
    for filepath in patch_files:
        try:
            with open(filepath, "r") as f:
                patch_data = json.load(f)
            
            if patch_data.get("id") == patch_id:
                # Get file metadata
                stat = os.stat(filepath)
                
                return {
                    "filename": os.path.basename(filepath),
                    "filepath": filepath,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "patch_data": patch_data,
                }

        except Exception as e:
            try:
                if slack_proxy:
                    slack_proxy.notify_error(f"Error reading patch file: {e}", context=filepath)
            except Exception:
                pass
            continue

    return None


def get_patch_summary(patches_dir: Optional[str] = None) -> Dict[str, Any]:
    """Get summary statistics for patches."""
    patches = list_patches(patches_dir)
    
    if not patches:
        return {
            "total_patches": 0,
            "by_status": {},
            "by_author": {},
            "by_source": {},
            "recent_24h": 0,
            "recent_7d": 0,
        }

    # Count by status
    status_counts = {}
    author_counts = {}
    source_counts = {}
    recent_24h = 0
    recent_7d = 0

    now = datetime.now()
    
    for patch in patches:
        if patch.get("status") == "error":
            continue

        # Count by status
        status = patch.get("status", "unknown")
        status_counts[status] = status_counts.get(status, 0) + 1

        # Count by author
        author = patch.get("author", "unknown")
        author_counts[author] = author_counts.get(author, 0) + 1

        # Count by source
        source = patch.get("source", "unknown")
        source_counts[source] = source_counts.get(source, 0) + 1

        # Count recent patches
        try:
            modified = datetime.fromisoformat(patch.get("modified", ""))
            age = now - modified
            
            if age.days == 0 and age.seconds < 24 * 3600:
                recent_24h += 1
            if age.days < 7:
                recent_7d += 1
        except Exception:
            pass

    return {
        "total_patches": len(patches),
        "by_status": status_counts,
        "by_author": author_counts,
        "by_source": source_counts,
        "recent_24h": recent_24h,
        "recent_7d": recent_7d,
    }


def search_patches(query: str, patches_dir: Optional[str] = None) -> List[Dict[str, Any]]:
    """Search patches by query string."""
    patches = list_patches(patches_dir)
    
    if not query:
        return patches

    query_lower = query.lower()
    results = []
    
    for patch in patches:
        if patch.get("status") == "error":
            continue

        # Search in various fields
        searchable_fields = [
            patch.get("patch_id", ""),
            patch.get("target_file", ""),
            patch.get("description", ""),
            patch.get("author", ""),
            patch.get("source", ""),
        ]

        if any(query_lower in field.lower() for field in searchable_fields):
            results.append(patch)

    return results


def get_patch_diff(patch_id: str, patches_dir: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Get diff information for a patch."""
    patch_info = view_patch(patch_id, patches_dir)
    
    if not patch_info:
        return None
    
    patch_data = patch_info.get("patch_data", {})
    patch_info = patch_data.get("patch", {})
    
    return {
        "patch_id": patch_id,
        "pattern": patch_info.get("pattern", ""),
        "replacement": patch_info.get("replacement", ""),
        "target_file": patch_data.get("target_file", ""),
        "description": patch_data.get("description", ""),
        "metadata": patch_data.get("metadata", {}),
    }


def validate_patch_file(filepath: str) -> Dict[str, Any]:
    """Validate a patch file."""
    result = {
        "valid": False,
        "errors": [],
        "warnings": [],
        "patch_data": None,
    }

    try:
        with open(filepath, "r") as f:
            patch_data = json.load(f)

        # Check required fields
        required_fields = ["id", "target_file", "patch"]
        for field in required_fields:
            if field not in patch_data:
                result["errors"].append(f"Missing required field: {field}")

        # Check patch structure
        patch_info = patch_data.get("patch", {})
        if not isinstance(patch_info, dict):
            result["errors"].append("Patch must be a dictionary")
        else:
            if "pattern" not in patch_info:
                result["errors"].append("Patch must contain 'pattern' field")
            if "replacement" not in patch_info:
                result["errors"].append("Patch must contain 'replacement' field")

        # Check target file
        target_file = patch_data.get("target_file")
        if target_file and not os.path.exists(target_file):
            result["warnings"].append(f"Target file not found: {target_file}")

        # If no errors, mark as valid
        if not result["errors"]:
            result["valid"] = True
            result["patch_data"] = patch_data

    except json.JSONDecodeError as e:
        result["errors"].append(f"Invalid JSON: {e}")
    except Exception as e:
        result["errors"].append(f"Error reading file: {e}")

    return result


def get_patch_stats(patches_dir: Optional[str] = None) -> Dict[str, Any]:
    """Get detailed patch statistics."""
    patches = list_patches(patches_dir)
    
    if not patches:
        return {
            "total_patches": 0,
            "successful_patches": 0,
            "failed_patches": 0,
            "success_rate": 0,
            "average_size": 0,
            "total_size": 0,
        }

    successful_patches = len([p for p in patches if p.get("status") != "error"])
    failed_patches = len(patches) - successful_patches
    success_rate = (successful_patches / len(patches) * 100) if patches else 0

    total_size = sum(p.get("size", 0) for p in patches)
    average_size = total_size / len(patches) if patches else 0

    return {
        "total_patches": len(patches),
        "successful_patches": successful_patches,
        "failed_patches": failed_patches,
        "success_rate": success_rate,
        "average_size": average_size,
        "total_size": total_size,
    }