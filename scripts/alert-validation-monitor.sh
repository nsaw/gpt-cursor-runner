#!/bin/bash
set -euo pipefail

LOG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/webhook-delivery-ops.log"
MARKER="[✅ MONITOR PASS]"
ERROR_FLAG="[❌]"

# Start monitor loop
{
  echo "[⚙️ ALERT MONITOR STARTED] $(date)"
  while true; do
    if grep -q "$ERROR_FLAG" "$LOG"; then
      echo "[🚨 ALERT] Delivery validation failure detected at $(date)" >> "$LOG"
      break
    fi
    if grep -q "$MARKER" "$LOG"; then
      echo "[✅ ALERT WATCH ACTIVE] $(date) — Monitoring clean" >> "$LOG"
      break
    fi
    sleep 2
  done
} & disown 
