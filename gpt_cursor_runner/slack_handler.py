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
# Company Confidential
"""
Slack Handler for GPT-Cursor Runner.
Handles Slack slash commands, event verification, and dispatch.
"""

import hashlib
import hmac
import json
import os
import shutil
import subprocess
import glob
from datetime import datetime
from typing import Dict, List, Optional, Any

# Import dependencies
try:
    from .event_logger import event_logger
except ImportError:
    event_logger: Optional[Any] = None

try:
    from .slack_proxy import create_slack_proxy

    slack_proxy_instance = create_slack_proxy()
except ImportError:
    slack_proxy_instance: Optional[Any] = None

# System paths
CURSOR_CACHE_ROOT = "/Users/sawyer/gitSync/.cursor-cache"
MAIN_PATCHES = f"{CURSOR_CACHE_ROOT}/MAIN/patches"
CYOPS_PATCHES = f"{CURSOR_CACHE_ROOT}/CYOPS/patches"
MAIN_SUMMARIES = f"{CURSOR_CACHE_ROOT}/MAIN/summaries"
CYOPS_SUMMARIES = f"{CURSOR_CACHE_ROOT}/CYOPS/summaries"


def verify_slack_signature(timestamp: str, signature: str, request_body: bytes) -> bool:
    """Verify Slack request signature."""
    slack_signing_secret = os.getenv("SLACK_SIGNING_SECRET")
    if not slack_signing_secret:
        return False

    sig_basestring = f"v0:{timestamp}:{request_body.decode('utf-8')}"
    hmac_obj = hmac.new(
        slack_signing_secret.encode("utf-8"),
        sig_basestring.encode("utf-8"),
        hashlib.sha256,
    )
    expected_signature = f"v0={hmac_obj.hexdigest()}"

    return hmac.compare_digest(expected_signature, signature)


# ============================================================================
# CORE SYSTEM FUNCTIONS FOR REAL OPERATIONS
# ============================================================================


def execute_git_operation(
    operation: str, args: Optional[List[str]] = None, cwd: Optional[str] = None
) -> Dict[str, Any]:
    """Execute real git operations with error handling."""
    try:
        if cwd is None:
            cwd = "/Users/sawyer/gitSync/gpt-cursor-runner"

        cmd = ["git", operation] + (args or [])
        result = subprocess.run(
            cmd, capture_output=True, text=True, cwd=cwd, timeout=30
        )

        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Git operation timed out"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def manage_process(action: str, process_name: str) -> Dict[str, Any]:
    """Manage processes using pm2 with real operations."""
    try:
        if action == "start":
            cmd = ["pm2", "start", process_name]
        elif action == "stop":
            cmd = ["pm2", "stop", process_name]
        elif action == "restart":
            cmd = ["pm2", "restart", process_name]
        elif action == "delete":
            cmd = ["pm2", "delete", process_name]
        else:
            return {"success": False, "error": f"Unknown action: {action}"}

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Process operation timed out"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def validate_patch_file(patch_file: str) -> Dict[str, Any]:
    """Validate patch file structure and content."""
    try:
        if not os.path.exists(patch_file):
            return {"valid": False, "error": "Patch file not found"}

        with open(patch_file, "r") as f:
            patch_data = json.load(f)

        required_fields = ["blockId", "mutations", "version"]
        for field in required_fields:
            if field not in patch_data:
                return {"valid": False, "error": f"Missing required field: {field}"}

        return {"valid": True, "data": patch_data}
    except json.JSONDecodeError as e:
        return {"valid": False, "error": f"Invalid JSON: {e}"}
    except Exception as e:
        return {"valid": False, "error": str(e)}


def create_patch_backup(patch_file: str) -> Dict[str, Any]:
    """Create backup of patch file before processing."""
    try:
        backup_file = f"{patch_file}.backup"
        shutil.copy2(patch_file, backup_file)
        return {"success": True, "backup_file": backup_file}
    except Exception as e:
        return {"success": False, "error": str(e)}


