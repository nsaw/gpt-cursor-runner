# 📌 GPT-Cursor Runner Slack Command Cheat Sheet

## Essential 25 Commands

### Core Runner Control (8 commands)
- `/dashboard` - View Dashboard
- `/status-runner` - Check current runner status and health
- `/status-push` - Status pulse now
- `/restart-runner` - Restart the GPT-Cursor Runner service
- `/kill` - Force stop the runner (emergency)
- `/toggle-runner` - Toggles between on (auto mode) and off
- `/runner-lock` - toggle (un)Lock runner (prevent changes)
- `/watchdog-ping` - Ping watchdog

### Patch Management (7 commands)
- `/patch-pass` - `<next [task, patch, phase, all queued]> pending patches`
- `/patch-revert` - Revert the last applied patch
- `/patch-preview` - Preview pending patches
- `/approve-screenshot` - Approve screenshot-based patches
- `/revert-phase` - Revert to previous phase
- `/log-phase-status` - Log current phase status
- `/cursor-mode` - Switch Cursor operation modes

### Workflow Control (5 commands)
- `/proceed` - passes through "proceed" with option to specify `<as reply ...`
- `/again` - restarts or retry last with optional manual input
- `/manual-revise` - returns to sender with notes for another attempt after UN...
- `/manual-append` - conditional approval- passes through with notes
- `/interrupt` - stop current operation, pass note, and resume w/ new info

### Troubleshooting & Diagnostics (3 commands)
- `/troubleshoot` - Triggers GPT to generate a full hybrid diagnostic block (with oversight)
- `/send-with` - Request reissue of patch from sender with more info
- `/troubleshoot-oversight` - requires human review after running fix to confirm

### Information & Alerts (2 commands)
- `/watchdog-ping` - Ping watchdog
- `/toggle-runner` - Toggles between on (auto mode) and off
- `/runner-lock` - toggle (un)Lock runner (prevent changes)

## Request URL
All commands use this endpoint:
```
POST https://gpt-cursor-runner.fly.dev/slack/commands
```

## Quick Reference

### Most Used Commands
- `/dashboard` - Quick status overview
- `/status-runner` - Detailed health check
- `/patch-pass next` - Approve next patch
- `/proceed` - Continue operations
- `/again` - Retry failed operations

### Emergency Commands
- `/kill` - Emergency stop
- `/interrupt` - Stop current operation
- `/alert-runner-crash` - Send crash alert

### Patch Workflow
- `/patch-preview` - See what's pending
- `/patch-pass next` - Approve next patch
- `/patch-revert` - Undo last patch
- `/manual-revise "notes"` - Send back with notes

### System Control
- `/toggle-runner` - On/off switch
- `/runner-lock` - Lock/unlock changes
- `/restart-runner` - Restart service
- `/watchdog-ping` - System health check

## Usage Examples

```bash
# Basic status checks
/dashboard
/status-runner
/status-push

# Patch management
/patch-pass next
/patch-pass all
/patch-preview
/patch-revert

# Workflow control
/proceed
/proceed "as reply to user"
/again
/again "retry with new context"

# Manual interventions
/manual-revise "Fix the button styling"
/manual-append "Add error handling"
/interrupt "pause for review"

# System control
/toggle-runner
/runner-lock
/restart-runner
/kill

# Troubleshooting
/troubleshoot
/troubleshoot-oversight approve
/send-with "include logs"

# Information
/roadmap
/alert-runner-crash "manual alert"
```

## Next Steps for Cloud Runner
- Deploy `Dockerfile` to Fly.io, Railway, or EC2
- Link Slack env vars in CI/CD
- Mount persistent volume for logs + tasks
- Replace ngrok with reserved domain or Cloudflare Tunnel
