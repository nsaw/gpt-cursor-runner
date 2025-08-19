# 📌 GPT-Cursor Runner Slack Command Cheat Sheet

display_information:
name: ***REMOVED***
description: ***REMOVED*** - GPT-powered Cursor automation control

features:
app_home:
home_tab_enabled: true
messages_tab_enabled: true
messages_tab_read_only_enabled: false
bot_user:
display_name: Ghost
always_online: true
slash_commands: - command: /dashboard
url: https://slack.thoughtmarks.app/slack/commands
description: View dashboard, roadmap, or current system stats
usage_hint: '[roadmap|stats|help]' - command: /status-runner
url: https://slack.thoughtmarks.app/slack/commands
description: Check runner/system status, pulse, or phase info
usage_hint: '[push|phase|full]' - command: /patch-approve
url: https://slack.thoughtmarks.app/slack/commands
description: Approve, preview, or list pending patches
usage_hint: '[next|all|preview|<patch_id>|MAIN|BRAUN|CYOPS|DEV]' - command: /patch-revert
url: https://slack.thoughtmarks.app/slack/commands
description: Revert latest applied patch (by ID optional)
usage_hint: '[<patch_id>|MAIN|BRAUN|CYOPS|DEV]' - command: /revert-phase
url: https://slack.thoughtmarks.app/slack/commands
description: Revert last completed phase (with confirm)
usage_hint: '[confirm|<phase_id>|MAIN|BRAUN|CYOPS|DEV]' - command: /log-phase-status
url: https://slack.thoughtmarks.app/slack/commands
description: Log or display current phase status
usage_hint: '[MAIN|BRAUN|CYOPS|DEV]' - command: /cursor-mode
url: https://slack.thoughtmarks.app/slack/commands
description: Switch Cursor operation mode (auto/manual/test/lockdown)
usage_hint: '<auto|manual|test|lockdown>' - command: /kill
url: https://slack.thoughtmarks.app/slack/commands
description: Emergency hard stop for the runner (confirm required)
usage_hint: 'confirm' - command: /interrupt
url: https://slack.thoughtmarks.app/slack/commands
description: Pause, force stop, or redirect the current operation
usage_hint: '[pause|force|resume <patch_id>]' - command: /toggle-runner
url: https://slack.thoughtmarks.app/slack/commands
description: Toggle runner state (on/off/lock/unlock)
usage_hint: '[on|off|lock|unlock]' - command: /summary-logs
url: https://slack.thoughtmarks.app/slack/commands
description: Get summary logs
usage_hint: '[MAIN|BRAUN|CYOPS|DEV]' - command: /system-manager
url: https://slack.thoughtmarks.app/slack/commands
description: System manage, repair, or health check
usage_hint: '[boot|shutdown|repair|health|restart|MAIN|BRAUN|CYOPS|DEV]' - command: /manual-revise
url: https://slack.thoughtmarks.app/slack/commands
description: Manual patch revision or append notes/content
usage_hint: '<revision notes|append [notes]|MAIN|BRAUN|CYOPS|DEV>' - command: /proceed
url: https://slack.thoughtmarks.app/slack/commands
description: Continue, approve, or resume queued action
usage_hint: '[screenshot|continue|approve|nostop]' - command: /again
url: https://slack.thoughtmarks.app/slack/commands
description: Retry failed or restart runner, with arguments
usage_hint: '[retry|restart|manual <task>]' - command: /troubleshoot
url: https://slack.thoughtmarks.app/slack/commands
description: Run diagnostics and auto-fix routines
usage_hint: '[fix|full|logs]' - command: /troubleshoot-oversight
url: https://slack.thoughtmarks.app/slack/commands
description: Manual oversight for troubleshooting fixes
usage_hint: '[approve|reject]' - command: /poke-agent
url: https://slack.thoughtmarks.app/slack/commands
description: Unstick and resume agent (DEV/BRAUN/all) with non-blocking nudge
usage_hint: '<DEV|BRAUN|ALL|MAIN|CYOPS> [resume|restart]' - command: /manual-handoff
url: https://slack.thoughtmarks.app/slack/commands
description: Directly send patch to DEV or BRAUN for execution
usage_hint: '<DEV|BRAUN|MAIN|CYOPS> [file|text|notes]' - command: /patch-preview
url: https://slack.thoughtmarks.app/slack/commands
description: Preview pending patches
usage_hint: '[preview|MAIN|BRAUN|CYOPS|DEV]' - command: /restart-runner
url: https://slack.thoughtmarks.app/slack/commands
description: Restart the GPT-Cursor Runner service
usage_hint: '[MAIN|BRAUN|CYOPS|DEV]' - command: /patch-status
url: https://slack.thoughtmarks.app/slack/commands
description: Patch queue status
usage_hint: '[MAIN|BRAUN|CYOPS|DEV]' - command: /approve-screenshot
url: https://slack.thoughtmarks.app/slack/commands
description: Approve screenshot-based patches
usage_hint: '[MAIN|BRAUN|CYOPS|DEV]' - command: /status-queue
url: https://slack.thoughtmarks.app/slack/commands
description: Status of patch queue
usage_hint: '[MAIN|BRAUN|CYOPS|DEV]' - command: /alert-runner-crash
url: https://slack.thoughtmarks.app/slack/commands
description: Send crash alert notification
usage_hint: '[none]' - command: /daemon-status
url: https://slack.thoughtmarks.app/slack/commands
description: Detailed daemon/process health
usage_hint: '[MAIN|BRAUN|CYOPS|DEV]'
oauth_config:
redirect_urls: - https://slack.thoughtmarks.app/slack/oauth/callback
scopes:
bot: - assistant:write - chat:write - commands - incoming-webhook - users:read - app_mentions:read - channels:history - channels:read - groups:read - im:read - im:history - mpim:read
settings:
event_subscriptions:
request_url: https://slack.thoughtmarks.app/slack/events
bot_events: - app_mention - message.channels - message.im
interactivity:
is_enabled: true
request_url: https://slack.thoughtmarks.app/slack/interactions
org_deploy_enabled: false
socket_mode_enabled: true
token_rotation_enabled: true

**everything below is DEPRECATED!**

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
