#!/bin/bash
set -euo pipefail

# System-wide Delivery Validation Monitoring
# Enforces delivery success monitoring and optimism suppression

LOG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/webhook-delivery-ops.log"
LOG_DIR="$(dirname "$LOG")"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

echo "[🔍 MONITORING STARTED] $(date)" >> "$LOG"
echo "[INFO] System-wide validation monitoring initiated" >> "$LOG"
echo "[INFO] Target log file: $LOG" >> "$LOG"
echo "[INFO] Strict error handling: set -euo pipefail" >> "$LOG"

# Run validations with explicit failure handling
echo "[VALIDATION] Checking log file existence..." >> "$LOG"
test -f "$LOG" || {
  echo "[❌] Log missing: $LOG" >&2
  exit 1
}

echo "[VALIDATION] Checking for delivery marker..." >> "$LOG"
grep -q 'DELIVERY OPS ACTIVE' "$LOG" || {
  echo "[❌] Marker missing in: $LOG" >&2
  exit 2
}

echo "[VALIDATION] Checking process status..." >> "$LOG"
ps aux | grep cloudflared | grep -v grep >/dev/null || {
  echo "[❌] cloudflared process not running" >&2
  exit 3
}

ps aux | grep ghost-runner | grep -v grep >/dev/null || {
  echo "[❌] ghost-runner process not running" >&2
  exit 4
}

echo "[✅ MONITOR PASS] $(date) — Delivery system validated." >> "$LOG"
echo "[INFO] All validation checks passed successfully" >> "$LOG"
echo "[INFO] System-wide monitoring complete" >> "$LOG" 
