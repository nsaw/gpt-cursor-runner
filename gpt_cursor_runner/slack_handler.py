"""
Slack Handler for GPT-Cursor Runner.

Handles Slack slash commands and events with logging.
"""

import os
import json
import hmac
import hashlib
import time
import requests
import re
from typing import Dict, Any, Optional, List
from flask import request, jsonify
from datetime import datetime

# Import event logger
try:
    from .event_logger import event_logger
except ImportError:
    event_logger = None

# Import notification system
try:
    from .slack_proxy import create_slack_proxy
    slack_proxy = create_slack_proxy()
except ImportError:
    slack_proxy = None

def verify_slack_signature(request_body: bytes, signature: str, timestamp: str) -> bool:
    """Verify Slack request signature."""
    slack_signing_secret = os.getenv('SLACK_SIGNING_SECRET')
    if not slack_signing_secret:
        return True  # Skip verification if not configured
    
    # Create the signature base string
    sig_basestring = f"v0:{timestamp}:{request_body.decode('utf-8')}"
    
    # Create the expected signature
    expected_signature = f"v0={hmac.new(slack_signing_secret.encode('utf-8'), sig_basestring.encode('utf-8'), hashlib.sha256).hexdigest()}"
    
    return hmac.compare_digest(expected_signature, signature)

def handle_slack_command(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle Slack slash command."""
    command = request_data.get('command', '')
    text = request_data.get('text', '')
    user_id = request_data.get('user_id', '')
    channel_id = request_data.get('channel_id', '')
    
    # Log the command
    if event_logger:
        event_logger.log_slack_event("slash_command", {
            "user_id": user_id,
            "channel_id": channel_id,
            "command": command,
            "text": text
        })
    
    try:
        if command == '/patch':
            return handle_patch_command(text, user_id, channel_id)
        elif command == '/patch-preview':
            return handle_patch_preview_command(text, user_id, channel_id)
        elif command == '/patch-status':
            return handle_patch_status_command(text, user_id, channel_id)
        elif command == '/dashboard':
            return handle_dashboard_command(text, user_id, channel_id)
        elif command == '/patch-approve':
            return handle_patch_approve_command(text, user_id, channel_id)
        elif command == '/patch-revert':
            return handle_patch_revert_command(text, user_id, channel_id)
        elif command == '/pause-runner':
            return handle_pause_runner_command(text, user_id, channel_id)
        elif command == '/command-center':
            return handle_command_center_command(text, user_id, channel_id)
        else:
            return {
                "response_type": "ephemeral",
                "text": f"Unknown command: {command}"
            }
    except Exception as e:
        error_msg = f"Error handling Slack command: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context=f"handle_slack_command: {command}")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_dashboard_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /dashboard slash command."""
    dashboard_url = os.getenv("DASHBOARD_URL", "http://localhost:5050/dashboard")
    
    # Log the dashboard request
    if event_logger:
        event_logger.log_slack_event("dashboard_request", {
            "user_id": user_id,
            "channel_id": channel_id,
            "dashboard_url": dashboard_url
        })
    
    return {
        "response_type": "in_channel",
        "text": f"📊 *Patch Dashboard:* <{dashboard_url}|Click to view live patch logs>",
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"📊 *Patch Dashboard*\n\n<{dashboard_url}|Click to view live patch logs>"
                }
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "Real-time monitoring of patches, events, and system status"
                    }
                ]
            }
        ]
    }

