#!/usr/bin/env bash
set -euo pipefail
label="${1:-v2.0.210}"
mkdir -p summaries
if command -v pm2 >/dev/null 2>&1; then
  pm2 jlist > "summaries/pm2-status.${label}.json" || true
  echo "[pm2_health_report] wrote summaries/pm2-status.${label}.json"
else
  echo '{"pm2":"not-installed"}' > "summaries/pm2-status.${label}.json"
  echo "[pm2_health_report] pm2 not installed; wrote placeholder JSON"
fi
