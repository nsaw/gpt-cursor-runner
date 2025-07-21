# 🎯 Essential 25 Slack Commands for GPT-Cursor Runner

## Overview
This document defines the 25 essential Slack slash commands for the GPT-Cursor Runner system, optimized for daily usage and staying within Slack's command limit.

**Base Request URL for ALL commands:**
```
https://gpt-cursor-runner.fly.dev/slack/commands
```

## 📋 Essential 25 Commands

### **Core Runner Control (8 commands)**

1. **`/dashboard`** - View Dashboard
   - **Description**: View GPT-Cursor Runner dashboard and stats
   - **Usage Hint**: View dashboard
   - **Category**: Monitoring

2. **`/status-runner`** - Check current runner status and health
   - **Description**: Check current runner status and health
   - **Usage Hint**: Check status
   - **Category**: Monitoring

3. **`/status-push`** - Status pulse now
   - **Description**: Status pulse now
   - **Usage Hint**: Status pulse
   - **Category**: Monitoring

4. **`/restart-runner`** - Restart the GPT-Cursor Runner service
   - **Description**: Restart the GPT-Cursor Runner service
   - **Usage Hint**: Restart service
   - **Category**: Control

5. **`/kill`** - Force stop the runner (emergency)
   - **Description**: Force stop the runner (emergency)
   - **Usage Hint**: Emergency stop
   - **Category**: Emergency

6. **`/toggle-runner`** - Toggles between on (auto mode) and off
   - **Description**: Toggles between on (auto mode) and off
   - **Usage Hint**: Toggle runner state
   - **Category**: Control

7. **`/runner-lock`** - toggle (un)Lock runner (prevent changes)
   - **Description**: toggle (un)Lock runner (prevent changes)
   - **Usage Hint**: Lock/unlock runner
   - **Category**: Security

8. **`/watchdog-ping`** - Ping watchdog
   - **Description**: Ping watchdog, webhooks, endpoints for system health
   - **Usage Hint**: Check system health
   - **Category**: Monitoring

### **Patch Management (7 commands)**

9. **`/patch-pass`** - `<next [task, patch, phase, all queued]> pending patches`
    - **Description**: Pass next pending patches with options
    - **Usage Hint**: Pass patches
    - **Category**: Patch Management

10. **`/patch-revert`** - Revert the last applied patch
    - **Description**: Revert the last applied patch
    - **Usage Hint**: Revert patch
    - **Category**: Patch Management

11. **`/patch-preview`** - Preview pending patches
    - **Description**: Preview pending patches
    - **Usage Hint**: Preview patch
    - **Category**: Patch Management

12. **`/approve-screenshot`** - Approve screenshot-based patches
    - **Description**: Approve screenshot-based patches
    - **Usage Hint**: Approve screenshot
    - **Category**: Patch Management

13. **`/revert-phase`** - Revert to previous phase
    - **Description**: Revert to previous phase
    - **Usage Hint**: Revert phase
    - **Category**: Patch Management

14. **`/log-phase-status`** - Log current phase status
    - **Description**: Log current phase status
    - **Usage Hint**: Log status
    - **Category**: Patch Management

15. **`/cursor-mode`** - Switch Cursor operation modes
    - **Description**: Switch Cursor operation modes
    - **Usage Hint**: Switch mode
    - **Category**: Patch Management

### **Workflow Control (5 commands)**

16. **`/proceed`** - passes through "proceed" with option to specify `<as reply ...`
    - **Description**: passes through "proceed" with option to specify
    - **Usage Hint**: Proceed with options
    - **Category**: Workflow

17. **`/again`** - restarts or retry last with optional manual input
    - **Description**: restarts or retry last with optional manual input
    - **Usage Hint**: Retry operation
    - **Category**: Recovery

18. **`/manual-revise`** - returns to sender with notes for another attempt after UN...
    - **Description**: returns to sender with notes for another attempt
    - **Usage Hint**: Manual revision
    - **Category**: Workflow

19. **`/manual-append`** - conditional approval- passes through with notes
    - **Description**: conditional approval- passes through with notes
    - **Usage Hint**: Manual append
    - **Category**: Workflow

20. **`/interrupt`** - stop current operation, pass note, and resume w/ new info
    - **Description**: stop current operation, pass note, and resume w/ new info
    - **Usage Hint**: Interrupt operations
    - **Category**: Control

### **Troubleshooting & Diagnostics (3 commands)**

21. **`/troubleshoot`** - Triggers GPT to generate a full hybrid diagnostic block
    - **Description**: Triggers GPT to generate a full hybrid diagnostic block
    - **Usage Hint**: Auto diagnostics
    - **Category**: Troubleshooting

