# TERMINAL SAFETY PROTOCOL

## Overview
All agent terminal sessions are guarded by comprehensive safety measures to prevent hangs, infinite loops, and resource exhaustion.

## Safety Measures

### 1. Timeout Fallback
- **Duration**: 30 seconds default
- **Fallback**: Automatic dismissal of stuck sessions
- **Cross-platform**: Works on macOS (gtimeout) and Linux (timeout)

### 2. Feedback Loop Protection
- **Max Iterations**: 3 attempts before escalation
- **Timeout**: 20 seconds per iteration
- **Action**: Kill and restart if exceeded

### 3. Watchdog Enforcement
- **Background Hang Rescue**: 15-second timeout
- **Action**: Kill stuck processes
- **Auto-release**: 10-second delay for cleanup

### 4. Safe-run Wrapper Script
- **Cross-platform compatibility**
- **Graceful fallback** when timeout commands unavailable
- **Error handling** for edge cases

## Agent Safety Configuration

### Terminal Blocking Protection
- **Enabled**: true
- **Auto-dismiss**: Stuck sessions automatically terminated
- **Max session duration**: 60 seconds

### Auto-release Settings
- **Enabled**: true
- **Delay**: 10 seconds
- **Action**: Kill and cleanup

## Escalation Protocol

If sessions exceed maximum thresholds:
1. **Task killed** immediately
2. **Session dismissed** automatically
3. **Escalated** to GPT for review
4. **Summary returned** to maintain communication loop

## Implementation

The safety stack is implemented through:
- `.cursor-config.json` configuration
- `scripts/safe-run.sh` wrapper script
- Node.js timeout enforcement
- Background process monitoring

## Recovery

When safety measures trigger:
1. **Immediate termination** of problematic session
2. **State preservation** where possible
3. **Clean restart** of affected services
4. **Status reporting** to maintain visibility

---

**Note**: This protocol ensures reliable GPT ↔ DEV communication while preventing resource exhaustion and infinite loops. 