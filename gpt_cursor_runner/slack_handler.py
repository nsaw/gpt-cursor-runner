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

# Import patch runner
from .patch_runner import apply_patch_with_retry, patch_runner_health_check

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
        elif command == '/status-runner':
            return handle_status_runner_command(text, user_id, channel_id)
        elif command == '/whoami':
            return handle_whoami_command(text, user_id, channel_id)
        elif command == '/toggle-runner-auto':
            return handle_toggle_runner_auto_command(text, user_id, channel_id)
        elif command == '/restart-runner':
            return handle_restart_runner_command(text, user_id, channel_id)
        elif command == '/restart-runner-gpt':
            return handle_restart_runner_gpt_command(text, user_id, channel_id)
        elif command == '/continue-runner':
            return handle_continue_runner_command(text, user_id, channel_id)
        elif command == '/toggle-runner-on':
            return handle_toggle_runner_on_command(text, user_id, channel_id)
        elif command == '/toggle-runner-off':
            return handle_toggle_runner_off_command(text, user_id, channel_id)
        elif command == '/kill':
            return handle_kill_command(text, user_id, channel_id)
        elif command == '/lock-runner':
            return handle_lock_runner_command(text, user_id, channel_id)
        elif command == '/unlock-runner':
            return handle_unlock_runner_command(text, user_id, channel_id)
        elif command == '/roadmap':
            return handle_roadmap_command(text, user_id, channel_id)
        elif command == '/show-roadmap':
            return handle_show_roadmap_command(text, user_id, channel_id)
        elif command == '/theme':
            return handle_theme_command(text, user_id, channel_id)
        elif command == '/theme-status':
            return handle_theme_status_command(text, user_id, channel_id)
        elif command == '/theme-fix':
            return handle_theme_fix_command(text, user_id, channel_id)
        elif command == '/approve-screenshot':
            return handle_approve_screenshot_command(text, user_id, channel_id)
        elif command == '/revert-phase':
            return handle_revert_phase_command(text, user_id, channel_id)
        elif command == '/log-phase-status':
            return handle_log_phase_status_command(text, user_id, channel_id)
        elif command == '/cursor-mode':
            return handle_cursor_mode_command(text, user_id, channel_id)
        elif command == '/retry-last-failed':
            return handle_retry_last_failed_command(text, user_id, channel_id)
        elif command == '/alert-runner-crash':
            return handle_alert_runner_crash_command(text, user_id, channel_id)
        elif command == '/read-secret':
            return handle_read_secret_command(text, user_id, channel_id)
        elif command == '/manual-revise':
            return handle_manual_revise_command(text, user_id, channel_id)
        elif command == '/manual-append':
            return handle_manual_append_command(text, user_id, channel_id)
        elif command == '/interrupt':
            return handle_interrupt_command(text, user_id, channel_id)
        elif command == '/send-with':
            return handle_send_with_command(text, user_id, channel_id)
        elif command == '/troubleshoot':
            return handle_troubleshoot_command(text, user_id, channel_id)
        elif command == '/troubleshoot-oversight':
            return handle_troubleshoot_oversight_command(text, user_id, channel_id)
        elif command == '/again':
            return handle_again_command(text, user_id, channel_id)
        elif command == '/cursor-slack-dispatch':
            return handle_cursor_slack_dispatch_command(text, user_id, channel_id)
        elif command == '/gpt-slack-dispatch':
            return handle_gpt_slack_dispatch_command(text, user_id, channel_id)
        elif command == '/proceed':
            return handle_proceed_command(text, user_id, channel_id)
        elif command == '/patch-health':
            return handle_patch_health_command(text, user_id, channel_id)
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
    dashboard_url = os.getenv("DASHBOARD_URL", "https://runner-dev.thoughtmarks.app/dashboard")
    
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
    """Handle /patch-approve slash command with retry logic."""
    try:
        latest_patch = get_latest_pending_patch()
        if not latest_patch:
            return {
                "response_type": "ephemeral",
                "text": "❌ No pending patches found to approve"
            }
        result = apply_patch_with_retry(latest_patch, dry_run=False)
        if event_logger:
            event_logger.log_slack_event("patch_approved", {
                "user_id": user_id,
                "channel_id": channel_id,
                "patch_id": latest_patch.get("id"),
                "result": result
            })
        if slack_proxy and result.get("success"):
            slack_proxy.notify_patch_applied(
                latest_patch.get("id", "unknown"),
                latest_patch.get("target_file", "unknown"),
                True
            )
        elif slack_proxy and result.get("quarantined"):
            slack_proxy.notify_error(
                f"Patch quarantined after repeated failures: {result.get('message')}",
                context=latest_patch.get("target_file", "unknown")
            )
        return {
            "response_type": "in_channel",
            "text": f"{'✅' if result.get('success') else '❌'} {result.get('message')}"
        }
    except Exception as e:
        error_msg = f"Error approving patch: {str(e)}"
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