def run_system_diagnostics() -> Dict[str, Any]:
    """Run comprehensive system diagnostics."""
    diagnostics: Dict[str, Any] = {
        "timestamp": datetime.now().isoformat(),
        "system_info": {},
        "process_status": {},
        "file_system": {},
        "network": {},
    }

    # System information
    try:
        diagnostics["system_info"]["platform"] = os.uname().sysname
        diagnostics["system_info"]["hostname"] = os.uname().nodename
    except Exception as e:
        diagnostics["system_info"]["error"] = str(e)

    # Process status
    try:
        result = subprocess.run(
            ["pm2", "list"], capture_output=True, text=True, timeout=10
        )
        diagnostics["process_status"]["pm2_list"] = result.stdout
    except Exception as e:
        diagnostics["process_status"]["error"] = str(e)

    # File system checks
    for path_name, path in [
        ("main_patches", MAIN_PATCHES),
        ("cyops_patches", CYOPS_PATCHES),
        ("main_summaries", MAIN_SUMMARIES),
        ("cyops_summaries", CYOPS_SUMMARIES),
    ]:
        diagnostics["file_system"][path_name] = {
            "exists": os.path.exists(path),
            "is_dir": os.path.isdir(path) if os.path.exists(path) else False,
        }

    return diagnostics


