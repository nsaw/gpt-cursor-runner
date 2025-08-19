```yaml
# version 1
ultra_ghost_master:
  title: OFFICIAL ULTIMATE GUIDE TO GHOST BRIDGE PATCH FLOW & HOW TO USE
  version: v3.4.801(P0.01.03)
  maintained_by: DEV (CYOPS)
  last_updated: "2025-08-02T00:00:00Z"

  summary:
    purpose: >
      Complete, operator-friendly, structured documentation for Ghost/GPT-Cursor-Runner/THOUGHTRUNNER-AI.
      Covers lifecycle from remote detection to summary, unified logging, monitoring, alerts, watchdogs,
      recovery, and reliability guarantees. Designed for remote-only operations (no localhost access).
    reliability_guarantees:
      - 99.9%+ availability via watchdogs + fallbacks
      - Zero silent failures: every state is logged and alertable
      - Multi-format acceptance parity: YAML + JSON (role: command_patch)
      - Self-healing: auto-recovery for bridge, executor, monitor with backoff and caps
      - Atomic summaries: temp → final with backup, corruption-resistant

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
      files:
        - ghost-bridge-status.json
        - patch-executor-status.json
        - unified-monitor-status.json
        - patch-events.log
        - unified-monitor.log
        - alert-correlation.json
        - dashboard-alerts.json
        - stuck-patches-dashboard.json
        - LOCAL_ALERTS
        - CRITICAL_ALERT
        - .backup/

  components:
    - name: Ghost Bridge
      path: "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ghost-bridge-simple.js"
      role: Patch detection, parsing (JSON+YAML), routing, debounced heartbeat, stale detection
      inputs:
        - chat_conversations.txt (logical: GPT/Slack messages pulled by relay)
        - Slack relay messages (webhook)
      outputs:
        - patch json into {MAIN|CYOPS}/patches/
        - events to ROOT/.logs/patch-events.log
        - heartbeat to ROOT/.logs/ghost-bridge-status.json
      guarantees:
        - Accepts JSON or YAML code blocks with role: command_patch and target
        - Atomic writes for patches; deduped heartbeats (every 30s or on change)
        - Log rotation (5MB) with cap of 10 rotated files + purge
        - Rapid rotation alert (>3/hour)
        - Log write failure escalation with fallback
    - name: Patch Executor
      path: "/Users/sawyer/gitSync/gpt-cursor-runner/patch_executor_daemon.py"
      role: Polls patches, executes, creates atomic summaries, moves to .completed/.failed
      monitors:
        - queue depth every 30s, state-change logging, alert if >10
        - stale patches >15m, move-to-stuck via monitor (manual), alert
      outputs:
        - patch-executor-status.json (debounced)
        - atomic summaries (ROOT/.logs/*.summary.md + .backup)
        - events to ROOT/.logs/patch-events.log
      guarantees:
        - Atomic temp → final summary with backup + hash logging
        - Fallback log if unified log fails; critical alert file generated
    - name: Unified Patch Monitor
      path: "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/unified-patch-monitor.js"
      role: Correlates alerts, maintains dashboards, stuck-patch view, dedupes alerts (UUID)
      outputs:
        - unified-monitor-status.json (30s)
        - dashboard-alerts.json (recent 50)
        - stuck-patches-dashboard.json (actions: force_retry|move_to_failed|delete_patch|manual_review)
      guarantees:
        - Duplicate alert suppression (5 min window), UUID correlation
        - Local fallback alerts if Slack fails

  ports_urls:
    local:
      dashboard: "http://localhost:8787"
      ghost_runner_health: "http://localhost:5051/health"
      webhook_flask: "http://localhost:5555/health" # reserved, not used
    external:
      cloudflare_tunnel: "https://gpt-cursor-runner.thoughtmarks.app/api/status"
      fly_health: "https://gpt-cursor-runner.fly.dev/health"
      slack_webhook: "https://hooks.slack.com/services/... (via SecretsKeeper)"

  lifecycle:
    1_patch_creation:
      sources: [BRAIN, COACH, Slack]
      instruction_format:
        wrapper: { role: command_patch, target: MAIN|CYOPS, blockId?: string, version?: string }
        body: "mutations/shell optional, patch content or patterns, metadata"
    2_detection_bridge:
      watch:
        - GPT messages (via relay process)
        - Slack incoming messages (webhook-thoughtmarks)
      parse: "extractCodeBlocks() → tryParseJSON → tryParseYAML"
      validate: "validatePatch(patch): role+target required"
      route: "MAIN → MAIN/patches; CYOPS|DEV → CYOPS/patches"
      write: "atomic temp → final; events logged"
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
      watchdogs: "restart bridge/executor if heartbeat >60s stale; cap 2 restarts/5min"
      log_failure: "fallback files + CRITICAL_ALERT written; processing pause until writable"
      stuck_patches: ".stuck/ surfaced on dashboard; manual actions available"

  pause_on_log_failure:
    description: "Hard gate to prevent processing when unified logs are not writable"
    flags:
      inject_failure: "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/INJECT_LOG_FAILURE"
      allow_proceed: "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ALLOW_PROCEED"
    behavior:
      - "If INJECT_LOG_FAILURE exists or a real write error occurs, bridge/executor set pause state"
      - "Processing resumes automatically when logs writable, or immediately if ALLOW_PROCEED exists"
    operator_usage:
      - "Create ALLOW_PROCEED to override pause state once you have inspected disk/logs"
      - "Remove INJECT_LOG_FAILURE after testing; delete ALLOW_PROCEED to return to auto-resume behavior"

  pm2_validation:
    purpose: "Validate watchdog-driven restart behavior without blocking terminal"
    commands_non_blocking:
      - "{ timeout 15s pm2 restart ghost-bridge & } >/dev/null 2>&1 & disown"
      - "{ timeout 15s pm2 restart patch-executor & } >/dev/null 2>&1 & disown"
      - "{ timeout 15s pm2 logs --lines 30 ghost-bridge & } >/dev/null 2>&1 & disown"
    expected:
      - "Heartbeats age resets in ROOT/.logs/*status.json"
      - "patch-events.log shows restart events within 60s"

  validation_scenarios:
    scripts:
      - "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/validate-rotation-slack-watchdog-main-cyops.js"
      - "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/validate-log-failure-and-stuck.js"
      - "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/validate-pm2-restart-heartbeats.js"
      - "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/validate-executor-pause-processed-summary.js"
    proofs:
      log_file: "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/validation-tests.log"
      look_for:
        - "PASS: Bridge paused on injected log failure"
        - "PASS: Bridge resumed with ALLOW_PROCEED"
        - "PASS: Executor resume path invoked with ALLOW_PROCEED"
        - "PASS: Executor processed patch after ALLOW_PROCEED"
        - "PASS: Summary created for processed patch" | "PASS: Summary found by content match"
        - "CMD: { timeout 15s pm2 restart ghost-bridge & } >/dev/null 2>&1 & disown"
    stuck_dashboard:
      file: "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/stuck-patches-dashboard.json"
      actions: [force_retry, move_to_failed, delete_patch, manual_review]

  directories_watchers:
    root_logs: "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/"
    cyops_patches: "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/" # executor watches
    main_patches: "/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/"   # BRAUN executor
    cyops_summaries: "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/"
    main_summaries: "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/"

  yaml_json_parity:
    acceptance: "Both bridges and executors operate on JSON patch files but accept YAML via bridge which serializes to JSON"
    wrapper_required: "role: command_patch + target required"

  monitoring_matrix:
    heartbeat_intervals_seconds: 30
    heartbeat_stale_threshold_seconds: 60
    queue_depth_alert_threshold: 10
    stale_patch_threshold_minutes: 15
    log_rotate_mb: 5
    rotated_files_max: 10
    rapid_rotation_alert_per_hour: 3

  failure_modes:
    - name: Ghost Bridge down
      detection: "no heartbeat >60s"
      action: "watchdog restart (≤2/5min), alert"
    - name: Executor hang
      detection: "no heartbeat >60s, no queue movement"
      action: "watchdog restart, stale detection, requeue"
    - name: Log write failure
      detection: "writeUnifiedLog() exception"
      action: "fallback log + CRITICAL_ALERT; pause processing until writable"
    - name: Slack outage
      detection: "sendSlackAlert() promise rejected"
      action: "LOCAL_ALERTS + dashboard entry, retry"
    - name: Summary corruption
      detection: "atomic write path verify; backup always kept"
      action: "retry up to 3x; alert; manual review via dashboard"

  remote_ops:
    without_localhost:
      view_health:
        - ROOT/.logs/*status.json
        - dashboard-alerts.json, LOCAL_ALERTS
        - patch-events.log, unified-monitor.log
      place_patch:
        - Post wrapped patch via Slack or chat; bridge serializes YAML→JSON into patches/
      verify_execution:
        - watch patches/.completed or .failed; check matching summary in ROOT/.logs/*.summary.md

  manual_controls:
    restart:
      ghost_bridge: "pm2 restart ghost-bridge (watchdog will also act)"
      executor: "pm2 restart patch-executor"
      monitor: "pm2 restart unified-patch-monitor"
    emergency:
      make_alert: "touch ROOT/.logs/CRITICAL_ALERT with message"
      unblock_logs: "ensure ROOT/.logs writable; rotation purged to <10 backups"

  operator_checklist:
    - Confirm heartbeats present and fresh (<60s)
    - Confirm ROOT/.logs writable; no rapid rotation alerts
    - Confirm queue depth acceptable (<10)
    - Confirm no stuck patches or handle via dashboard actions
    - Confirm Slack/LOCAL_ALERTS show recent activity

  appendix:
    files:
      - scripts/ghost-bridge-simple.js
      - patch_executor_daemon.py
      - scripts/unified-patch-monitor.js
      - scripts/validate-patch-runner.js
    notes:
      - All absolute paths begin with /Users/sawyer/gitSync/
      - All background commands must use non-blocking patterns with timeout + disown
```
