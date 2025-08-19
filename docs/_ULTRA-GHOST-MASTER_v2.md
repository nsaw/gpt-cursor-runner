ultra_ghost_master:
title: OFFICIAL ULTIMATE GUIDE TO ***REMOVED*** BRIDGE PATCH FLOW & HOW TO USE
version: v3.4.801(P0.01.03)
maintained_by: DEV (CYOPS)
last_updated: "2025-08-02T00:00:00Z"

summary:
purpose: >
Complete, operator-friendly, structured documentation for Ghost/GPT-Cursor-Runner/THOUGHTRUNNER-AI.
Covers lifecycle from remote detection to summary, unified logging, monitoring, alerts, watchdogs,
recovery, and reliability guarantees. Designed for remote-only operations (no localhost access).
reliability_guarantees: - 99.9%+ availability via watchdogs + fallbacks - Zero silent failures: every state is logged and alertable - Multi-format acceptance parity: YAML + JSON (role: command_patch) - Self-healing: auto-recovery for bridge, executor, monitor with backoff and caps - Atomic summaries: temp → final with backup, corruption-resistant

environments:
main:
alias: BRAUN
root: "/Users/sawyer/gitSync/.cursor-cache/MAIN"
patches_dir: "/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/"
summaries_dir: "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/"
cyops:
alias: DEV
root: "/Users/sawyer/gitSync/.cursor-cache/CYOPS"
patches_dir: "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/"
summaries_dir: "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/"
root_logs:
dir: "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/"
files: - ghost-bridge-status.json - patch-executor-status.json - unified-monitor-status.json - patch-events.log - unified-monitor.log - alert-correlation.json - dashboard-alerts.json - stuck-patches-dashboard.json - LOCAL_ALERTS - CRITICAL_ALERT - .backup/

components: - name: Ghost Bridge
path: "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ghost-bridge-simple.js"
role: Patch detection, parsing (JSON+YAML), routing, debounced heartbeat, stale detection
inputs: - GPT/Slack relayed messages (relay process → local scan)
outputs: - Patch JSON into {MAIN|CYOPS}/patches/ - Events to ROOT/.logs/patch-events.log - Heartbeat to ROOT/.logs/ghost-bridge-status.json
guarantees: - Accepts JSON or YAML code blocks with role: command_patch and target - Atomic writes for patches; deduped heartbeats (every 30s or on change) - Log rotation (5MB) with cap of 10 rotated files + purge; alert on rapid rotation - Log write failure escalation with fallback file + CRITICAL_ALERT
start:
node_entry: startBridge()
module: require.main guard present - name: Patch Executor
path: "/Users/sawyer/gitSync/gpt-cursor-runner/patch_executor_daemon.py"
role: Polls patches, executes, creates atomic summaries, moves to .completed/.failed
monitors: - queue depth every 30s; state-change logging; warn if >10 - stale patches >15m; detection and alert (dashboard lists)
outputs: - patch-executor-status.json (debounced) - atomic summaries (ROOT/.logs/\*.summary.md + .backup) - events to ROOT/.logs/patch-events.log
guarantees: - Atomic temp → final summary with backup - Fallback log if unified log fails; CRITICAL_ALERT file generated
apply_patch: - External apply_patch.py if present; robust fallback built-in - name: Unified Patch Monitor
path: "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/unified-patch-monitor.js"
role: Correlates alerts, maintains dashboards, stuck-patch view, dedupes alerts (UUID)
outputs: - unified-monitor-status.json (30s) - dashboard-alerts.json (recent 50) - stuck-patches-dashboard.json (actions: force_retry|move_to_failed|delete_patch|manual_review)
guarantees: - Duplicate alert suppression (5 min window), UUID correlation - Local fallback alerts (LOCAL_ALERTS) if Slack fails (requires SLACK_WEBHOOK_URL)
slack_alerts:
env_var: SLACK_WEBHOOK_URL
fallback: LOCAL_ALERTS + dashboard-alerts.json

ports_urls:
local:
dashboard: "http://localhost:3002"
ghost_runner_health: "http://localhost:5053/health"
ghost_bridge: "http://localhost:5051"
flask_dashboard: "http://localhost:8787"
external:
cloudflare_tunnel: "https://gpt-cursor-runner.thoughtmarks.app/api/status"
fly_health: "https://gpt-cursor-runner.fly.dev/health"
slack_relay: "https://slack.thoughtmarks.app"
boot_script:
path: "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/core/unified-boot.sh"
patterns: - non-blocking launcher (nb) with timeout/disown - curl_nb health-checks with PID capture & disown - port preflight kill/verify