def handle_patch_approve_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /patch-approve slash command."""
    try:
        # Get the latest pending patch
        latest_patch = get_latest_pending_patch()
        
        if not latest_patch:
            return {
                "response_type": "ephemeral",
                "text": "❌ No pending patches found to approve"
            }
        
        # Apply the patch
        from .patch_runner import apply_patch
        result = apply_patch(latest_patch, dry_run=False)
        
        # Log the approval
        if event_logger:
            event_logger.log_slack_event("patch_approved", {
                "user_id": user_id,
                "channel_id": channel_id,
                "patch_id": latest_patch.get("id"),
                "result": result
            })
        
        # Notify Slack of patch approval
        if slack_proxy and result.get("success"):
            slack_proxy.notify_patch_applied(
                latest_patch.get("id", "unknown"),
                latest_patch.get("target_file", "unknown"),
                True
            )
        
        return {
            "response_type": "in_channel",
            "text": f"✅ *Patch Approved:* `{latest_patch.get('id')}`",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"✅ *Patch Approved Successfully*\n\n*ID:* `{latest_patch.get('id')}`\n*Target:* `{latest_patch.get('target_file')}`\n*Description:* {latest_patch.get('description')}"
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Approved by <@{user_id}> • {result.get('message', 'Applied successfully')}"
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error approving patch: {str(e)}"
        
        # Log the error
        if event_logger:
            event_logger.log_slack_event("patch_approve_error", {
                "user_id": user_id,
                "channel_id": channel_id,
                "error": str(e)
            })
        
        # Notify Slack of error
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="patch_approve_command")
        except Exception:
            pass
        
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_patch_revert_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /patch-revert slash command."""
    try:
        # Get the latest applied patch
        latest_patch = get_latest_applied_patch()
        
        if not latest_patch:
            return {
                "response_type": "ephemeral",
                "text": "❌ No patches found to revert"
            }
        
        # Revert the patch
        from .patch_reverter import PatchReverter
        reverter = PatchReverter()
        target_file = latest_patch.get("target_file")
        if not isinstance(target_file, str) or not target_file:
            return {
                "response_type": "ephemeral",
                "text": "❌ Latest patch does not have a valid target_file to revert."
            }
        result = reverter.revert_latest_patch(target_file)
        
        # Log the revert
        if event_logger:
            event_logger.log_slack_event("patch_reverted", {
                "user_id": user_id,
                "channel_id": channel_id,
                "patch_id": latest_patch.get("id"),
                "result": result
            })
        
        # Notify Slack of patch revert
        if slack_proxy and result.get("success"):
            slack_proxy.notify_patch_applied(
                latest_patch.get("id", "unknown"),
                latest_patch.get("target_file", "unknown"),
                False  # Reverted
            )
        
        return {
            "response_type": "in_channel",
            "text": f"♻️ *Patch Reverted:* `{latest_patch.get('id')}`",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"♻️ *Patch Reverted Successfully*\n\n*ID:* `{latest_patch.get('id')}`\n*Target:* `{latest_patch.get('target_file')}`\n*Description:* {latest_patch.get('description')}"
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Reverted by <@{user_id}> • {result.get('message', 'Reverted successfully')}"
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error reverting patch: {str(e)}"
        
        # Log the error
        if event_logger:
            event_logger.log_slack_event("patch_revert_error", {
                "user_id": user_id,
                "channel_id": channel_id,
                "error": str(e)
            })
        
        # Notify Slack of error
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="patch_revert_command")
        except Exception:
            pass
        
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_pause_runner_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /pause-runner slash command."""
    try:
        # Set a pause flag (this would need to be implemented in the main runner)
        pause_runner()
        
        # Log the pause request
        if event_logger:
            event_logger.log_slack_event("runner_paused", {
                "user_id": user_id,
                "channel_id": channel_id,
                "reason": text or "Manual pause"
            })
        
        # Notify Slack of runner pause
        try:
            if slack_proxy:
                slack_proxy.send_message("⏸️ GPT-Cursor Runner Paused", [{
                    "color": "warning",
                    "fields": [
                        {
                            "title": "Paused by",
                            "value": f"<@{user_id}>",
                            "short": True
                        },
                        {
                            "title": "Reason",
                            "value": text or "Manual pause",
                            "short": True
                        }
                    ],
                    "footer": "GPT-Cursor Runner",
                    "ts": int(time.time())
                }])
        except Exception:
            pass
        
        return {
            "response_type": "in_channel",
            "text": "⏸️ *GPT-Cursor Runner Paused*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "⏸️ *GPT-Cursor Runner Paused*\n\nGPT will stop submitting patches until manually resumed."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Paused by <@{user_id}> • Use `/resume-runner` to continue"
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error pausing runner: {str(e)}"
        
        # Log the error
        if event_logger:
            event_logger.log_slack_event("pause_runner_error", {
                "user_id": user_id,
                "channel_id": channel_id,
                "error": str(e)
            })
        
        # Notify Slack of error
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="pause_runner_command")
        except Exception:
            pass
        
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_command_center_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /command-center slash command."""
    try:
        # Log the command center request
        if event_logger:
            event_logger.log_slack_event("command_center_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "🎮 *Command Center*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*🎮 GPT-Cursor Runner Command Center*\n\nAvailable commands:"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": "*Patch Commands:*\n• `/patch` - Create a patch\n• `/patch-preview` - Preview a patch\n• `/patch-status` - Show patch stats\n• `/patch-approve` - Approve latest patch\n• `/patch-revert` - Revert latest patch"
                        },
                        {
                            "type": "mrkdwn",
                            "text": "*System Commands:*\n• `/dashboard` - Open dashboard\n• `/pause-runner` - Pause GPT submissions\n• `/command-center` - Show this help"
                        }
                    ]
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • Use any command to get started"
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error showing command center: {str(e)}"
        
        # Log the error
        if event_logger:
            event_logger.log_slack_event("command_center_error", {
                "user_id": user_id,
                "channel_id": channel_id,
                "error": str(e)
            })
        
        # Notify Slack of error
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="command_center_command")
        except Exception:
            pass
        
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def get_latest_pending_patch() -> Optional[Dict[str, Any]]:
    """Get the latest pending patch."""
    try:
        from .patch_runner import load_latest_patch
        return load_latest_patch()
    except Exception as e:
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error getting latest pending patch: {e}", context="get_latest_pending_patch")
        except Exception:
            pass
        return None