def send_agent_signal(
    agent: str, signal: str, data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Send signal to specific agent."""
    try:
        # Implementation would depend on agent communication mechanism
        signal_data = {
            "agent": agent,
            "signal": signal,
            "data": data or {},
            "timestamp": datetime.now().isoformat(),
        }

        # For now, just return success
        return {"success": True, "signal_sent": signal_data}
    except Exception as e:
        return {"success": False, "error": str(e)}


def validate_system_health() -> Dict[str, Any]:
    """Validate overall system health."""
    health_status = {
        "timestamp": datetime.now().isoformat(),
        "overall_status": "unknown",
        "components": {},
    }

    # Check critical directories
    critical_paths = [MAIN_PATCHES, CYOPS_PATCHES, MAIN_SUMMARIES, CYOPS_SUMMARIES]
    path_status = {}

    for path in critical_paths:
        path_status[path] = {
            "exists": os.path.exists(path),
            "readable": os.access(path, os.R_OK) if os.path.exists(path) else False,
            "writable": os.access(path, os.W_OK) if os.path.exists(path) else False,
        }

    health_status["components"]["paths"] = path_status

    # Determine overall status
    all_paths_exist = all(status["exists"] for status in path_status.values())
    if all_paths_exist:
        health_status["overall_status"] = "healthy"
    else:
        health_status["overall_status"] = "degraded"

    return health_status


def get_pending_patches(target: str = "CYOPS") -> List[Dict[str, Any]]:
    """Get list of pending patches for specified target."""
    try:
        if target == "CYOPS":
            patches_dir = CYOPS_PATCHES
        elif target == "MAIN":
            patches_dir = MAIN_PATCHES
        else:
            return []

        if not os.path.exists(patches_dir):
            return []

        patch_files = glob.glob(os.path.join(patches_dir, "*.json"))
        patches = []

        for patch_file in patch_files:
            try:
                with open(patch_file, "r") as f:
                    patch_data = json.load(f)

                patches.append(
                    {
                        "file": patch_file,
                        "blockId": patch_data.get("blockId", "unknown"),
                        "version": patch_data.get("version", "unknown"),
                        "description": patch_data.get("description", ""),
                        "timestamp": os.path.getmtime(patch_file),
                    }
                )
            except Exception as e:
                patches.append(
                    {
                        "file": patch_file,
                        "error": str(e),
                    }
                )

        return patches
    except Exception as e:
        return [{"error": str(e)}]


def approve_patch(
    patch_id: str, target: str = "CYOPS", preview: bool = False
) -> Dict[str, Any]:
    """Approve a specific patch for processing."""
    try:
        if target == "CYOPS":
            patches_dir = CYOPS_PATCHES
        elif target == "MAIN":
            patches_dir = MAIN_PATCHES
        else:
            return {"success": False, "error": f"Invalid target: {target}"}

        # Find patch file
        patch_files = glob.glob(os.path.join(patches_dir, "*.json"))
        target_patch = None

        for patch_file in patch_files:
            try:
                with open(patch_file, "r") as f:
                    patch_data = json.load(f)
                if patch_data.get("blockId") == patch_id:
                    target_patch = patch_file
                    break
            except Exception:
                continue

        if not target_patch:
            return {"success": False, "error": f"Patch {patch_id} not found"}

        if preview:
            # Return patch content for preview
            with open(target_patch, "r") as f:
                patch_data = json.load(f)
            return {
                "success": True,
                "preview": True,
                "patch_data": patch_data,
            }

        # Move patch to processing
        processing_dir = os.path.join(patches_dir, ".processing")
        os.makedirs(processing_dir, exist_ok=True)

        processing_file = os.path.join(processing_dir, os.path.basename(target_patch))
        shutil.move(target_patch, processing_file)

        return {
            "success": True,
            "message": f"Patch {patch_id} approved and moved to processing",
            "processing_file": processing_file,
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


def revert_patch(patch_id: str, target: str = "CYOPS") -> Dict[str, Any]:
    """Revert a specific patch."""
    try:
        if target == "CYOPS":
            patches_dir = CYOPS_PATCHES
        elif target == "MAIN":
            patches_dir = MAIN_PATCHES
        else:
            return {"success": False, "error": f"Invalid target: {target}"}

        # Find patch file in various states
        search_dirs = [
            patches_dir,
            os.path.join(patches_dir, ".processing"),
            os.path.join(patches_dir, ".completed"),
            os.path.join(patches_dir, ".failed"),
        ]

        target_patch = None
        for search_dir in search_dirs:
            if os.path.exists(search_dir):
                patch_files = glob.glob(os.path.join(search_dir, "*.json"))
                for patch_file in patch_files:
                    try:
                        with open(patch_file, "r") as f:
                            patch_data = json.load(f)
                        if patch_data.get("blockId") == patch_id:
                            target_patch = patch_file
                            break
                    except Exception:
                        continue
                if target_patch:
                    break

        if not target_patch:
            return {"success": False, "error": f"Patch {patch_id} not found"}

        # Move to failed directory
        failed_dir = os.path.join(patches_dir, ".failed")
        os.makedirs(failed_dir, exist_ok=True)

        failed_file = os.path.join(failed_dir, os.path.basename(target_patch))
        shutil.move(target_patch, failed_file)

        return {
            "success": True,
            "message": f"Patch {patch_id} reverted and moved to failed",
            "failed_file": failed_file,
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


def get_current_mode() -> str:
    """Get current runner mode."""
    try:
        mode_file = "/Users/sawyer/gitSync/gpt-cursor-runner/current_mode.txt"
        if os.path.exists(mode_file):
            with open(mode_file, "r") as f:
                return f.read().strip()
        return "manual"
    except Exception:
        return "manual"


def set_runner_mode(mode: str) -> Dict[str, Any]:
    """Set runner mode."""
    try:
        valid_modes = ["auto", "manual", "pause"]
        if mode not in valid_modes:
            return {"success": False, "error": f"Invalid mode: {mode}"}

        mode_file = "/Users/sawyer/gitSync/gpt-cursor-runner/current_mode.txt"
        with open(mode_file, "w") as f:
            f.write(mode)

        return {"success": True, "mode": mode}
    except Exception as e:
        return {"success": False, "error": str(e)}


def toggle_runner_state(action: str) -> Dict[str, Any]:
    """Toggle runner state (start/stop/restart)."""
    try:
        if action == "start":
            result = manage_process("start", "gpt-cursor-runner")
        elif action == "stop":
            result = manage_process("stop", "gpt-cursor-runner")
        elif action == "restart":
            result = manage_process("restart", "gpt-cursor-runner")
        else:
            return {"success": False, "error": f"Invalid action: {action}"}

        return result
    except Exception as e:
        return {"success": False, "error": str(e)}


def run_troubleshoot(fix: bool = False, full: bool = False) -> Dict[str, Any]:
    """Run troubleshooting diagnostics."""
    try:
        diagnostics = run_system_diagnostics()

        if full:
            # Add additional diagnostics
            diagnostics["full_scan"] = {
                "timestamp": datetime.now().isoformat(),
                "additional_checks": {},
            }

        if fix:
            # Attempt automatic fixes
            fixes_applied = []

            # Create missing directories
            for path_name, path in [
                ("main_patches", MAIN_PATCHES),
                ("cyops_patches", CYOPS_PATCHES),
                ("main_summaries", MAIN_SUMMARIES),
                ("cyops_summaries", CYOPS_SUMMARIES),
            ]:
                if not os.path.exists(path):
                    os.makedirs(path, exist_ok=True)
                    fixes_applied.append(f"Created missing directory: {path}")

            diagnostics["fixes_applied"] = fixes_applied

        return {"success": True, "diagnostics": diagnostics}
    except Exception as e:
        return {"success": False, "error": str(e)}


def poke_agent(agent: str, action: str = "poke") -> Dict[str, Any]:
    """Poke a specific agent."""
    try:
        # Implementation would depend on agent communication mechanism
        poke_data = {
            "agent": agent,
            "action": action,
            "timestamp": datetime.now().isoformat(),
        }

        return {"success": True, "poke_sent": poke_data}
    except Exception as e:
        return {"success": False, "error": str(e)}


def manual_handoff(
    agent: str, content: str = "", content_type: str = "text"
) -> Dict[str, Any]:
    """Perform manual handoff to agent."""
    try:
        handoff_data = {
            "agent": agent,
            "content": content,
            "content_type": content_type,
            "timestamp": datetime.now().isoformat(),
        }

        # Implementation would depend on agent communication mechanism
        return {"success": True, "handoff_sent": handoff_data}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_daemon_status(target: str = "ALL") -> Dict[str, Any]:
    """Get status of daemons."""
    try:
        daemon_status = {
            "timestamp": datetime.now().isoformat(),
            "daemons": {},
        }

        if target in ["ALL", "MAIN"]:
            # Check MAIN daemon status
            daemon_status["daemons"]["main"] = {
                "status": "unknown",
                "pid": None,
            }

        if target in ["ALL", "CYOPS"]:
            # Check CYOPS daemon status
            daemon_status["daemons"]["cyops"] = {
                "status": "unknown",
                "pid": None,
            }

        return {"success": True, "status": daemon_status}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_runner_status() -> Dict[str, Any]:
    """Get overall runner status."""
    try:
        mode = get_current_mode()
        health = validate_system_health()
        main_patches = len(get_pending_patches("MAIN"))
        cyops_patches = len(get_pending_patches("CYOPS"))

        # Format as Slack-compatible text response
        status_text = "🤖 *Runner Status*\n"
        status_text += f"• Mode: {mode}\n"
        status_text += f"• Health: {health.get('overall_status', 'unknown')}\n"
        status_text += (
            f"• Pending Patches: MAIN={main_patches}, CYOPS={cyops_patches}\n"
        )
        status_text += f"• Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

        return {"text": status_text}
    except Exception as e:
        return {"text": f"❌ Error getting runner status: {str(e)}"}


def get_patch_queue_status() -> Dict[str, Any]:
    """Get patch queue status."""
    try:
        queue_status = {
            "timestamp": datetime.now().isoformat(),
            "queues": {},
        }

        for target in ["MAIN", "CYOPS"]:
            patches = get_pending_patches(target)
            queue_status["queues"][target.lower()] = {
                "count": len(patches),
                "patches": patches,
            }

        return {"success": True, "queue_status": queue_status}
    except Exception as e:
        return {"success": False, "error": str(e)}


def handle_slack_command(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle Slack slash command with comprehensive functionality."""
    command = request_data.get("command", "")
    text = request_data.get("text", "").strip()

    # Parse command arguments
    args = text.split() if text else []
    first_arg = args[0] if args else ""

    # Determine target system from arguments
    target = "CYOPS"  # Default
    for arg in args:
        if arg.upper() in ["MAIN", "CYOPS"]:
            target = arg.upper()
            break

    # Handle different commands
    if command == "/status-runner":
        return get_runner_status()
    elif command == "/dashboard":
        dashboard_url = os.getenv(
            "PUBLIC_RUNNER_URL", "https://gpt-cursor-runner.thoughtmarks.app"
        )
        return {"text": f"📊 Dashboard is available at: {dashboard_url}/api/status"}
    elif command == "/whoami":
        return {"text": f"Runner operating in {target} mode"}
    elif command == "/toggle-runner-auto":
        current_mode = get_current_mode()
        new_mode = "manual" if current_mode == "auto" else "auto"
        return set_runner_mode(new_mode)
    elif command == "/pause-runner":
        return set_runner_mode("pause")
    elif command == "/proceed":
        return set_runner_mode("auto")
    elif command == "/restart-runner":
        return toggle_runner_state("restart")
    elif command == "/patch-pass":
        if first_arg:
            return approve_patch(first_arg, target)
        else:
            return {"text": "Usage: /patch-pass <patch_id>"}
    elif command == "/patch-revert":
        if first_arg:
            return revert_patch(first_arg, target)
        else:
            return {"text": "Usage: /patch-revert <patch_id>"}
    elif command == "/patch-preview":
        if first_arg:
            return approve_patch(first_arg, target, preview=True)
        else:
            return {"text": "Usage: /patch-preview <patch_id>"}
    elif command == "/revert-phase":
        return {"text": "Phase revert functionality not implemented yet"}
    elif command == "/again":
        return {"text": "Again functionality not implemented yet"}
    elif command == "/manual-revise":
        return {"text": "Manual revise functionality not implemented yet"}
    elif command == "/manual-append":
        return {"text": "Manual append functionality not implemented yet"}
    elif command == "/interrupt":
        return {"text": "Interrupt functionality not implemented yet"}
    elif command == "/send-with":
        return {"text": "Send with functionality not implemented yet"}
    elif command == "/troubleshoot":
        return run_troubleshoot(fix=False, full=False)
    elif command == "/troubleshoot-oversight":
        return run_troubleshoot(fix=True, full=True)
    elif command == "/cursor-mode":
        return {"text": f"Current mode: {get_current_mode()}"}
    elif command == "/log-phase-status":
        return {"text": "Phase status logging not implemented yet"}
    elif command == "/roadmap":
        return {"text": "Roadmap functionality not implemented yet"}
    elif command == "/kill":
        return toggle_runner_state("stop")
    elif command == "/alert-runner-crash":
        return {"text": "Crash alert functionality not implemented yet"}
    elif command == "/read-secret":
        return {"text": "Secret reading functionality not implemented yet"}
    else:
        return {"text": f"Unknown command: {command}"}


def handle_slack_webhook(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle Slack webhook events."""
    try:
        event_type = request_data.get("type", "")

        if event_type == "url_verification":
            return {"challenge": request_data.get("challenge", "")}
        elif event_type == "event_callback":
            event = request_data.get("event", {})
            event_subtype = event.get("subtype", "")

            # Handle different event types
            if event_subtype == "bot_message":
                return {"text": "Bot message received"}
            else:
                return {"text": f"Event type {event_type} handled"}
        else:
            return {"text": f"Unknown event type: {event_type}"}
    except Exception as e:
        return {"error": str(e)}


def handle_slack_interaction(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle Slack interactive components."""
    try:
        payload = json.loads(request_data.get("payload", "{}"))
        type = payload.get("type", "")

        if type == "block_actions":
            return {"text": "Block actions handled"}
        elif type == "view_submission":
            return {"text": "View submission handled"}
        else:
            return {"text": f"Unknown interaction type: {type}"}
    except Exception as e:
        return {"error": str(e)}


def handle_slack_event(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle Slack event (e.g., app_mention, message)."""
    event_type = event_data.get("type", "")
    user_id = event_data.get("user", "")
    channel_id = event_data.get("channel", "")
    text = event_data.get("text", "")

    # Log the event
    if event_logger:
        event_logger.log_slack_event(
            event_type,
            {
                "user_id": user_id,
                "channel_id": channel_id,
                "text": text,
            },
        )

    # Example: respond to app_mention
    if event_type == "app_mention":
        response = {"text": f"Hello <@{user_id}>! How can I help you?"}
        if slack_proxy_instance:
            slack_proxy_instance.notify_command_executed("app_mention", user_id, True)
        return response

    return {"text": "Event received."}


def send_slack_response(response_url: str, response_data: Dict[str, Any]) -> bool:
    """Send response to Slack via response_url."""
    try:
        import requests

        response = requests.post(response_url, json=response_data, timeout=10)
        return response.status_code == 200
    except Exception as e:
        print(f"Error sending Slack response: {e}")
        return False