22. **`/troubleshoot-oversight`** - requires human review after running fix to confirm
    - **Description**: requires human review after running fix to confirm
    - **Usage Hint**: Oversight mode
    - **Category**: Troubleshooting

23. **`/send-with`** - Request reissue of patch from sender with more info
    - **Description**: Request reissue of patch from sender with more info
    - **Usage Hint**: Send with context
    - **Category**: AI Integration

### **Information & Alerts (2 commands)**

24. **`/roadmap`** - Show project roadmap and milestones
    - **Description**: Show project roadmap and milestones
    - **Usage Hint**: View roadmap
    - **Category**: Information

25. **`/alert-runner-crash`** - Send crash alert notification
    - **Description**: Send crash alert notification
    - **Usage Hint**: Alert crash
    - **Category**: Alerts

## 🔄 Changes Made

### **Updated Commands:**
- 🔄 `/patch-approve` → **`/patch-pass`** - More flexible patch passing with options
- 🔄 `/lock-runner` + `/unlock-runner` → **`/runner-lock`** - Single toggle command
- ➕ **`/status-push`** - Status pulse functionality
- ➕ **`/restart-runner`** - Restart service functionality
- ➕ **`/revert-phase`** - Phase reversion
- ➕ **`/log-phase-status`** - Phase status logging
- ➕ **`/cursor-mode`** - Cursor mode switching
- ➕ **`/alert-runner-crash`** - Crash alert notifications

### **Removed Commands:**
- ❌ `/pause-runner` - Consolidated into workflow control
- ❌ `/boot` - Not in current command set
- ❌ `/show-roadmap` - Redundant with `/roadmap`
- ❌ Reserved commands - Replaced with actual functionality

## 📊 Command Categories

| Category | Count | Commands |
|----------|-------|----------|
| Core Runner Control | 8 | dashboard, status-runner, status-push, restart-runner, kill, toggle-runner, runner-lock, watchdog-ping |
| Patch Management | 7 | patch-pass, patch-revert, patch-preview, approve-screenshot, revert-phase, log-phase-status, cursor-mode |
| Workflow Control | 5 | proceed, again, manual-revise, manual-append, interrupt |
| Troubleshooting & Diagnostics | 3 | troubleshoot, troubleshoot-oversight, send-with |
| Information & Alerts | 2 | roadmap, alert-runner-crash |
| **Total** | **25** | |

## ✅ Benefits

1. **Enhanced patch management** with flexible `/patch-pass` command
2. **Improved workflow control** with proceed/again/manual commands
3. **Better system monitoring** with status-push and watchdog-ping
4. **Streamlined runner control** with single toggle and lock commands
5. **Comprehensive troubleshooting** with diagnostic and oversight modes
6. **Stays under 25 command limit** with all essential functionality

## 🚀 Implementation Notes

- All commands use the same endpoint: `https://gpt-cursor-runner.fly.dev/slack/commands`
- Commands are handled by the Express.js router in `server/routes/slack.js`
- The `/patch-pass` command supports multiple options for flexible patch handling
- The `/runner-lock` command replaces separate lock/unlock commands
- The `/send-with` command has enhanced logic for better AI context handling

## 📝 Usage Examples

```bash
# Core Runner Control
/dashboard                    # View dashboard
/status-runner               # Check status
/status-push                 # Status pulse
/restart-runner              # Restart service
/kill                        # Emergency stop
/toggle-runner               # Toggle on/off
/runner-lock                 # Lock/unlock runner
/watchdog-ping               # Check system health

# Patch Management
/patch-pass next             # Pass next patch
/patch-pass all              # Pass all queued patches
/patch-revert                # Revert patch
/patch-preview               # Preview patch
/approve-screenshot          # Approve screenshot
/revert-phase                # Revert phase
/log-phase-status            # Log phase status
/cursor-mode                 # Switch cursor mode

# Workflow Control
/proceed                     # Proceed with operation
/proceed "as reply"          # Proceed with specific option
/again                       # Retry operation
/again "manual input"        # Retry with input
/manual-revise "Fix styling" # Manual revision
/manual-append "Add error handling" # Manual append
/interrupt                   # Interrupt operations

# Troubleshooting
/troubleshoot                # Auto diagnostics
/troubleshoot-oversight      # Manual oversight
/send-with "Add logs"        # Send with context

# Information & Alerts
/roadmap                     # Show roadmap
/alert-runner-crash          # Send crash alert
``` 