def get_latest_applied_patch() -> Optional[Dict[str, Any]]:
    """Get the latest applied patch."""
    return get_latest_pending_patch()  # For now, same as pending

def pause_runner():
    """Pause the runner (placeholder)."""
    print("⏸️ Runner paused")
    # This would set a global flag or update a status file

def handle_patch_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /patch slash command."""
    if not text.strip():
        return {
            "response_type": "ephemeral",
            "text": "❌ Please provide patch details. Usage: `/patch <file> <desc> <pattern> <replacement>`"
        }
    
    try:
        # Parse the patch command
        parts = text.split(' ', 3)
        if len(parts) < 4:
            return {
                "response_type": "ephemeral",
                "text": "❌ Invalid format. Usage: `/patch <file> <desc> <pattern> <replacement>`"
            }
        
        target_file, description, pattern, replacement = parts
        
        # Create patch data
        patch_data = {
            "id": f"slack-patch-{int(time.time())}",
            "role": "ui_patch",
            "description": description,
            "target_file": target_file,
            "patch": {
                "pattern": pattern,
                "replacement": replacement
            },
            "metadata": {
                "author": f"<@{user_id}>",
                "source": "slack_command",
                "timestamp": datetime.now().isoformat()
            }
        }
        
        # Process the patch
        from .webhook_handler import process_hybrid_block
        result = process_hybrid_block(patch_data)
        
        # Log the result
        if event_logger:
            event_logger.log_slack_event("patch_created", {
                "user_id": user_id,
                "channel_id": channel_id,
                "patch_id": patch_data["id"],
                "result": result
            })
        
        if result.get("success"):
            return {
                "response_type": "in_channel",
                "text": f"✅ *Patch Created:* `{patch_data['id']}`",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"✅ *Patch Created Successfully*\n\n*ID:* `{patch_data['id']}`\n*Target:* `{target_file}`\n*Description:* {description}"
                        }
                    },
                    {
                        "type": "context",
                        "elements": [
                            {
                                "type": "mrkdwn",
                                "text": f"Created by <@{user_id}> • Use `/patch-approve` to apply"
                            }
                        ]
                    }
                ]
            }
        else:
            return {
                "response_type": "ephemeral",
                "text": f"❌ Error creating patch: {result.get('error', 'Unknown error')}"
            }
        
    except Exception as e:
        error_msg = f"Error creating patch: {str(e)}"
        
        # Log the error
        if event_logger:
            event_logger.log_slack_event("patch_error", {
                "user_id": user_id,
                "channel_id": channel_id,
                "command": "/patch",
                "text": text
            }, {"error": str(e)})
        
        # Notify Slack of error
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="patch_command")
        except Exception:
            pass
        
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_patch_preview_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /patch-preview slash command."""
    if not text.strip():
        return {
            "response_type": "ephemeral",
            "text": "❌ Please provide a patch ID to preview. Usage: `/patch-preview <patch_id>`"
        }
    
    try:
        search_term = text.strip()
        patches = search_patches(search_term)
        
        if not patches:
            return {
                "response_type": "ephemeral",
                "text": f"❌ No patches found matching '{search_term}'"
            }
        
        patch = patches[0]  # Get the first match
        
        return {
            "response_type": "ephemeral",
            "text": f"📋 Patch Preview: `{patch['id']}`",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Patch Preview*\n\n*ID:* `{patch['id']}`\n*Target:* `{patch['target_file']}`\n*Description:* {patch['description']}"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Pattern:*\n```{patch['patch']['pattern']}```"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Replacement:*\n```{patch['patch']['replacement']}```"
                        }
                    ]
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Created: {patch['metadata'].get('timestamp', 'Unknown')}"
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error searching patches: {str(e)}"
        
        # Log the error
        if event_logger:
            event_logger.log_slack_event("patch_preview_error", {
                "user_id": user_id,
                "channel_id": channel_id,
                "search_term": search_term
            }, {"error": str(e)})
        
        # Notify Slack of error
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="patch_preview_command")
        except Exception:
            pass
        
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_patch_status_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /patch-status slash command."""
    try:
        # Get patch statistics
        stats = get_patch_status()
        
        # Log the status request
        if event_logger:
            event_logger.log_slack_event("patch_status", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "📊 Patch Status Report",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*📊 Patch Status Report*"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Total Patches:* {stats['total_patches']}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Recent (24h):* {stats['recent_24h']}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Success Rate:* {stats['success_rate']:.1f}%"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Avg Apply Time:* {stats['avg_apply_time']:.2f}s"
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error getting patch status: {str(e)}"
        
        # Log the error
        if event_logger:
            event_logger.log_slack_event("patch_status_error", {
                "user_id": user_id,
                "channel_id": channel_id
            }, {"error": str(e)})
        
        # Notify Slack of error
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="patch_status_command")
        except Exception:
            pass
        
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def search_patches(search_term: str) -> List[Dict[str, Any]]:
    """Search patches by content."""
    try:
        from .patch_viewer import list_patches
        patches = list_patches()
        
        results = []
        search_term_lower = search_term.lower()
        
        for patch in patches:
            data = patch["data"]
            
            # Search in various fields
            searchable_text = [
                data.get("id", ""),
                data.get("description", ""),
                data.get("target_file", ""),
                data.get("metadata", {}).get("author", ""),
                data.get("metadata", {}).get("source", ""),
                data.get("patch", {}).get("pattern", ""),
                data.get("patch", {}).get("replacement", "")
            ]
            
            if any(search_term_lower in text.lower() for text in searchable_text):
                results.append(data)
        
        return results
        
    except Exception as e:
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error searching patches: {e}", context=search_term)
        except Exception:
            pass
        return []

def get_patch_status() -> Dict[str, Any]:
    """Get patch statistics for /patch-status."""
    stats = {
        "total_patches": 0,
        "recent_24h": 0,
        "success_rate": 0.0,
        "avg_apply_time": 0.0
    }
    try:
        from .patch_metrics import metrics_tracker
        summary = metrics_tracker.get_summary()
        stats["total_patches"] = summary.get("total_patches", 0)
        try:
            # Calculate recent_24h from patch files
            import os
            import time
            current_time = time.time()
            patches_dir = "patches"
            if os.path.exists(patches_dir):
                for filename in os.listdir(patches_dir):
                    if filename.endswith('.json'):
                        stat = os.stat(os.path.join(patches_dir, filename))
                        if current_time - stat.st_mtime < 24 * 3600:  # 24 hours
                            stats["recent_24h"] += 1
        except Exception as e:
            try:
                if slack_proxy:
                    slack_proxy.notify_error(f"Error calculating recent_24h: {e}")
            except Exception:
                pass
        stats["success_rate"] = summary.get("success_rate", 0.0)
        stats["avg_apply_time"] = summary.get("average_duration_ms", 0.0) / 1000  # Convert to seconds
    except Exception as e:
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error in get_patch_status: {e}")
        except Exception:
            pass
    return stats

def handle_slack_event(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle Slack events."""
    event = event_data.get('event', {})
    event_type = event.get('type')
    
    if event_type == 'app_mention':
        return handle_app_mention(event)
    elif event_type == 'message':
        return handle_message_event(event)
    else:
        return {"status": "ok"}