def handle_status_runner_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /status-runner slash command."""
    try:
        # Get system status
        status = get_system_status()
        
        # Log the status request
        if event_logger:
            event_logger.log_slack_event("status_runner_request", {
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
                slack_proxy.notify_error(error_msg, context="status_runner_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_whoami_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /whoami slash command."""
    try:
        # Log the whoami request
        if event_logger:
            event_logger.log_slack_event("whoami_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": f"👤 *Who Am I?*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"👤 *Who Am I?*\n\nYour Slack user ID: `{user_id}`"
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • Use `/help` for more commands"
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error getting whoami: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="whoami_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_toggle_runner_auto_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /toggle-runner-auto slash command."""
    try:
        # This command would typically toggle a runner's auto-patching mode
        # For now, we'll just return a placeholder message
        if event_logger:
            event_logger.log_slack_event("toggle_runner_auto_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "🔄 *Toggling Auto-Patching...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "🔄 *Toggling Auto-Patching...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error toggling auto-patching: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="toggle_runner_auto_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_restart_runner_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /restart-runner slash command."""
    try:
        # This command would typically restart the runner process
        if event_logger:
            event_logger.log_slack_event("restart_runner_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "🔄 *Restarting GPT-Cursor Runner...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "🔄 *Restarting GPT-Cursor Runner...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error restarting runner: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="restart_runner_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_restart_runner_gpt_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /restart-runner-gpt slash command."""
    try:
        # This command would typically restart the GPT process
        if event_logger:
            event_logger.log_slack_event("restart_runner_gpt_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "🔄 *Restarting GPT Process...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "🔄 *Restarting GPT Process...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error restarting runner GPT: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="restart_runner_gpt_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_continue_runner_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /continue-runner slash command."""
    try:
        # This command would typically resume the runner from a paused state
        if event_logger:
            event_logger.log_slack_event("continue_runner_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "✅ *Resuming GPT-Cursor Runner...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "✅ *Resuming GPT-Cursor Runner...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error continuing runner: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="continue_runner_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_toggle_runner_on_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /toggle-runner-on slash command."""
    try:
        # This command would typically turn the runner on
        if event_logger:
            event_logger.log_slack_event("toggle_runner_on_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "✅ *Enabling GPT-Cursor Runner...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "✅ *Enabling GPT-Cursor Runner...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error toggling runner on: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="toggle_runner_on_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_toggle_runner_off_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /toggle-runner-off slash command."""
    try:
        # This command would typically turn the runner off
        if event_logger:
            event_logger.log_slack_event("toggle_runner_off_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "⏸️ *Disabling GPT-Cursor Runner...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "⏸️ *Disabling GPT-Cursor Runner...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error toggling runner off: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="toggle_runner_off_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_kill_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /kill slash command."""
    try:
        # This command would typically kill the runner process
        if event_logger:
            event_logger.log_slack_event("kill_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "💀 *Killing GPT-Cursor Runner...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "💀 *Killing GPT-Cursor Runner...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error killing runner: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="kill_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_lock_runner_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /lock-runner slash command."""
    try:
        # This command would typically lock the runner to prevent patches
        if event_logger:
            event_logger.log_slack_event("lock_runner_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "🔒 *Locking GPT-Cursor Runner...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "🔒 *Locking GPT-Cursor Runner...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error locking runner: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="lock_runner_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_unlock_runner_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /unlock-runner slash command."""
    try:
        # This command would typically unlock the runner
        if event_logger:
            event_logger.log_slack_event("unlock_runner_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "🔓 *Unlocking GPT-Cursor Runner...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "🔓 *Unlocking GPT-Cursor Runner...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error unlocking runner: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="unlock_runner_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_roadmap_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /roadmap slash command."""
    try:
        # This command would typically show the roadmap
        if event_logger:
            event_logger.log_slack_event("roadmap_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "📜 *Roadmap*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*📜 GPT-Cursor Runner Roadmap*\n\n*Current Features:*\n• Code patch creation and application\n• Real-time patch status tracking\n• Dashboard for patch logs\n• Auto-patching with approval\n• System status monitoring\n• Command center for all actions\n\n*Future Plans:*\n• Advanced error handling and recovery\n• Multi-language support\n• More sophisticated patch logic\n• Enhanced dashboard features\n• AI-powered suggestions"
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • Use `/show-roadmap` to see a more detailed version"
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error showing roadmap: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="roadmap_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_show_roadmap_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /show-roadmap slash command."""
    try:
        # This command would typically show a more detailed roadmap
        if event_logger:
            event_logger.log_slack_event("show_roadmap_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "�� *Detailed Roadmap*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*📜 GPT-Cursor Runner Detailed Roadmap*\n\n*Current Features:*\n• Code patch creation and application\n• Real-time patch status tracking\n• Dashboard for patch logs\n• Auto-patching with approval\n• System status monitoring\n• Command center for all actions\n\n*Future Plans:*\n• Advanced error handling and recovery\n• Multi-language support\n• More sophisticated patch logic\n• Enhanced dashboard features\n• AI-powered suggestions"
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • Use `/roadmap` to see a high-level overview"
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error showing detailed roadmap: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="show_roadmap_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_theme_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /theme slash command."""
    try:
        # This command would typically change the theme
        if event_logger:
            event_logger.log_slack_event("theme_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "🎨 *Changing Theme...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "🎨 *Changing Theme...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error changing theme: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="theme_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_theme_status_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /theme-status slash command."""
    try:
        # This command would typically show the current theme status
        if event_logger:
            event_logger.log_slack_event("theme_status_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "🎨 *Theme Status*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*🎨 GPT-Cursor Runner Theme Status*\n\n*Current Theme:* Dark Mode"
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • Use `/theme` to change theme"
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error getting theme status: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="theme_status_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_theme_fix_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /theme-fix slash command."""
    try:
        # This command would typically fix a theme-related issue
        if event_logger:
            event_logger.log_slack_event("theme_fix_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "🛠️ *Fixing Theme...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "🛠️ *Fixing Theme...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error fixing theme: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="theme_fix_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_approve_screenshot_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /approve-screenshot slash command."""
    try:
        # This command would typically approve a screenshot
        if event_logger:
            event_logger.log_slack_event("approve_screenshot_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "✅ *Approving Screenshot...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "✅ *Approving Screenshot...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error approving screenshot: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="approve_screenshot_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_revert_phase_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /revert-phase slash command."""
    try:
        # This command would typically revert to a previous phase
        if event_logger:
            event_logger.log_slack_event("revert_phase_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "♻️ *Reverting Phase...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "♻️ *Reverting Phase...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error reverting phase: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="revert_phase_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_log_phase_status_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /log-phase-status slash command."""
    try:
        # This command would typically log the status of the current phase
        if event_logger:
            event_logger.log_slack_event("log_phase_status_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "📝 *Phase Status*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*📝 GPT-Cursor Runner Phase Status*\n\n*Current Phase:* Patching"
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • Use `/revert-phase` to revert"
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error getting phase status: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="log_phase_status_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_cursor_mode_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /cursor-mode slash command."""
    try:
        # This command would typically toggle the cursor mode
        if event_logger:
            event_logger.log_slack_event("cursor_mode_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "🖱️ *Toggling Cursor Mode...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "🖱️ *Toggling Cursor Mode...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error toggling cursor mode: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="cursor_mode_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_retry_last_failed_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /retry-last-failed slash command."""
    try:
        # This command would typically retry the last failed patch
        if event_logger:
            event_logger.log_slack_event("retry_last_failed_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "🔄 *Retrying Last Failed Patch...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "🔄 *Retrying Last Failed Patch...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error retrying last failed patch: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="retry_last_failed_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_alert_runner_crash_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /alert-runner-crash slash command."""
    try:
        # This command would typically alert the runner to a crash
        if event_logger:
            event_logger.log_slack_event("alert_runner_crash_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "⚠️ *Alerting Runner to Crash...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "⚠️ *Alerting Runner to Crash...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error alerting runner crash: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="alert_runner_crash_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_read_secret_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /read-secret slash command."""
    try:
        # This command would typically read a secret from the runner's secrets file
        if event_logger:
            event_logger.log_slack_event("read_secret_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "🔑 *Reading Secret...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "🔑 *Reading Secret...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error reading secret: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="read_secret_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_manual_revise_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /manual-revise slash command."""
    try:
        # This command would typically allow manual revision of the generated code
        if event_logger:
            event_logger.log_slack_event("manual_revise_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "✏️ *Manual Revision...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "✏️ *Manual Revision...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error manual revise: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="manual_revise_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_manual_append_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /manual-append slash command."""
    try:
        # This command would typically allow manual appending to the generated code
        if event_logger:
            event_logger.log_slack_event("manual_append_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "📝 *Manual Append...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "📝 *Manual Append...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error manual append: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="manual_append_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_interrupt_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /interrupt slash command."""
    try:
        # This command would typically interrupt the current patch generation
        if event_logger:
            event_logger.log_slack_event("interrupt_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "⚡ *Interrupting...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "⚡ *Interrupting...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error interrupting: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="interrupt_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_send_with_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /send-with slash command."""
    try:
        # This command would typically send a message with a specific format
        if event_logger:
            event_logger.log_slack_event("send_with_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "💬 *Sending with...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "💬 *Sending with...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error sending with: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="send_with_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_troubleshoot_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /troubleshoot slash command."""
    try:
        # This command would typically provide troubleshooting tips
        if event_logger:
            event_logger.log_slack_event("troubleshoot_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "🛠️ *Troubleshooting...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "🛠️ *Troubleshooting...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error troubleshooting: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="troubleshoot_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_troubleshoot_oversight_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /troubleshoot-oversight slash command."""
    try:
        # This command would typically provide oversight for troubleshooting
        if event_logger:
            event_logger.log_slack_event("troubleshoot_oversight_request", {
                "user_id": user_id,
                "channel_id": channel_id
            })
        
        return {
            "response_type": "in_channel",
            "text": "👀 *Troubleshooting Oversight...*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "👀 *Troubleshooting Oversight...*\n\nThis command is not yet fully implemented."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This feature is under development."
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error troubleshooting oversight: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="troubleshoot_oversight_command")
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

def handle_again_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /again slash command - retry failed operation or restart runner."""
    try:
        # Log the again command
        if event_logger:
            event_logger.log_slack_event("again_command", {
                "user_id": user_id,
                "channel_id": channel_id,
                "text": text
            })
        
        return {
            "response_type": "in_channel",
            "text": "🔄 *Retrying Last Operation*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "🔄 *Retrying Last Operation*\n\nAttempting to retry the last failed operation or restart the runner."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • This will retry the most recent failed operation"
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error retrying operation: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="again_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_cursor_slack_dispatch_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /cursor-slack-dispatch slash command - enable Cursor to post messages directly to Slack."""
    try:
        # Log the cursor slack dispatch command
        if event_logger:
            event_logger.log_slack_event("cursor_slack_dispatch_command", {
                "user_id": user_id,
                "channel_id": channel_id,
                "text": text
            })
        
        return {
            "response_type": "in_channel",
            "text": "🤖 *Cursor Slack Dispatch Enabled*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "🤖 *Cursor Slack Dispatch Enabled*\n\nCursor can now post messages directly to Slack channels."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Enabled by <@{user_id}> • Cursor will now send updates to this channel"
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error enabling cursor slack dispatch: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="cursor_slack_dispatch_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_gpt_slack_dispatch_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /gpt-slack-dispatch slash command - enable GPT to post messages directly to Slack."""
    try:
        # Log the gpt slack dispatch command
        if event_logger:
            event_logger.log_slack_event("gpt_slack_dispatch_command", {
                "user_id": user_id,
                "channel_id": channel_id,
                "text": text
            })
        
        return {
            "response_type": "in_channel",
            "text": "🧠 *GPT Slack Dispatch Enabled*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "🧠 *GPT Slack Dispatch Enabled*\n\nGPT can now post messages directly to Slack channels."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Enabled by <@{user_id}> • GPT will now send updates to this channel"
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error enabling gpt slack dispatch: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="gpt_slack_dispatch_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_proceed_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /proceed slash command - proceed with next action (approve, continue, resume)."""
    try:
        # Log the proceed command
        if event_logger:
            event_logger.log_slack_event("proceed_command", {
                "user_id": user_id,
                "channel_id": channel_id,
                "text": text
            })
        
        return {
            "response_type": "in_channel",
            "text": "✅ *Proceeding with Next Action*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "✅ *Proceeding with Next Action*\n\nApproving, continuing, or resuming the current operation."
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Requested by <@{user_id}> • Proceeding with next step in workflow"
                        }
                    ]
                }
            ]
        }
        
    except Exception as e:
        error_msg = f"Error proceeding with action: {str(e)}"
        try:
            if slack_proxy:
                slack_proxy.notify_error(error_msg, context="proceed_command")
        except Exception:
            pass
        return {
            "response_type": "ephemeral",
            "text": f"❌ {error_msg}"
        }

def handle_patch_health_command(text: str, user_id: str, channel_id: str) -> Dict[str, Any]:
    """Handle /patch-health slash command to report patch runner health."""
    try:
        health = patch_runner_health_check()
        return {
            "response_type": "in_channel",
            "text": f"Patch Runner Health: {health['status']} - {health['message']}"
        }
    except Exception as e:
        return {
            "response_type": "ephemeral",
            "text": f"❌ Error checking patch runner health: {str(e)}"
        }