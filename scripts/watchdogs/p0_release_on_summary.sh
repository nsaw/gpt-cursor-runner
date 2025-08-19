#!/usr/bin/env bash
set -euo pipefail
ROOTQ='/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches'
SUMS='/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries'
META='/Users/sawyer/gitSync/_GPTsync/meta'
LOG='/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/p0_release.log'
SEED='patch-v2.0.000(P0.00.01)_seed-tarignore.json'
ORDER=(
  'patch-v2.0.000(P0.00.01)_seed-tarignore.json'
  'patch-v2.0.000(P0.00.99)_hotpatch-executor-watchdog.json'
  'patch-v2.0.001(P0.01.01)_normalize-ports-and-health.json'
  'patch-v2.0.002(P0.01.02)_tunnel-failover-matrix.json'
  'patch-v2.0.003(P0.02.01)_unified-manager-lockdown.json'
  'patch-v2.0.004(P0.02.02)_watchdog-cap-and-grace.json'
  'patch-v2.0.005(P0.03.01)_bridge-contract-seed.json'
  'patch-v2.0.006(P0.03.02)_paths-and-logs-unification.json'
  'patch-v2.0.007(P0.99.01)_phase-freeze.json'
  'patch-v2.0.008(P0.99.02)_phase-green-marker.json'
  'patch-v2.0.009(P0.03.03)_logs-root-normalization.json'
  'patch-v2.0.010(P0.00.02)_promote-phase-patches.json'
  'patch-v2.0.300(P0.00.90)_multi-plane-agent-duality-bootstrap.json'
  'patch-v2.0.940(P0.00.95)_executor-pm2-service-install.json'
  'patch-v2.0.941(P0.00.94)_failed-corrupt-quarantine.json'
  'patch-v2.0.942(P0.00.93)_requeue-from-failed.json'
  'patch-v2.0.943(P0.00.92)_root-index-rebuild.json'
  'patch-v2.0.945(P0.00.90)_executor-live-mode-env.json'
  'patch-v2.0.946(P0.00.89)_summary-gate-auditor.json'
  'patch-v2.0.947(P0.00.88)_completed-scan-requeue.json'
  'patch-v2.0.948(P0.00.87)_summary-root-perms.json'
  'patch-v2.0.949(P0.00.86)_monitor-queue-counters-accurate.json'
  'patch-v2.0.950(P0.01.03)_dashboard-502-guardrails.json'
  'patch-v2.0.951(P0.01.04)_executor-env-persist-and-verify.json'
  'patch-v2.0.952(P0.01.05)_monitor-counters-wireup.json'
  'patch-v2.0.953(P0.01.06)_promote-monitor-dash-hotpatches.json'
  'patch-v2.0.964(P0.00.84)_priority-promote-surgical-fixes-and-bounce-missing-summaries.json'
  'patch-v2.0.968(P0.00.86)_handoff-close-the-loop.json'
)
interval=10
while true; do
  if [ -f "$META/queue_halt.P0_FAIL.json" ]; then sleep "$interval"; continue; fi
  for ((i=0; i<${#ORDER[@]}; i++)); do
    bn="${ORDER[$i]}"
    if [ "$bn" = "$SEED" ]; then continue; fi
    if [ -f "$ROOTQ/$bn.hold" ]; then
      ready=1
      prev=$((i-1))
      if [ "$prev" -ge 0 ]; then
        prevbn="${ORDER[$prev]}"
        prevbase="${prevbn%.json}"
        strict1="$SUMS/summary-$prevbn.md"
        strict2="$SUMS/summary-$prevbase.md"
        if [ ! -s "$strict1" ] && [ ! -s "$strict2" ]; then
          match=$(grep -l "$prevbase" "$SUMS"/summary-*.md 2>/dev/null | head -n1 || true)
          if [ -z "$match" ] || [ ! -s "$match" ]; then ready=0; fi
        fi
      fi
      if [ "$ready" -eq 1 ]; then
        mv "$ROOTQ/$bn.hold" "$ROOTQ/$bn"
        echo "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ) RELEASED $bn" >> "$LOG"
      fi
      break
    fi
  done
  sleep "$interval"
done
