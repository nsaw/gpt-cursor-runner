#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"
mkdir -p summaries

PASS=true
SUMMARY="summaries/patch-v2.0.211(P2.10.01)_nb2-precommit-preflight-watchdogs-env-portfree.summary.md"

# 1) Verify pre-commit hook installation
if [[ ! -L ".git/hooks/pre-commit" ]]; then
  echo "[validate] pre-commit hook is not a symlink" >&2
  PASS=false
else
  target="$(readlink ".git/hooks/pre-commit" || true)"
  [[ "$target" == "../../scripts/nb2_precommit_guard.sh" ]] || PASS=false
fi

# 2) Run repo scan; any findings → FAIL
bash scripts/nb2_scan_inline_nodee.sh || true
SCAN_LAST="$(ls -1t summaries/nb2-scan-nodee-* 2>/dev/null | head -n1 || true)"
SCAN_COUNT=0
if [[ -n "${SCAN_LAST:-}" && -s "$SCAN_LAST" ]]; then
  SCAN_COUNT=$(wc -l < "$SCAN_LAST" | tr -d '[:space:]')
  [[ "$SCAN_COUNT" -eq 0 ]] || PASS=false
fi

# 3) Preflight (watchdogs, pm2 pre/post, optional runtime check)
timeout 30s bash scripts/watchdog_ghost_bridge.sh & disown || true
timeout 30s bash scripts/watchdog_cf_tunnel.sh & disown || true
bash scripts/pm2_health_report.sh "v2.0.211.pre"
[[ -f scripts/dev_runtime_check_once.js ]] && node scripts/dev_runtime_check_once.js || true
bash scripts/pm2_health_report.sh "v2.0.211.post"

# 4) Port-free helper dry run (no listener required)
bash scripts/port_free_once.sh 8081 || true

# 5) Env compare report
bash scripts/env/env_verify_compare.sh || true
ENV_REPORT="$(ls -1t summaries/env-compare-* 2>/dev/null | head -n1 || true)"

# 6) Compose summary (written by DEV/runner)
{
  echo "# NB-2.0 Batch Validation — v2.0.211"
  echo
  echo "## Git hook"
  if [[ -L ".git/hooks/pre-commit" ]]; then
    echo "- pre-commit hook installed → $(readlink .git/hooks/pre-commit)"
  else
    echo "- pre-commit hook: MISSING"
  fi
  echo
  echo "## Inline 'node -e' repo scan"
  echo "- scan file: ${SCAN_LAST:-none}"
  echo "- occurrences: ${SCAN_COUNT}"
  echo
  echo "## Watchdogs (one-shot)"
  echo "- ghost bridge: triggered"
  echo "- cloudflare:   triggered"
  echo
  echo "## PM2 snapshots"
  echo "- pre:  pm2-status.v2.0.211.pre.json"
  echo "- post: pm2-status.v2.0.211.post.json"
  echo
  echo "## Port helper"
  echo "- port_free_once: executed for 8081 (idempotent)"
  echo
  echo "## Env compare"
  echo "- report: $(basename "${ENV_REPORT:-none}")"
  echo
  if $PASS; then
    echo "AGENT_VALIDATION: PASS"
  else
    echo "AGENT_VALIDATION: FAIL"
  fi
  echo
  echo "> 🔗 This summary relates to: patchName: [patch-v2.0.211(P2.10.01)_nb2-precommit-preflight-watchdogs-env-portfree]"
  echo "> 📍 Roadmap Phase: Phase 2 of ROADMAP_FOR_DUMMIES.md"
} > "$SUMMARY"

$PASS
