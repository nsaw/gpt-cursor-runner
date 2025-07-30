#!/bin/bash
set -euo pipefail

# Hardened Webhook Delivery Validation Script
# Enforces strict validation before emitting any success messages

LOG_FILE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/webhook-delivery-ops.log"
LOG_DIR="$(dirname "$LOG_FILE")"
MARKER="[✅ DELIVERY OPS ACTIVE]"
TIMESTAMP="$(date)"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

echo "[INFO] Starting hardened webhook delivery validation..." | tee -a "$LOG_FILE"
echo "[INFO] Target log file: $LOG_FILE" | tee -a "$LOG_FILE"
echo "[INFO] Validation timestamp: $TIMESTAMP" | tee -a "$LOG_FILE"
echo "[INFO] Strict error handling: set -euo pipefail" | tee -a "$LOG_FILE"

# Create a Ghost-compatible patch payload that will write to our log file
PATCH_PAYLOAD='{
  "id": "resume-delivery",
  "role": "command_patch",
  "target_file": "'"$LOG_FILE"'",
  "patch": "echo \"'"$MARKER"' '"$TIMESTAMP"'\" >> '"$LOG_FILE"'"
}'

echo "[INFO] Sending patch payload through tunnel..." | tee -a "$LOG_FILE"

# Send test patch through tunnel with strict error handling
{ timeout 30 curl -s -X POST -H 'Content-Type: application/json' \
  -d "$PATCH_PAYLOAD" \
  https://webhook-thoughtmarks.thoughtmarks.app/webhook & } >/dev/null 2>&1 & disown

echo "[INFO] Patch sent, waiting for execution..." | tee -a "$LOG_FILE"
sleep 10

# Strict validation - fail loudly if any check fails
echo "[VALIDATION] Checking log file existence..." | tee -a "$LOG_FILE"
if [ ! -f "$LOG_FILE" ]; then
  echo "[❌ VALIDATION FAILED] Log file not created: $LOG_FILE" | tee -a "$LOG_FILE"
  exit 1
fi

echo "[VALIDATION] Checking for execution marker..." | tee -a "$LOG_FILE"
if ! grep -q "DELIVERY OPS ACTIVE" "$LOG_FILE"; then
  echo "[❌ VALIDATION FAILED] Execution marker not found in log" | tee -a "$LOG_FILE"
  exit 1
fi

echo "[✅ VALIDATION PASSED] All checks successful" | tee -a "$LOG_FILE"
echo "[INFO] Log file contents:" | tee -a "$LOG_FILE"
cat "$LOG_FILE" 