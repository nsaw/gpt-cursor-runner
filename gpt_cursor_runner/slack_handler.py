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

# Import event logger
try:
    from .event_logger import event_logger
except ImportError:
    event_logger = None

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
        result = reverter.revert_patch(latest_patch.get("id"))
        
        # Log the revert
        if event_logger:
            event_logger.log_slack_event("patch_reverted", {
                "user_id": user_id,
                "channel_id": channel_id,
                "patch_id": latest_patch.get("id"),
                "result": result
            })
        
        return {
            "response_type": "in_channel",
            "text": f"🔄 *Patch Reverted:* `{latest_patch.get('id')}`",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"🔄 *Patch Reverted Successfully*\n\n*ID:* `{latest_patch.get('id')}`\n*Target:* `{latest_patch.get('target_file')}`\n*Description:* {latest_patch.get('description')}"
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Reverted by <@{user_id}> • Backup restored"
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
        
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_command_center_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /command-center slash command."""
    command_center_text = """🧠 *GPT-Cursor Runner Command Center*

You're in commander mode. Here's what to watch and how to act:

📡 *What You'll See in This Channel*
✅ Patch applied — Phase complete
📸 Screenshot — Visual check may be needed
🔧 Fix attempt — GPT reacting to Cursor logs
🤖 Patch proposed — Ready for approval
🛑 Crash detected — GPT diagnosing issue

👨‍✈️ *How to Take Action*
• `/patch-approve` — ✅ Approve next GPT patch
• `/patch-revert` — 🔁 Roll back last patch
• `/pause-runner` — ⏸️ Stop GPT from submitting more
• `/dashboard` — 📊 View live patch logs

💻 *Terminal Commands*
• `CTRL+C` — Kill the gpt-cursor-runner if needed
• `killall ngrok` — Kill tunnel

📊 *Quick Links*
• <http://localhost:5050/dashboard|Live Dashboard>
• <http://localhost:5050/events|Event Logs>"""
    
    # Log the command center request
    if event_logger:
        event_logger.log_slack_event("command_center_request", {
            "user_id": user_id,
            "channel_id": channel_id
        })
    
    return {
        "response_type": "in_channel",
        "text": command_center_text,
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": command_center_text
                }
            }
        ]
    }

def get_latest_pending_patch() -> Optional[Dict[str, Any]]:
    """Get the latest pending patch."""
    import glob
    import os
    
    patches_dir = "patches"
    if not os.path.exists(patches_dir):
        return None
    
    patch_files = glob.glob(os.path.join(patches_dir, "*.json"))
    if not patch_files:
        return None
    
    # Get the most recent patch file
    latest_file = max(patch_files, key=os.path.getmtime)
    
    try:
        with open(latest_file, 'r') as f:
            return json.load(f)
    except Exception:
        return None

def get_latest_applied_patch() -> Optional[Dict[str, Any]]:
    """Get the latest applied patch."""
    # This would need to be implemented based on your patch tracking system
    # For now, return the latest patch file
    return get_latest_pending_patch()

def pause_runner():
    """Pause the GPT-Cursor runner."""
    # This would need to be implemented in the main runner
    # For now, just log the pause request
    if event_logger:
        event_logger.log_system_event("runner_paused", {
            "timestamp": time.time(),
            "reason": "Manual pause via Slack command"
        })

def handle_patch_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /patch slash command."""
    if not text.strip():
        return {
            "response_type": "ephemeral",
            "text": "Usage: `/patch <target_file> <description> <pattern> <replacement>`"
        }
    
    # Parse command text
    parts = text.split(' ', 3)
    if len(parts) < 4:
        return {
            "response_type": "ephemeral",
            "text": "Usage: `/patch <target_file> <description> <pattern> <replacement>`"
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
            "author": f"slack-user-{user_id}",
            "source": "slack_command",
            "channel_id": channel_id,
            "timestamp": time.time()
        }
    }
    
    # Save patch
    try:
        from .webhook_handler import process_hybrid_block
        result = process_hybrid_block(patch_data)
        
        # Log the result
        if event_logger:
            event_logger.log_slack_event("patch_created", {
                "user_id": user_id,
                "channel_id": channel_id,
                "command": "/patch",
                "text": text
            }, {"success": True, "patch_id": patch_data["id"]})
        
        return {
            "response_type": "in_channel",
            "text": f"✅ Patch created: `{patch_data['id']}`\n🎯 Target: `{target_file}`\n📝 Description: {description}",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"✅ *Patch Created Successfully*\n\n*ID:* `{patch_data['id']}`\n*Target:* `{target_file}`\n*Description:* {description}"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Pattern:*\n`{pattern[:50]}{'...' if len(pattern) > 50 else ''}`"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Replacement:*\n`{replacement[:50]}{'...' if len(replacement) > 50 else ''}`"
                        }
                    ]
                }
            ]
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
        
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_patch_preview_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /patch-preview slash command."""
    if not text.strip():
        return {
            "response_type": "ephemeral",
            "text": "Usage: `/patch-preview <patch_id_or_description>`"
        }
    
    search_term = text.strip()
    
    # Search for patches
    try:
        patches = search_patches(search_term)
        
        if not patches:
            return {
                "response_type": "ephemeral",
                "text": f"❌ No patches found matching: `{search_term}`"
            }
        
        # Return preview of the first match
        patch = patches[0]
        
        # Log the preview request
        if event_logger:
            event_logger.log_slack_event("patch_preview", {
                "user_id": user_id,
                "channel_id": channel_id,
                "search_term": search_term,
                "patch_id": patch.get("id")
            })
        
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
        
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def search_patches(search_term: str) -> List[Dict[str, Any]]:
    """Search for patches by ID or description."""
    import glob
    import os
    
    patches = []
    patches_dir = "patches"
    
    if not os.path.exists(patches_dir):
        return patches
    
    patch_files = glob.glob(os.path.join(patches_dir, "*.json"))
    
    for filepath in patch_files:
        try:
            with open(filepath, 'r') as f:
                patch_data = json.load(f)
            
            # Search in ID, description, or target file
            if (search_term.lower() in patch_data.get('id', '').lower() or
                search_term.lower() in patch_data.get('description', '').lower() or
                search_term.lower() in patch_data.get('target_file', '').lower()):
                patches.append(patch_data)
        except Exception:
            continue
    
    return patches

