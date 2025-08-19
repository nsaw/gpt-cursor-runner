Here is your **complete, fully revised `.md` Slack slash command logic sheet**, covering all **25 commands** you listed.
Each section includes:

- Command
- Request URL
- Short Description
- Long Description (with logic & expectations)
- Usage Hint (parameters as shown in manifest)
- Explicit note for `[target: MAIN/BRAUN or CYOPS/DEV]` where required

---

# ***REMOVED*** / GPT-Cursor Runner — Slack Command Logic Spec (Full, 25 commands)

---

## `/dashboard`

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
View dashboard, roadmap, or current system stats.
**Long Description:**
Fetches live dashboard URL, runner state (online/offline), next milestone (if `roadmap` param), and current system stats. Aggregates and formats for Slack markdown.
**Usage Hint:** `[roadmap|stats|help]`
**Parameters:**

- `roadmap` — show roadmap milestones
- `stats` — show system stats only
- _none_ — just dashboard and overall state
  **Escape:** No

---

## `/status-runner`

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Check runner/system status, pulse, or phase info.
**Long Description:**
Returns runner health, service status (uptime/mem/CPU), queue state, current mode.
If `push`, triggers dashboard/log update.
If `phase`, shows current patch phase.
**Usage Hint:** `[push|phase|full|help]`
**Parameters:**

- `push` — log/push status
- `phase` — patch/phase stats
- `full` — verbose system diagnostics
  **Escape:** No

---

## `/patch-approve`                    \[target: MAIN/BRAUN or CYOPS/DEV]

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Approve or apply patch for a given target.
**Long Description:**
Lists, previews, or applies the next, all, or a specific patch by ID, for the selected agent/system. On approval, applies and logs.
**Usage Hint:** `[next|all|preview|<patch_id>|MAIN|BRAUN|CYOPS|DEV]`
**Parameters:**

- `next`
- `all`
- `preview`
- `<patch_id>`
- `MAIN`, `BRAUN`, `CYOPS`, `DEV` (target system)
  **Escape:** No

---

## `/patch-revert`                        \[target: MAIN/BRAUN or CYOPS/DEV]

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Revert applied patch for a given target.
**Long Description:**
Rolls back the latest or a specified patch for the target. Safety checks before execution.
**Usage Hint:** `[<patch_id>|MAIN|BRAUN|CYOPS|DEV]`
**Parameters:**

- `<patch_id>`
- `MAIN`, `BRAUN`, `CYOPS`, `DEV` (target)
  **Escape:** No

---

## `/revert-phase`                        \[target: MAIN/BRAUN or CYOPS/DEV]

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Revert last completed phase for a given target.
**Long Description:**
Identifies and rolls back all patches from the last completed phase for the agent/system. Requires `confirm` param.
**Usage Hint:** `[confirm|<phase_id>|MAIN|BRAUN|CYOPS|DEV]`
**Parameters:**

- `confirm`
- `<phase_id>`
- `MAIN`, `BRAUN`, `CYOPS`, `DEV` (target)
  **Escape:** No

---

## `/log-phase-status`                    \[target: MAIN/BRAUN or CYOPS/DEV]

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Log/display current phase status for a given target.
**Long Description:**
Fetches active phase name, running/paused/completed, patch counts, last update, for the selected agent/system.
**Usage Hint:** `[MAIN|BRAUN|CYOPS|DEV]`
**Parameters:**

- `MAIN`, `BRAUN`, `CYOPS`, `DEV` (target)
  **Escape:** No

---

## `/cursor-mode`

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Switch Cursor operation mode (auto/manual/test/lockdown).
**Long Description:**
Switches runner mode to given argument (auto/manual/test/lockdown), updates config, and confirms.
**Usage Hint:** `<auto|manual|test|lockdown>`
**Parameters:**

- `auto`
- `manual`
- `test`
- `lockdown`
  **Escape:** No

