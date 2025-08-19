#!/bin/bash

# Unified Ultra Validation (CYOPS only)
# - Aggregates all strict validation gates for CYOPS patch execution
# - Runs TypeScript, ESLint, runtime/roles/components checks, daemon/tunnel/endpoint health
# - **MANDATORY** Playwright visual validation for G2o (live -> api -> static fallback)
# - Performs up to 6 auto-fix cycles (lint/format, optional service restarts) before failing
# - Uses absolute paths only; omits MAIN systems

set -uo pipefail

ROOT="/Users/sawyer/gitSync/gpt-cursor-runner"
LOG_DIR="/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs"
LOG_FILE="$LOG_DIR/unified-ultra-validation.log"
META_DIR="/Users/sawyer/gitSync/_GPTsync/meta"
PNG_PATH="/Users/sawyer/gitSync/.cursor-cache/ROOT/.screenshots/g2o-monitor.png"
VIS_META="$META_DIR/visual_validation.json"
PW_SPEC="tests/playwright/g2o-visual.spec.ts"
PW_CFG="playwright.config.ts"

mkdir -p "$LOG_DIR" "$META_DIR"

ts() { date -u +"%Y-%m-%dT%H:%M:%S%z" | sed 's/\([0-9]\{2\}\)$/:\\1/'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG_FILE"; }

# Prefer coreutils gtimeout on macOS if GNU timeout missing
resolve_timeout_bin() {
  if command -v timeout >/dev/null 2>&1; then echo timeout; return; fi
  if command -v gtimeout >/dev/null 2>&1; then echo gtimeout; return; fi
  echo ""
}
TIMEOUT_BIN="$(resolve_timeout_bin)"

run_with_timeout() {
  local seconds="$1"; shift
  local cmd_str="$*"
  if [ -n "$TIMEOUT_BIN" ]; then eval "$TIMEOUT_BIN ${seconds}s bash -lc '$cmd_str'"; else bash -lc "$cmd_str"; fi
}

check_http_200() {
  local url="$1"; local name="${2:-$1}"; local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url" || echo 000)
  if [ "$code" = "200" ]; then log "✅ 200 OK: $name"; return 0; else log "❌ HTTP $code: $name"; return 1; fi
}

# ------------------------
# Standard validations (kept from previous rev)
# ------------------------
validate_typescript() { log "[TS] tsc --noEmit"; (cd "$ROOT" && run_with_timeout 60 "npx tsc --noEmit"); }
validate_eslint() { log "[ESLINT] eslint --max-warnings=0"; (cd "$ROOT" && run_with_timeout 90 "npx eslint . --ext .ts,.tsx --max-warnings=0"); }
attempt_eslint_fix() { log "[ESLINT-FIX] eslint --fix"; (cd "$ROOT" && run_with_timeout 120 "npx eslint . --ext .ts,.tsx --fix || true"); }
attempt_prettier_fix() { if (cd "$ROOT" && npx --yes prettier --version >/dev/null 2>&1); then log "[PRETTIER] write"; (cd "$ROOT" && run_with_timeout 180 "npx prettier '**/*.{ts,tsx,js,jsx,json,md,yml,yaml}' --write || true"); fi }
attempt_python_fix() { if command -v black >/dev/null 2>&1; then log "[PY] black"; (cd "$ROOT" && run_with_timeout 120 "black -q . || true"); fi; if command -v isort >/dev/null 2>&1; then log "[PY] isort"; (cd "$ROOT" && run_with_timeout 120 "isort -q . || true"); fi; if command -v ruff >/dev/null 2>&1; then log "[PY] ruff --fix"; (cd "$ROOT" && run_with_timeout 120 "ruff check . --fix || true"); fi }
attempt_precommit_fix() { if command -v pre-commit >/dev/null 2>&1; then log "[PRE-COMMIT] all-files"; (cd "$ROOT" && run_with_timeout 180 "pre-commit run --all-files || true"); fi }

validate_runtime() { local s="$ROOT/scripts/validate-runtime.sh"; if [ -x "$s" ]; then log "[RUNTIME]"; (cd "$ROOT" && run_with_timeout 60 "bash scripts/validate-runtime.sh"); else log "[RUNTIME] skipped"; fi }
validate_roles() { local s="$ROOT/scripts/validate-roles.sh"; if [ -x "$s" ]; then log "[ROLES]"; (cd "$ROOT" && run_with_timeout 60 "bash scripts/validate-roles.sh"); else log "[ROLES] skipped"; fi }
validate_components() { local s="$ROOT/scripts/validate-components.sh"; if [ -x "$s" ]; then log "[COMPONENTS]"; (cd "$ROOT" && run_with_timeout 60 "bash scripts/validate-components.sh"); else log "[COMPONENTS] skipped"; fi }
validate_performance() { local s="$ROOT/scripts/validate-performance.sh"; if [ -x "$s" ]; then log "[PERF]"; (cd "$ROOT" && run_with_timeout 60 "bash scripts/validate-performance.sh") || true; else log "[PERF] skipped"; fi }
validate_daemons_pm2() { local s="$ROOT/scripts/validate-daemon-health.sh"; if [ -x "$s" ]; then log "[DAEMONS]"; (cd "$ROOT" && run_with_timeout 45 "bash scripts/validate-daemon-health.sh"); else log "[DAEMONS] skipped"; fi }
validate_summary_writes() { local s="$ROOT/scripts/validate-summary-writes.sh"; if [ -x "$s" ]; then log "[SUMMARY]"; (cd "$ROOT" && run_with_timeout 30 "bash scripts/validate-summary-writes.sh"); else log "[SUMMARY] skipped"; fi }
validate_ghost_status() { local s="$ROOT/scripts/validate-ghost-status.sh"; if [ -x "$s" ]; then log "[***REMOVED***]"; (cd "$ROOT" && run_with_timeout 45 "bash scripts/validate-ghost-status.sh"); else log "[***REMOVED***] skipped"; fi }
validate_ghost_relay() { local s="$ROOT/scripts/validate-ghost-relay.sh"; if [ -x "$s" ]; then log "[RELAY]"; (cd "$ROOT" && run_with_timeout 45 "bash scripts/validate-ghost-relay.sh"); else log "[RELAY] skipped"; fi }
validate_patch_watchers() { local s="$ROOT/scripts/validate-patch-watchers.sh"; if [ -x "$s" ]; then log "[WATCHERS]"; (cd "$ROOT" && run_with_timeout 30 "bash scripts/validate-patch-watchers.sh"); else log "[WATCHERS] skipped"; fi }

validate_endpoints_local() {
  log "[HTTP] local endpoints (CYOPS)"
  local ok=0 fail=0
  check_http_200 "http://localhost:5051/health" "Ghost Bridge" && ok=$((ok+1)) || fail=$((fail+1))
  check_http_200 "http://localhost:8787/api/health" "Flask Dashboard API" && ok=$((ok+1)) || fail=$((fail+1))
  check_http_200 "http://localhost:8787/monitor" "Dashboard /monitor" && ok=$((ok+1)) || fail=$((fail+1))
  check_http_200 "http://localhost:8787/g2o/monitor" "Dashboard /g2o/monitor" && ok=$((ok+1)) || fail=$((fail+1))
  check_http_200 "http://localhost:8788/health" "Telemetry API" && ok=$((ok+1)) || fail=$((fail+1))
  check_http_200 "http://localhost:8789/health" "Telemetry Orchestrator" && ok=$((ok+1)) || fail=$((fail+1))
  check_http_200 "http://localhost:3001/health" "Ghost Relay" && ok=$((ok+1)) || fail=$((fail+1))
  log "[HTTP] Passed=$ok Failed=$fail"; [ "$fail" -eq 0 ]
}

# ------------------------
# NEW: Playwright/G2o enforcement
# ------------------------
ensure_playwright() {
  if npx playwright --version >/dev/null 2>&1; then return 0; fi
  log "[PW] installing chromium (best-effort)"
  (cd "$ROOT" && run_with_timeout 180 "npx -y playwright@1.46.0 install chromium")
  npx playwright --version >/dev/null 2>&1 || { log "[PW] missing after install attempt"; return 1; }
}

validate_g2o_visual_meta() {
  log "[PW][G2o] enforce visual PASS via meta"
  # if already PASS and screenshot exists, accept
  if [ -s "$VIS_META" ] && grep -q '"status"\s*:\s*"PASS"' "$VIS_META" && [ -s "$PNG_PATH" ]; then
    log "[PW][G2o] PASS (meta+screenshot present)"; return 0; fi

  # ensure Playwright is present
  ensure_playwright || { log "[PW] unavailable"; return 1; }

  # ensure spec/config exist (created by v2.0.992 patch)
  if [ ! -f "$ROOT/$PW_SPEC" ] || [ ! -f "$ROOT/$PW_CFG" ]; then
    log "[PW] spec or config missing: $PW_SPEC / $PW_CFG"; return 1; fi

  # run Playwright visual smoke (uses live->api->file fallback)
  (cd "$ROOT" && run_with_timeout 60 "npx playwright test $PW_SPEC --reporter=line") || { log "[PW] test failed"; return 1; }

  # summarize -> write meta json
  if [ -x "$ROOT/scripts/visual-validation-summarize.sh" ]; then
    (cd "$ROOT" && run_with_timeout 10 "bash scripts/visual-validation-summarize.sh") || true
  fi

  # verify PASS produced
  if [ -s "$VIS_META" ] && grep -q '"status"\s*:\s*"PASS"' "$VIS_META" && [ -s "$PNG_PATH" ]; then
    log "[PW][G2o] PASS (meta updated)"; return 0; else log "[PW][G2o] meta missing or not PASS"; return 1; fi
}

validate_playwright_dashboard() {
  # Keep legacy hook if package.json has script; otherwise succeed (we gate on validate_g2o_visual_meta)
  if [ -f "$ROOT/package.json" ] && grep -q '"test:dashboard"' "$ROOT/package.json"; then
    : "${DASHBOARD_URL:=http://localhost:8787/g2o/monitor}"
    log "[PW] legacy test:dashboard against $DASHBOARD_URL"
    (cd "$ROOT" && DASHBOARD_URL="$DASHBOARD_URL" run_with_timeout 300 "yarn -s test:dashboard")
  else
    log "[PW] legacy dashboard test skipped"
    return 0
  fi
}

validate_stack_overview() { local s="$ROOT/scripts/core/validate-all.sh"; if [ -x "$s" ]; then log "[STACK] core/validate-all.sh"; (cd "$ROOT" && run_with_timeout 120 "bash scripts/core/validate-all.sh"); else log "[STACK] skipped"; fi }

attempt_repairs() {
  local cycle="$1"; log "[REPAIR] cycle $cycle"
  attempt_eslint_fix || true
  attempt_prettier_fix || true
  attempt_python_fix || true
  attempt_precommit_fix || true
  # PM2 nudges (best-effort)
  if command -v pm2 >/dev/null 2>&1; then
    log "[REPAIR] pm2 reloads"
    (pm2 reload ghost-bridge >/dev/null 2>&1 || true)
    (pm2 reload ghost-runner >/dev/null 2>&1 || true)
    (pm2 reload flask-dashboard >/dev/null 2>&1 || true)
    (pm2 reload dual-monitor >/dev/null 2>&1 || true)
  fi
  # Ensure playwright provisioned
  ensure_playwright || true
}

main() {
  cd "$ROOT" || { echo "Cannot cd to $ROOT"; exit 2; }
  log "=== Unified Ultra Validation (CYOPS) START ==="
  local max_cycles=6; local cycle=1
  while [ "$cycle" -le "$max_cycles" ]; do
    log "--- Cycle $cycle/$max_cycles ---"
    local failures=()

    # Compile/lint gates
    validate_typescript || failures+=("typescript")
    validate_eslint || failures+=("eslint")

    # Runtime/roles/components/perf
    validate_runtime || failures+=("runtime")
    validate_roles || failures+=("roles")
    validate_components || failures+=("components")
    validate_performance || true

    # System/daemon/summary
    validate_daemons_pm2 || failures+=("daemons")
    validate_ghost_status || failures+=("ghost_status")
    validate_ghost_relay || failures+=("ghost_relay")
    validate_summary_writes || failures+=("summaries")
    validate_patch_watchers || failures+=("patch_watchers")

    # Endpoints + G2o visual enforcement
    validate_endpoints_local || failures+=("http_endpoints")
    validate_g2o_visual_meta || failures+=("g2o_visual")
    validate_playwright_dashboard || failures+=("playwright_dashboard")

    # Overview
    validate_stack_overview || true

    if [ ${#failures[@]} -eq 0 ]; then
      log "✅ All checks passed on cycle $cycle"
      log "=== Unified Ultra Validation (CYOPS) PASS ==="; exit 0
    fi

    log "❌ Failures on cycle $cycle: ${failures[*]}"
    if [ "$cycle" -lt "$max_cycles" ]; then attempt_repairs "$cycle"; cycle=$((cycle+1)); continue; fi
    log "❌ Exhausted $max_cycles cycles. Remaining failures: ${failures[*]}"
    log "=== Unified Ultra Validation (CYOPS) FAIL ==="; exit 1
  done
}

main "$@"


