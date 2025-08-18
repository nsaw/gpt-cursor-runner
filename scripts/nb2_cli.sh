#!/usr/bin/env bash
set -euo pipefail
cmd="${1:-help}"
case "$cmd" in
  scan)           bash scripts/nb2_scan_inline_nodee.sh ;;
  pm2)            bash scripts/pm2_health_report.sh "${2:-v2.0.211}" ;;
  ghost)          bash scripts/watchdog_ghost_bridge.sh ;;
  cf)             bash scripts/watchdog_cf_tunnel.sh ;;
  check)          node scripts/dev_runtime_check_once.js || exit 1 ;;
  install-hooks)  bash scripts/install_hooks_once.sh ;;
  free-port)      bash scripts/port_free_once.sh "${2:-8081}" ;;
  preflight)
    bash scripts/nb2_scan_inline_nodee.sh || true
    timeout 30s bash scripts/watchdog_ghost_bridge.sh & disown || true
    timeout 30s bash scripts/watchdog_cf_tunnel.sh & disown || true
    bash scripts/pm2_health_report.sh "v2.0.211.pre"
    [[ -f scripts/dev_runtime_check_once.js ]] && node scripts/dev_runtime_check_once.js || true
    bash scripts/pm2_health_report.sh "v2.0.211.post"
    ;;
  env-compare)    bash scripts/env/env_verify_compare.sh ;;
  security-scan)  bash scripts/nb2_security_scan.sh ;;
  ci-validate)    bash scripts/nb2_ci_validate.sh ;;
  dashboard-probe) node scripts/dashboard_probe_once.js ;;
  sweep-ports)    bash scripts/ports/sweep_free_once.sh "${@:2}" ;;
  *)
    cat <<EOF
nb2_cli.sh — NB-2.0 helpers
  scan          Scan repo for inline 'node -e' regressions
  pm2 [label]   Capture PM2 JSON snapshot to summaries/
  ghost         One-shot ghost/runner watchdog
  cf            One-shot Cloudflare tunnel watchdog
  check         Run dev runtime check (if present)
  install-hooks Install NB-2.0 git hooks (pre-commit)
  free-port [p] Free TCP port (default 8081)
  preflight     Run NB-2.0 preflight (scan, watchdogs, PM2 pre/post, optional runtime check)
  env-compare   Compare .env against .env.template (structure only)
  security-scan  Flag risky shell patterns (whitelist via 'NB2-ALLOW')
  ci-validate    Run tsc/eslint/tests if present (finite)
  dashboard-probe Probe \$DASHBOARD_URL and write status JSON
  sweep-ports [p..] Free a list of TCP ports (defaults to 8081)
EOF
  ;;
esac
