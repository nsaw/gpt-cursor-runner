#!/bin/bash
set -euo pipefail

LOG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/unified-ghost-boot.log"
mkdir -p $(dirname "$LOG")

{
  echo "[BOOT START] $(date)"

  echo "Launching Cloudflare tunnel..."
  nohup cloudflared tunnel run webhook-tunnel --config /Users/sawyer/gitSync/gpt-cursor-runner/config/webhook-tunnel-config.yml &

  echo "Launching Flask daemon..."
  nohup python3 -m gpt_cursor_runner.main &

  echo "Launching Ghost Runner..."
  nohup node ghost-runner.js &

  sleep 3

  echo "Launching unified daemon watchdog..."
  nohup bash /Users/sawyer/gitSync/gpt-cursor-runner/scripts/daemon-unified-watchdog.sh &

  # 🔐 NEW: Start ghost-runner watchdog if not running
  echo "Launching ghost-runner watchdog..."
  chmod +x scripts/watchdogs/ghost-runner-watchdog.sh
  pgrep -f ghost-runner-watchdog.sh >/dev/null || {
    nohup scripts/watchdogs/ghost-runner-watchdog.sh monitor >/dev/null 2>&1 &
  }

  echo "[✅ UNIFIED BOOT COMPLETE] $(date)"
} >> "$LOG" 2>&1 