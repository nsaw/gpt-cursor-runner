#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"
mkdir -p summaries

PASS=true
SUMMARY="summaries/patch-v2.0.210(P2.10.00)_nb2-consolidated-hardening-and-watchdogs.summary.md"
PRE="summaries/pm2-status.v2.0.210.pre.json"
POST="summaries/pm2-status.v2.0.210.post.json"

# Utilities required by NB-2.0 from prior patch
EXPECT=( \
  write_text_file_once.js \
  pm2_restart_update_env_once.js \
  health_server_once.js \
  dev_runtime_check_once.js \
  ghost_shell_restart_once.js \
  pid_file_update_once.js \
  pid_list_once.js \
  pid_stop_once.js \
  log_file_get_once.js \
)

found_map=()
missing=()
for f in "${EXPECT[@]}"; do
  # Check if file exists in scripts/g2o/
  if [[ -f "scripts/g2o/${f}" ]]; then
    found_map+=("$f -> scripts/g2o/${f}")
  else
    missing+=("$f")
    PASS=false
  fi
done

# 1) PM2 pre snapshot
if command -v pm2 >/dev/null 2>&1; then
  pm2 jlist > "$PRE" || true
else
  echo '{"pm2":"not-installed"}' > "$PRE"
fi

# 2) Repo-wide node -e scan (regressions outside scripts/)
bash scripts/nb2_scan_inline_nodee.sh || true
SCAN_LAST="$(ls -1t summaries/nb2-scan-nodee-* 2>/dev/null | head -n1 || true)"
SCAN_COUNT=0
if [[ -n "${SCAN_LAST:-}" && -s "$SCAN_LAST" ]]; then
  SCAN_COUNT=$(wc -l < "$SCAN_LAST" | tr -d '[:space:]')
  # Any nonzero occurrences are failures
  if [[ "$SCAN_COUNT" -gt 0 ]]; then PASS=false; fi
fi

# 3) One-shot watchdog kicks (finite, safe timeouts)
timeout 30s bash scripts/watchdog_ghost_bridge.sh & disown || true
timeout 30s bash scripts/watchdog_cf_tunnel.sh & disown || true

# 4) DEV runtime check (if available)
if [[ -f "scripts/dev_runtime_check_once.js" ]]; then
  node "scripts/dev_runtime_check_once.js" || PASS=false
fi

# 5) PM2 post snapshot
if command -v pm2 >/dev/null 2>&1; then
  pm2 jlist > "$POST" || true
else
  echo '{"pm2":"not-installed"}' > "$POST"
fi

# Compose summary (written by DEV/Cursor, not GPT)
{
  echo "# NB-2.0 Consolidated Validation (v2.0.210)"
  echo
  echo "## Utilities presence (9/9 expected)"
  if ((${#found_map[@]})); then
    for line in "${found_map[@]}"; do echo "- $line"; done
  else
    echo "- none found"
  fi
  echo
  echo "## Missing utilities"
  if ((${#missing[@]})); then
    for m in "${missing[@]}"; do echo "- $m"; done
  else
    echo "- none"
  fi
  echo
  echo "## Inline 'node -e' repo scan"
  echo "- scan file: ${SCAN_LAST:-none}"
  echo "- occurrences: ${SCAN_COUNT}"
  echo
  echo "## PM2 snapshots"
  echo "- pre:  $(basename "$PRE")"
  echo "- post: $(basename "$POST")"
  echo
  echo "## Watchdogs (one-shot)"
  echo "- ghost bridge: triggered"
  echo "- cloudflare:   triggered"
  echo
  echo "## Dashboard state"
  echo "- Status: pending — GREEN gate requires user/dashboard confirmation"
  echo
  if $PASS; then
    echo "AGENT_VALIDATION: PASS"
  else
    echo "AGENT_VALIDATION: FAIL"
  fi
  echo
  echo "> 🔗 This summary relates to: patchName: [patch-v2.0.210(P2.10.00)_nb2-consolidated-hardening-and-watchdogs]"
  echo "> 📍 Roadmap Phase: Phase 2 of ROADMAP_FOR_DUMMIES.md"
} > "$SUMMARY"

$PASS