def handle_app_mention(event: Dict[str, Any]) -> Dict[str, Any]:
    """Handle app mention events."""
    text = event.get('text', '')
    user_id = event.get('user', '')
    channel_id = event.get('channel', '')
    
    # Extract command from mention
    # Remove bot mention and extract command
    mention_pattern = f"<@{os.getenv('SLACK_BOT_ID', 'BOT_ID')}>"
    command_text = text.replace(mention_pattern, '').strip()
    
    # Log the mention
    if event_logger:
        event_logger.log_slack_event("app_mention", {
            "user_id": user_id,
            "channel_id": channel_id,
            "text": command_text
        })
    
    # Handle different commands
    if command_text.startswith('patch '):
        return handle_patch_command(command_text[6:], user_id, channel_id)
    elif command_text.startswith('preview '):
        return handle_patch_preview_command(command_text[8:], user_id, channel_id)
    elif command_text.startswith('status'):
        return handle_patch_status_command("", user_id, channel_id)
    elif command_text.startswith('dashboard'):
        return handle_dashboard_command("", user_id, channel_id)
    elif command_text.startswith('approve'):
        return handle_patch_approve_command("", user_id, channel_id)
    elif command_text.startswith('revert'):
        return handle_patch_revert_command("", user_id, channel_id)
    elif command_text.startswith('pause'):
        return handle_pause_runner_command("", user_id, channel_id)
    elif command_text.startswith('help'):
        return handle_help_command(user_id, channel_id)
    else:
        return {
            "response_type": "ephemeral",
            "text": "Available commands:\n• `patch <file> <desc> <pattern> <replacement>`\n• `preview <patch_id>` - Preview a patch\n• `status` - Show patch statistics\n• `dashboard` - Open dashboard\n• `approve` - Approve latest patch\n• `revert` - Revert latest patch\n• `pause` - Pause runner\n• `help` - Show this help"
        }

