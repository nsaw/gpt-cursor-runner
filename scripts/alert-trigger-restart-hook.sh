#!/bin/bash
set -euo pipefail

LOG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/webhook-delivery-ops.log"
TIMESTAMP=$(date)

{
  echo "[🔍 ALERT TRIGGER CHECK INITIATED] $TIMESTAMP"

  if grep -q '\[❌ TUNNEL MISSING\]' "$LOG"; then
    echo "[⚠️  TUNNEL ALERT] Restarting Cloudflare tunnel..."
    pkill -f cloudflared || true
    nohup cloudflared tunnel run webhook-tunnel --config /Users/sawyer/gitSync/gpt-cursor-runner/config/webhook-tunnel-config.yml &
    echo "[✅ TUNNEL RESTARTED] $(date)"
  fi

  if grep -q '\[❌ FLASK DOWN\]' "$LOG"; then
    echo "[⚠️  FLASK ALERT] Restarting Flask..."
    pkill -f gpt_cursor_runner || true
    nohup python3 -m gpt_cursor_runner.main &
    echo "[✅ FLASK RESTARTED] $(date)"
  fi

  if grep -q '\[❌ GHOST PORT DOWN\]' "$LOG"; then
    echo "[⚠️  GHOST ALERT] Restarting Ghost Runner..."
    pkill -f ghost-runner || true
    nohup node ghost-runner.js &
    echo "[✅ GHOST RESTARTED] $(date)"
  fi

  echo "[✅ ALERT RESPONSE COMPLETE] $(date)"
} >> "$LOG" 2>&1 
