#!/bin/bash
set -euo pipefail

LOG_FILE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/daemon-watchdog.log"
WEBHOOK_LOG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/webhook-delivery-ops.log"

PORT_FLASK=5555
PORT_GHOST=5053
PID_TUNNEL=$(pgrep -f cloudflared || echo "")

{
  echo "[🚀 WATCHDOG INITIATED] $(date)"

  if [[ -z "$PID_TUNNEL" ]]; then
    echo "[❌ TUNNEL MISSING] No Cloudflare process detected"
    exit 1
  fi

  curl -s --max-time 5 http://localhost:$PORT_FLASK/health >/dev/null || {
    echo "[❌ FLASK DOWN] Health check failed"
    exit 1
  }

  lsof -i :$PORT_GHOST >/dev/null || {
    echo "[❌ GHOST PORT DOWN] Nothing listening on $PORT_GHOST"
    exit 1
  }

  grep -q "DELIVERY OPS ACTIVE" "$WEBHOOK_LOG" && echo "[✅ DELIVERY FLAG OK]"
  grep -q "MONITOR PASS" "$WEBHOOK_LOG" && echo "[✅ MONITOR FLAG OK]"
  grep -q "ALERT WATCH ACTIVE" "$WEBHOOK_LOG" && echo "[✅ ALERT FLAG OK]"

  echo "[✅ UNIFIED MONITOR PASSED] $(date)"
} >> "$LOG_FILE" 2>&1 