---

## `/kill`

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Emergency hard stop for the runner (confirm required).
**Long Description:**
Kills the runner process, warns about unsaved work, requires `confirm`.
**Usage Hint:** `confirm`
**Parameters:**

- `confirm`
  **Escape:** No

---

## `/interrupt`

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Pause, force stop, or redirect the current operation.
**Long Description:**
Pauses, force stops, or resumes with new patch/task if given param.
**Usage Hint:** `[pause|force|resume <patch_id>]`
**Parameters:**

- `pause`
- `force`
- `resume <patch_id>`
  **Escape:** No

---

## `/toggle-runner`

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Toggle runner state (on/off/lock/unlock).
**Long Description:**
Enables/disables runner operations or locks/unlocks patch queue.
**Usage Hint:** `[on|off|lock|unlock]`
**Parameters:**

- `on`
- `off`
- `lock`
- `unlock`
  **Escape:** No

---

## `/summary-logs`                        \[target: MAIN/BRAUN or CYOPS/DEV]

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Get summary logs for a target.
**Long Description:**
Fetches and summarizes logs for the chosen agent/system (MAIN/BRAUN/CYOPS/DEV).
**Usage Hint:** `[MAIN|BRAUN|CYOPS|DEV]`
**Parameters:**

- `MAIN`, `BRAUN`, `CYOPS`, `DEV` (target)
  **Escape:** No

---

## `/system-manager`                    \[target: MAIN/BRAUN or CYOPS/DEV]

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Manage, repair, or health check system/agent.
**Long Description:**
Performs requested operation (boot, shutdown, repair, health, restart) for the specified agent/system.
**Usage Hint:** `[boot|shutdown|repair|health|restart|MAIN|BRAUN|CYOPS|DEV]`
**Parameters:**

- `boot`
- `shutdown`
- `repair`
- `health`
- `restart`
- `MAIN`, `BRAUN`, `CYOPS`, `DEV` (target)
  **Escape:** No

---

## `/manual-revise`                      \[target: MAIN/BRAUN or CYOPS/DEV]

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Manual patch revision (add notes/content) for a target.
**Long Description:**
Adds or appends revision notes/content to pending patch for selected target.
**Usage Hint:** `<revision notes|append [notes]|MAIN|BRAUN|CYOPS|DEV>`
**Parameters:**

- `<notes>`
- `append <notes>`
- `MAIN`, `BRAUN`, `CYOPS`, `DEV` (target)
  **Escape:** No

---

## `/proceed`

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Continue, approve, or resume queued action.
**Long Description:**
Continues or approves next action; supports approve screenshot, continue, or silent resume.
**Usage Hint:** `[screenshot|continue|approve|nostop]`
**Parameters:**

- `screenshot`
- `continue`
- `approve`
- `nostop`
  **Escape:** No

---

## `/again`

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Retry failed or restart runner, with arguments.
**Long Description:**
Retries last failed op, restarts runner, or reruns specified task.
**Usage Hint:** `[retry|restart|manual <task>]`
**Parameters:**

- `retry`
- `restart`
- `manual <task>`
  **Escape:** No

---

## `/troubleshoot`

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Run diagnostics and auto-fix routines.
**Long Description:**
Runs diagnostics, lints, validations, attempts auto-fixes, and posts summary.
**Usage Hint:** `[fix|full|logs]`
**Parameters:**

- `fix`
- `full`
- `logs`
  **Escape:** No

---

## `/troubleshoot-oversight`

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Manual oversight for troubleshooting fixes.
**Long Description:**
Runs diagnostics, waits for explicit `approve`/`reject` before fixing or rolling back.
**Usage Hint:** `[approve|reject]`
**Parameters:**

- `approve`
- `reject`
  **Escape:** No

---

