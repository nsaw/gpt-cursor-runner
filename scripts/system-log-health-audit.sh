#!/bin/bash
set -euo pipefail

LOG_FILE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/webhook-delivery-ops.log"
AUDIT_LOG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/system-log-health-audit.log"

echo "[🔍 SYSTEM LOG HEALTH AUDIT STARTED] $(date)" > "$AUDIT_LOG"

# Log freshness
if test -f "$LOG_FILE"; then
  echo "[✅ LOG FILE PRESENT] $LOG_FILE" >> "$AUDIT_LOG"
  MODIFIED=$(stat -f %m "$LOG_FILE")
  NOW=$(date +%s)
  DELTA=$((NOW - MODIFIED))
  echo "[📅 MODIFIED SECONDS AGO] $DELTA seconds" >> "$AUDIT_LOG"
  if [[ $DELTA -gt 60 ]]; then
    echo "[⚠️ STALE LOG FILE DETECTED]" >> "$AUDIT_LOG"
  else
    echo "[✅ LOG FRESHNESS PASS]" >> "$AUDIT_LOG"
  fi
else
  echo "[❌ LOG FILE MISSING] $LOG_FILE" >> "$AUDIT_LOG"
fi

# Marker consistency
for marker in "DELIVERY OPS ACTIVE" "MONITOR PASS" "ALERT WATCH ACTIVE"; do
  if grep -q "$marker" "$LOG_FILE"; then
    echo "[✅ MARKER FOUND] $marker" >> "$AUDIT_LOG"
  else
    echo "[❌ MISSING MARKER] $marker" >> "$AUDIT_LOG"
  fi
done

echo "[✅ SYSTEM LOG HEALTH AUDIT COMPLETE] $(date)" >> "$AUDIT_LOG" 