def handle_message_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Handle message events."""
    # For now, just log the message
    if event_logger:
        event_logger.log_slack_event("message", {
            "user_id": event.get('user', ''),
            "channel_id": event.get('channel', ''),
            "text": event.get('text', '')
        })
    
    return {"status": "ok"}

def handle_status_command(user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle status command."""
    try:
        # Get system status
        status = get_system_status()
        
        # Log the status request
        if event_logger:
            event_logger.log_slack_event("status_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "📊 System Status",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*📊 System Status*"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Status:* {status['status']}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Uptime:* {status['uptime']}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Memory:* {status['memory_usage']}%"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Disk:* {status['disk_usage']}%"
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error getting status: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="status_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_help_command(user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle help command."""
    try:
        # Log the help request
        if event_logger:
            event_logger.log_slack_event("help_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "ephemeral",
            "text": "🤖 *GPT-Cursor Runner Help*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*🤖 GPT-Cursor Runner Help*\n\nI can help you manage code patches and monitor the system."
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": "*Patch Commands:*\n• `/patch` - Create a patch\n• `/patch-preview` - Preview a patch\n• `/patch-status` - Show patch stats\n• `/patch-approve` - Approve latest patch\n• `/patch-revert` - Revert latest patch"
                        },
                        {
                            "type": "mrkdwn",
                            "text": "*System Commands:*\n• `/dashboard` - Open dashboard\n• `/pause-runner` - Pause GPT submissions\n• `/command-center` - Show all commands"
                        }
                    ]
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": "Need help? Just mention me with any command!"
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error showing help: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="help_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def get_system_status() -> Dict[str, Any]:
    """Get system status."""
    try:
        import psutil
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('.')
        
        return {
            "status": "Running",
            "uptime": "Unknown",  # Would need to track start time
            "memory_usage": memory.percent,
            "disk_usage": (disk.used / disk.total) * 100
        }
    except ImportError:
        return {
            "status": "Running (limited)",
            "uptime": "Unknown",
            "memory_usage": 0,
            "disk_usage": 0
        }
    except Exception as e:
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error getting system status: {e}")
        except Exception:
            pass
        return {
            "status": "Error",
            "uptime": "Unknown",
            "memory_usage": 0,
            "disk_usage": 0
        }