## `/poke-agent`                         \[target: MAIN/BRAUN or CYOPS/DEV]

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Unstick and resume agent for given target.
**Long Description:**
Sends poke/nudge event, optionally resume/restart, logs state for selected agent/system.
**Usage Hint:** `<DEV|BRAUN|ALL|MAIN|CYOPS> [resume|restart]`
**Parameters:**

- `DEV`, `BRAUN`, `ALL`, `MAIN`, `CYOPS`
- `resume`
- `restart`
  **Escape:** No

---

## `/manual-handoff`                     \[target: MAIN/BRAUN or CYOPS/DEV]

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Directly send patch to agent for a given target.
**Long Description:**
Uploads or pastes patch, chooses agent/system, places patch in target's queue and triggers execution.
**Usage Hint:** `<DEV|BRAUN|MAIN|CYOPS> [file|text|notes]`
**Parameters:**

- `DEV`, `BRAUN`, `MAIN`, `CYOPS`
- `file`
- `text`
- `notes`
  **Escape:** No

---

## `/patch-preview`                        \[target: MAIN/BRAUN or CYOPS/DEV]

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Preview pending patches for a given target.
**Long Description:**
Lists previews for pending patches (all or for a given agent/system).
**Usage Hint:** `[preview|MAIN|BRAUN|CYOPS|DEV]`
**Parameters:**

- `preview`
- `MAIN`, `BRAUN`, `CYOPS`, `DEV`
  **Escape:** No

---

## `/restart-runner`

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Restart the GPT-Cursor Runner service.
**Long Description:**
Restarts the backend runner service. Target can be specified if multi-runner setup.
**Usage Hint:** `[MAIN|BRAUN|CYOPS|DEV]`
**Parameters:**

- `MAIN`, `BRAUN`, `CYOPS`, `DEV` (target if applicable)
  **Escape:** No

---

## `/patch-status`                       \[target: MAIN/BRAUN or CYOPS/DEV]

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Patch queue status for a target.
**Long Description:**
Shows status/length of patch queue for specified agent/system.
**Usage Hint:** `[MAIN|BRAUN|CYOPS|DEV]`
**Parameters:**

- `MAIN`, `BRAUN`, `CYOPS`, `DEV` (target)
  **Escape:** No

---

## `/approve-screenshot`                     \[target: MAIN/BRAUN or CYOPS/DEV]

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Approve screenshot-based patches for a target.
**Long Description:**
Approves screenshot/UI-based patch for chosen agent/system.
**Usage Hint:** `[MAIN|BRAUN|CYOPS|DEV]`
**Parameters:**

- `MAIN`, `BRAUN`, `CYOPS`, `DEV` (target)
  **Escape:** No

---

## `/status-queue`                          \[target: MAIN/BRAUN or CYOPS/DEV]

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Status of patch queue for a target.
**Long Description:**
Returns real-time status of queue for selected agent/system.
**Usage Hint:** `[MAIN|BRAUN|CYOPS|DEV]`
**Parameters:**

- `MAIN`, `BRAUN`, `CYOPS`, `DEV` (target)
  **Escape:** No

---

## `/alert-runner-crash`

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Send crash alert notification.
**Long Description:**
Sends immediate alert to ops/monitoring for detected runner crash.
**Usage Hint:** `[none]`
**Parameters:** None
**Escape:** No

---

## `/daemon-status`

**Request URL:**
`https://gpt-cursor-runner.fly.dev/slack/commands`
**Short Description:**
Detailed daemon/process health.
**Long Description:**
Returns in-depth health status of all daemons/processes for one or all systems.
**Usage Hint:** `[MAIN|BRAUN|CYOPS|DEV]`
**Parameters:**

- `MAIN`, `BRAUN`, `CYOPS`, `DEV` (target if applicable)
  **Escape:** No

---

**You now have a complete, actionable, and detailed command logic reference for all 25 commands—ready for DEV, backend, or automation handoff.**
If you need this in table format, or want copy-ready YAML/manifest too, just ask!