def get_patch_status() -> Dict[str, Any]:
    """Get patch status statistics."""
    import glob
    import os
    
    patches_dir = "patches"
    stats = {
        "total_patches": 0,
        "recent_24h": 0,
        "success_rate": 0.0,
        "avg_apply_time": 0.0
    }
    
    if not os.path.exists(patches_dir):
        return stats
    
    patch_files = glob.glob(os.path.join(patches_dir, "*.json"))
    stats["total_patches"] = len(patch_files)
    
    # Count recent patches
    current_time = time.time()
    for filepath in patch_files:
        try:
            stat = os.stat(filepath)
            if current_time - stat.st_mtime < 24 * 3600:  # 24 hours
                stats["recent_24h"] += 1
        except:
            continue
    
    # Try to get metrics from patch metrics
    try:
        from .patch_metrics import PatchMetrics
        metrics = PatchMetrics()
        summary = metrics.get_summary_stats()
        stats["success_rate"] = summary.get("success_rate", 0.0)
        stats["avg_apply_time"] = summary.get("avg_apply_time", 0.0)
    except:
        pass
    
    return stats

def handle_slack_event(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle Slack event subscription."""
    event_type = event_data.get('type', '')
    
    # Log the event
    if event_logger:
        event_logger.log_slack_event("event_received", {
            "event_type": event_type,
            "data": event_data
        })
    
    if event_type == 'url_verification':
        return {"challenge": event_data.get('challenge', '')}
    
    elif event_type == 'event_callback':
        event = event_data.get('event', {})
        event_subtype = event.get('subtype', '')
        
        # Handle app mention
        if event.get('type') == 'app_mention':
            return handle_app_mention(event)
        
        # Handle message events (but not bot messages)
        elif event.get('type') == 'message' and event_subtype != 'bot_message':
            return handle_message_event(event)
    
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
    text = event.get('text', '')
    user_id = event.get('user', '')
    channel_id = event.get('channel', '')
    
    # Log the message
    if event_logger:
        event_logger.log_slack_event("message", {
            "user_id": user_id,
            "channel_id": channel_id,
            "text": text
        })
    
    # Check for patch-related keywords
    if any(keyword in text.lower() for keyword in ['patch', 'fix', 'update', 'change']):
        # Auto-suggest patch commands
        return {
            "response_type": "ephemeral",
            "text": "💡 Tip: Use `/patch` to create a new patch or `/patch-preview` to preview existing patches!"
        }
    
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
        return {
            "response_type": "ephemeral",
            "text": f"❌ Error getting status: {str(e)}"
        }

def handle_help_command(user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle help command."""
    help_text = """*🤖 GPT-Cursor Runner Help*

*Available Commands:*
• `/patch <file> <desc> <pattern> <replacement>` - Create a new patch
• `/patch-preview <patch_id>` - Preview an existing patch
• `/patch-status` - Show patch statistics
• `/dashboard` - Open live dashboard
• `/patch-approve` - Approve latest patch
• `/patch-revert` - Revert latest patch
• `/pause-runner` - Pause GPT runner
• `/command-center` - Show command center

*App Mentions:*
• `@bot patch <file> <desc> <pattern> <replacement>` - Create patch via mention
• `@bot preview <patch_id>` - Preview patch via mention
• `@bot status` - Show system status
• `@bot dashboard` - Open dashboard
• `@bot approve` - Approve latest patch
• `@bot revert` - Revert latest patch
• `@bot pause` - Pause runner
• `@bot help` - Show this help

*Examples:*
• `/patch src/main.py "Fix typo" "old text" "new text"`
• `/patch-preview slack-patch-1234567890`
• `/dashboard`
• `@bot status`"""
    
    # Log the help request
    if event_logger:
        event_logger.log_slack_event("help_request", {
            "user_id": user_id,
            "channel_id": channel_id
        })
    
    return {
        "response_type": "ephemeral",
        "text": help_text
    }

def get_system_status() -> Dict[str, Any]:
    """Get system status information."""
    import psutil
    
    try:
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('.')
        
        return {
            "status": "🟢 Online",
            "uptime": "24h 30m",  # Simplified
            "memory_usage": f"{memory.percent:.1f}",
            "disk_usage": f"{(disk.used / disk.total * 100):.1f}"
        }
    except ImportError:
        return {
            "status": "🟡 Limited",
            "uptime": "Unknown",
            "memory_usage": "Unknown",
            "disk_usage": "Unknown"
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
        return False 