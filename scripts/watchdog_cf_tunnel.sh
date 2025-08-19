#!/usr/bin/env bash
# Checks cloudflared; if missing, run repair script once (finite).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"
mkdir -p summaries
log="summaries/watchdog-cf-$(date +%Y%m%d-%H%M%S).log"

if pgrep -fl "cloudflared" >/dev/null 2>&1; then
  echo "[watchdog_cf_tunnel] cloudflared appears present" | tee -a "$log"
  exit 0
fi

echo "[watchdog_cf_tunnel] cloudflared down; attempting repair-cf-tunnel.sh" | tee -a "$log"
if [[ -f "scripts/repair-cf-tunnel.sh" ]]; then
  timeout 30s bash "scripts/repair-cf-tunnel.sh" & disown || true
  echo "[watchdog_cf_tunnel] repair triggered" | tee -a "$log"
else
  echo "[watchdog_cf_tunnel] missing scripts/repair-cf-tunnel.sh" | tee -a "$log"
  exit 1
fi
