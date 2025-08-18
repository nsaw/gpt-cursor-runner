#!/usr/bin/env bash
set -euo pipefail
cmd="${1:-help}"
case "$cmd" in
  scan)   bash scripts/nb2_scan_inline_nodee.sh ;;
  pm2)    bash scripts/pm2_health_report.sh "${2:-v2.0.210}" ;;
  ghost)  bash scripts/watchdog_ghost_bridge.sh ;;
  cf)     bash scripts/watchdog_cf_tunnel.sh ;;
  check)  node scripts/dev_runtime_check_once.js || exit 1 ;;
  *)
    cat <<EOF
nb2_cli.sh — NB-2.0 helpers
  scan          Scan repo for inline 'node -e' regressions
  pm2 [label]   Capture PM2 JSON snapshot to summaries/
  ghost         One-shot ghost/runner watchdog
  cf            One-shot Cloudflare tunnel watchdog
  check         Run dev runtime check (if present)
EOF
  ;;
esac
