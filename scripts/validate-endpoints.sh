#!/bin/bash

# Validate webhook endpoint execution through Cloudflare tunnel
TARGET_FILE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/webhook-final-execution.log"
LOG_DIR="$(dirname "$TARGET_FILE")"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

echo "[INFO] Starting webhook tunnel final execution test..." | tee -a "$TARGET_FILE"
echo "[INFO] Target log file: $TARGET_FILE" | tee -a "$TARGET_FILE"
echo "[INFO] Test timestamp: $(date)" | tee -a "$TARGET_FILE"

# Create a simple patch payload that will write to our log file
PATCH_PAYLOAD='{
  "id": "final-tunnel-confirm",
  "role": "command_patch",
  "target_file": "'"$TARGET_FILE"'",
  "patch": "echo \\\"[✅ FINAL EXECUTED THROUGH TUNNEL] $(date)\\\" >> '"$TARGET_FILE"'"
}'

echo "[INFO] Sending test patch through webhook tunnel..." | tee -a "$TARGET_FILE"
echo "[INFO] Payload: $PATCH_PAYLOAD" | tee -a "$TARGET_FILE"

# Send the request through the tunnel with proper non-blocking pattern
(
  echo "[INFO] Executing curl request at $(date)" >> "$TARGET_FILE"
  timeout 30 curl -s -X POST \
    -H 'Content-Type: application/json' \
    -d "$PATCH_PAYLOAD" \
    https://webhook-thoughtmarks.thoughtmarks.app/webhook \
    -w "\nHTTP_STATUS: %{http_code}\n" 2>&1
  echo "[INFO] Curl request completed at $(date)" >> "$TARGET_FILE"
) >> "$TARGET_FILE" 2>&1 &
CURL_PID=$!

echo "[INFO] Curl process started with PID: $CURL_PID" | tee -a "$TARGET_FILE"

# Wait for the request to complete
sleep 15

# Check if curl process is still running
if ps -p $CURL_PID > /dev/null 2>&1; then
  echo "[WARN] Curl process still running after 15s, killing..." | tee -a "$TARGET_FILE"
  kill $CURL_PID 2>/dev/null || true
else
  echo "[INFO] Curl process completed normally" | tee -a "$TARGET_FILE"
fi

# Check if the log file was written by Ghost
echo "[INFO] Checking for Ghost execution result..." | tee -a "$TARGET_FILE"
if [ -f "$TARGET_FILE" ]; then
  echo "[INFO] Log file exists, contents:" | tee -a "$TARGET_FILE"
  cat "$TARGET_FILE" | tee -a "$TARGET_FILE"
  
  if grep -q 'FINAL EXECUTED THROUGH TUNNEL' "$TARGET_FILE"; then
    echo "[✅ SUCCESS] Ghost executed the patch through the tunnel!" | tee -a "$TARGET_FILE"
    exit 0
  else
    echo "[❌ FAILURE] Log file exists but no execution confirmation found" | tee -a "$TARGET_FILE"
    exit 1
  fi
else
  echo "[❌ FAILURE] No log file written — tunnel or Ghost likely failed" | tee -a "$TARGET_FILE"
  exit 1
fi 