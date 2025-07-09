# GPT-CURSOR RUNNER: SLACK COMMAND CHEATSHEET

## STATUS + INFO
- `/status-runner` → Full system status + memory + patch stats ✅
- `/dashboard` → Open patch dashboard ✅
- `/whoami` → Your identity + access level ✅

## RUNNER CONTROLS
- `/toggle-runner-auto` → Toggle auto/manual mode ✅
- `/pause-runner` → Pause the runner ✅
- `/proceed` → Continue/approve next action (consolidated) ✅
- `/again` → Retry failed or restart runner (consolidated) ✅

## PATCH WORKFLOW
- `/patch-approve` → Approve current patch ✅
- `/patch-revert` → Revert latest patch ✅
- `/patch-preview` → View pending patch before applying ✅
- `/revert-phase` → Undo last full phase ✅

## MANUAL INTERVENTION
- `/manual-revise` → Send patch back to Cursor for revision ✅
- `/manual-append` → Append your input + forward ✅
- `/interrupt` → Pause and redirect flow manually ✅
- `/send-with` → Request logs/screenshot/context ✅

## TROUBLESHOOTING
- `/troubleshoot` → GPT auto-generates and applies diagnostic patch ✅
- `/troubleshoot-oversight` → Auto-runs patch, pauses for human approval ✅

## MODES + PHASES
- `/cursor-mode` → Current run mode (auto/manual) ✅
- `/log-phase-status` → Active phase + patch log ✅
- `/roadmap` → Show roadmap milestones ✅

## EMERGENCY OPS
- `/kill` → Emergency kill (hard stop) ✅
- `/alert-runner-crash` → Report silent or unlogged crash ✅

## SLACK DISPATCH (NEW)
- `/gpt-slack-dispatch` → GPT posts directly to Slack ✅
- `/cursor-slack-dispatch` → Cursor posts code blocks to Slack ✅

## THEME MANAGEMENT
- `/theme` → Manage Cursor theme settings ✅
- `/theme-status` → Check current theme status ✅
- `/theme-fix` → Fix theme-related issues ✅

## LOCKDOWN CONTROLS
- `/lock-runner` → Lock runner (prevent changes) ✅
- `/unlock-runner` → Unlock runner (allow changes) ✅

## TOGGLE CONTROLS
- `/toggle-runner-on` → Enable the runner ✅
- `/toggle-runner-off` → Disable the runner ✅

## ROADMAP
- `/show-roadmap` → Display development roadmap ✅

---

## COMMANDS NOT IMPLEMENTED (YET)
❌ `/patch-pass` → Use `/patch-approve` instead
❌ `/restart-runner` → Use `/again restart` instead  
❌ `/read-secret [KEY]` → Not implemented yet

## USAGE EXAMPLES

### Basic Status Check
```
/status-runner
```

### Manual Patch Revision
```
/manual-revise "Fix the button styling to use primary colors"
```

### Troubleshooting
```
/troubleshoot
/troubleshoot-oversight approve
```

### Slack Dispatch
```
/gpt-slack-dispatch {"action": "postMessage", "channel": "#runner-control", "text": "🤖 GPT update!"}
/cursor-slack-dispatch {"action": "postCodeBlock", "channel": "#runner-control", "text": "function hello() { return 'world'; }", "context": "New function"}
```

### Emergency Operations
```
/kill
/interrupt force
```

---

## QUICK REFERENCE

**Status & Info:** `/status-runner`, `/dashboard`, `/whoami`
**Controls:** `/proceed`, `/again`, `/interrupt`
**Patches:** `/patch-approve`, `/patch-revert`, `/patch-preview`
**Manual:** `/manual-revise`, `/manual-append`, `/send-with`
**Troubleshoot:** `/troubleshoot`, `/troubleshoot-oversight`
**Emergency:** `/kill`, `/alert-runner-crash`
**Slack Dispatch:** `/gpt-slack-dispatch`, `/cursor-slack-dispatch`

---

**Dashboard:** `/dashboard` | **Source:** @nsaw/gpt-cursor-runner.git
**Manifest:** Updated with all new consolidated commands ✅ 