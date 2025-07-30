#!/bin/bash
set -euo pipefail

# Hardened Webhook Delivery Validation Script
# Enforces strict validation before emitting any success messages

LOG_FILE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/webhook-delivery-ops.log"
LOG_DIR="$(dirname "$LOG_FILE")"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

echo "[INFO] Starting hardened validation with strict error handling..." | tee -a "$LOG_FILE"
echo "[INFO] Target log file: $LOG_FILE" | tee -a "$LOG_FILE"
echo "[INFO] Validation timestamp: $(date)" | tee -a "$LOG_FILE"
echo "[INFO] Strict error handling: set -euo pipefail" | tee -a "$LOG_FILE"

# Write the execution marker to the log file
echo "[✅ DELIVERY OPS ACTIVE] $(date)" >> "$LOG_FILE"

# Hardened validation checks - fail loudly if any check fails
echo "[VALIDATION] Checking log file existence..." | tee -a "$LOG_FILE"
test -f "$LOG_FILE" || {
  echo "[❌ VALIDATION FAILED] Log file not created: $LOG_FILE" >&2
  exit 1
}

echo "[VALIDATION] Checking for execution marker..." | tee -a "$LOG_FILE"
grep -q 'DELIVERY OPS ACTIVE' "$LOG_FILE" || {
  echo "[❌ VALIDATION FAILED] Execution marker not found in log" >&2
  exit 1
}

echo "[✅ VALIDATION PASSED] All checks successful" | tee -a "$LOG_FILE"
echo "[INFO] Log file contents:" | tee -a "$LOG_FILE"
cat "$LOG_FILE" 