lifecycle:
1_patch_creation:
sources: [BRAIN, COACH, Slack]
wrapper: { role: command_patch, target: MAIN|CYOPS, blockId?: string, version?: string }
body: "mutations/shell (optional), patch content or patterns, metadata"
2_detection_bridge:
watch: [GPT relayed messages, Slack webhooks]
parse: "extractCodeBlocks() → tryParseJSON → tryParseYAML"
validate: "role=command_patch + target required"
route: "MAIN → MAIN/patches; CYOPS|DEV → CYOPS/patches"
write: "atomic temp → final; events logged; heartbeat debounced"
3_execution_executor:
poll: "every 30s; oldest-first processing"
apply: "apply_patch_from_file() → backup → mutate → optional shell"
summarize: "atomic summary to ROOT/.logs + .backup; result move to .completed|.failed"
4_monitoring_alerts:
heartbeats: [ghost-bridge-status.json, patch-executor-status.json, unified-monitor-status.json]
alerts:
primary: Slack (retry-backed)
secondary: LOCAL_ALERTS (file), dashboard-alerts.json (visual)
dedupe: "UUID correlation; 5-minute suppression window"
5_recovery_failover:
watchdogs:
dir: "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/watchdogs/"
core: - ghost-bridge-watchdog.sh: restart bridge if stale (>60s) - patch-executor-watchdog.sh: restart executor if stale (>60s) - consolidated-watchdog.sh: orchestrated system pings + restarts - summary-watcher-watchdog.sh: ensures summary pipeline alive - cloudflared-tunnel-watchdog.js: tunnel checks/restart
caps: "max 2 restarts/5min per component"
log_failure: "fallback files + CRITICAL_ALERT; operator intervention required to unblock persistent unwritable logs"
stuck_patches: ".stuck/ listed on dashboard; manual actions exposed (force_retry/move/delete/review)"

directories_watchers:
root_logs: "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/"
cyops_patches: "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/" # executor watches
main_patches: "/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/" # BRAUN executor
cyops_summaries: "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/"
main_summaries: "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/"
proof:
validation_log: "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/validation-tests.log"

yaml_json_parity:
acceptance: "Bridge accepts YAML/JSON blocks → serializes to JSON patch files; executors process JSON files"
wrapper_required: "role: command_patch + target"
parity_note: "MAIN parity assumed by shared bridge contract; automated parity checks recommended if MAIN uses separate runner binary"

monitoring_matrix:
heartbeat_intervals_seconds: 30
heartbeat_stale_threshold_seconds: 60
queue_depth_alert_threshold: 10
stale_patch_threshold_minutes: 15
log_rotate_mb: 5
rotated_files_max: 10
rapid_rotation_alert_per_hour: 3

failure_modes: - name: Ghost Bridge down
detection: "no heartbeat >60s"
action: "watchdog restart (≤2/5min), alert via monitor (Slack+fallback)" - name: Executor hang
detection: "no heartbeat >60s, no queue movement"
action: "watchdog restart, stale detection, dashboard surfaced" - name: Log write failure
detection: "writeUnifiedLog() exception"
action: "fallback log + CRITICAL_ALERT; operator unblocks perms/disk; then resume" - name: Slack outage
detection: "sendSlackAlert() error"
action: "LOCAL_ALERTS + dashboard entry; monitor retries" - name: Summary corruption
detection: "atomic write/verify; backup always kept"
action: "alert + manual review; (future: retry x3)" - name: Stuck patches (>15m)
detection: "bridge/executor stale check + dashboard listing"
action: "manual action via dashboard; (future: auto-move to .stuck/)"

remote*ops:
without_localhost:
view_health: - ROOT/.logs/\_status.json - dashboard-alerts.json, LOCAL_ALERTS - patch-events.log, unified-monitor.log
place_patch: - Post wrapped patch via Slack/GPT; bridge serializes YAML→JSON into patches/
verify_execution: - observe patches/.completed or .failed; check matching summary in ROOT/.logs/*.summary.md

manual_controls:
restart:
ghost_bridge: "pm2 restart ghost-bridge (watchdog also acts)"
executor: "pm2 restart patch-executor"
monitor: "pm2 restart unified-patch-monitor"
emergency:
make_alert: "echo '...' > ROOT/.logs/CRITICAL_ALERT"
unblock_logs: "ensure ROOT/.logs writable; rotation purged to <10 backups"
unified_boot: "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/core/unified-boot.sh"

operator_checklist: - Heartbeats fresh (<60s) for all components - ROOT/.logs writable; no rapid rotation alerts - Queue depth acceptable (<10) - No stuck patches; or handle via dashboard actions - Slack/LOCAL_ALERTS show recent activity - Tunnel reachable if external access needed

validation:
scripts:
bridge: "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/validate-patch-runner.js"
executor: "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/validate-executor.py"
proofs: - JSON/YAML extraction/write (PASS) - Bridge heartbeat write (PASS) - Stale patch detection invoke (PASS) - Executor queue overflow monitor (planned-test) - Executor stale detection & dashboard list (planned-test) - Atomic summary + backup (planned-test) - apply_patch fallback path (planned-test) - Heavy rotation (>3/hr) synthetic test (planned-test) - Slack fallback (monitor) synthetic test (planned-test)

appendix:
files: - scripts/ghost-bridge-simple.js - patch_executor_daemon.py - scripts/unified-patch-monitor.js - scripts/core/unified-boot.sh - scripts/watchdogs/\* (bridge/executor/cloudflared/summary/consolidated) - scripts/validate-patch-runner.js - scripts/validate-executor.py
notes: - All absolute paths begin with /Users/sawyer/gitSync/ - All background commands must use timeout + disown non-blocking patterns