def send_slack_response(response_url: str, response_data: Dict[str, Any]) -> bool:
    """Send response to Slack using response_url."""
    try:
        response = requests.post(response_url, json=response_data, timeout=5)
        return response.status_code == 200
    except Exception as e:
        if event_logger:
            event_logger.log_slack_event("response_error", {
                "response_url": response_url,
                "error": str(e)
            })
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error sending Slack response: {e}", context=response_url)
        except Exception:
            pass
        return False 

def create_slack_webhook_handler():
    """Create Slack webhook handler function for Flask integration."""
    return handle_slack_webhook

def handle_slack_webhook():
    """Handle Slack webhook requests."""
    try:
        # Verify Slack signature (skip in debug mode)
        debug_mode = os.getenv('DEBUG_MODE', 'false').lower() == 'true'
        print(f"DEBUG: DEBUG_MODE = {os.getenv('DEBUG_MODE')}, debug_mode = {debug_mode}")
        
        if not debug_mode:
            timestamp = request.headers.get('X-Slack-Request-Timestamp', '')
            signature = request.headers.get('X-Slack-Signature', '')
            
            if not verify_slack_signature(request.get_data(), signature, timestamp):
                return jsonify({"error": "Invalid signature"}), 401
        else:
            print("DEBUG: Skipping signature verification in debug mode")
        
        # Parse request data
        if request.content_type == 'application/x-www-form-urlencoded':
            data = request.form.to_dict()
        else:
            data = request.get_json()
        
        # Log the Slack request
        if event_logger:
            event_logger.log_system_event("slack_webhook_received", {
                "data": data,
                "headers": dict(request.headers)
            })
        
        # Handle URL verification
        if data.get('type') == 'url_verification':
            return jsonify({"challenge": data.get('challenge', '')})
        
        # Handle slash commands
        if 'command' in data:
            response = handle_slack_command(data)
            
            # Send response if response_url is provided
            response_url = data.get('response_url')
            if response_url:
                send_slack_response(response_url, response)
            
            return jsonify(response)
        
        # Handle events
        if data.get('type') == 'event_callback':
            data.get('event', {})
            response = handle_slack_event(data)
            return jsonify(response)
        
        return jsonify({"status": "ok"})
        
    except Exception as e:
        error_msg = f"Error processing Slack webhook: {str(e)}"
        
        # Log the error
        if event_logger:
            event_logger.log_system_event("slack_webhook_error", {
                "error": str(e),
                "headers": dict(request.headers)
            })
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="/webhook Slack handler")
        except Exception:
            pass
        return jsonify({"error": error_msg}), 500 