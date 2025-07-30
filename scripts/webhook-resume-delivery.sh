#!/bin/bash

# Resume Webhook Delivery Operations
# Tests the verified Cloudflare tunnel and Flask relay system

TARGET_FILE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/webhook-delivery-ops.log"
LOG_DIR="$(dirname "$TARGET_FILE")"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

echo "[INFO] Resuming webhook delivery operations..." | tee -a "$TARGET_FILE"
echo "[INFO] Target log file: $TARGET_FILE" | tee -a "$TARGET_FILE"
echo "[INFO] Test timestamp: $(date)" | tee -a "$TARGET_FILE"
echo "[INFO] Tunnel endpoint: https://webhook-thoughtmarks.thoughtmarks.app/webhook" | tee -a "$TARGET_FILE"

# Create a Ghost-compatible patch payload that will write to our log file
PATCH_PAYLOAD='{
  "id": "resume-delivery",
  "role": "command_patch",
  "target_file": "'"$TARGET_FILE"'",
  "patch": "echo \"[✅ DELIVERY OPS ACTIVE] $(date) - Webhook delivery system verified and operational\" >> '"$TARGET_FILE"'"
}'

echo "[INFO] Sending patch payload through verified tunnel..." | tee -a "$TARGET_FILE"

# Send the patch through the verified Cloudflare tunnel using non-blocking pattern
{ timeout 30 curl -s -X POST -H 'Content-Type: application/json' \
  -d "$PATCH_PAYLOAD" \
  https://webhook-thoughtmarks.thoughtmarks.app/webhook & } >/dev/null 2>&1 & disown

echo "[INFO] Patch sent, waiting for Ghost execution..." | tee -a "$TARGET_FILE"
sleep 10

# Check if the log file was created and contains the expected marker
if [ -f "$TARGET_FILE" ]; then
  echo "[INFO] Log file created successfully" | tee -a "$TARGET_FILE"
  echo "[INFO] Checking for delivery confirmation marker..." | tee -a "$TARGET_FILE"
  
  if grep -q "DELIVERY OPS ACTIVE" "$TARGET_FILE"; then
    echo "[✅] DELIVERY OPS ACTIVE marker found - webhook delivery system operational" | tee -a "$TARGET_FILE"
    echo "[✅] GPT → Ghost delivery pipeline verified and ready" | tee -a "$TARGET_FILE"
  else
    echo "[❌] DELIVERY OPS ACTIVE marker not found - delivery system may have issues" | tee -a "$TARGET_FILE"
  fi
  
  echo "[INFO] Full log contents:" | tee -a "$TARGET_FILE"
  cat "$TARGET_FILE"
else
  echo "[❌] webhook-delivery-ops.log not created — relay may still be broken" | tee -a "$TARGET_FILE"
  echo "[INFO] Checking if Flask app is responding..." | tee -a "$TARGET_FILE"
  
  # Test local Flask endpoint as fallback
  { timeout 30 curl -s -I http://localhost:5555/webhook & } >/dev/null 2>&1 & disown
  sleep 5
  curl -s -I http://localhost:5555/webhook | tee -a "$TARGET_FILE"
fi

echo "[INFO] Webhook delivery resume test completed" | tee -a "$TARGET_FILE" 