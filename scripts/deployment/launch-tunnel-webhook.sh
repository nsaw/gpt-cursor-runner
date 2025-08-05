#!/bin/bash

# Start Cloudflare tunnel manually using known working ID and credential
CLOUDFLARE_TUNNEL_ID=9401ee23-3a46-409b-b0e7-b035371afe32
CREDENTIAL_FILE="$HOME/.cloudflared/$CLOUDFLARE_TUNNEL_ID.json"
CONFIG_FILE="/Users/sawyer/gitSync/gpt-cursor-runner/config/webhook-tunnel-config.yml"
LOG_FILE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/tunnel-start.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

echo "[INFO] Starting Cloudflare tunnel for webhook endpoint..." | tee -a "$LOG_FILE"
echo "[INFO] Tunnel ID: $CLOUDFLARE_TUNNEL_ID" | tee -a "$LOG_FILE"
echo "[INFO] Config file: $CONFIG_FILE" | tee -a "$LOG_FILE"
echo "[INFO] Credential file: $CREDENTIAL_FILE" | tee -a "$LOG_FILE"

# Check if credential file exists
if [ ! -f "$CREDENTIAL_FILE" ]; then
  echo "[❌] Credential file not found for tunnel $CLOUDFLARE_TUNNEL_ID" | tee -a "$LOG_FILE"
  exit 1
fi

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo "[❌] Config file not found: $CONFIG_FILE" | tee -a "$LOG_FILE"
  exit 1
fi

# Kill any existing cloudflared processes
echo "[INFO] Stopping any existing cloudflared processes..." | tee -a "$LOG_FILE"
pkill -f cloudflared || true
sleep 2

# Start the tunnel in background with proper logging
echo "[INFO] Launching Cloudflare tunnel..." | tee -a "$LOG_FILE"
(
  echo "[INFO] Tunnel process started at $(date)" >> "$LOG_FILE"
  cloudflared tunnel --config "$CONFIG_FILE" run "$CLOUDFLARE_TUNNEL_ID" 2>&1
  echo "[✅ TUNNEL STARTED] $(date) - Process completed" >> "$LOG_FILE"
) >> "$LOG_FILE" 2>&1 &
TUNNEL_PID=$!

echo "[INFO] Tunnel process started with PID: $TUNNEL_PID" | tee -a "$LOG_FILE"
echo "$TUNNEL_PID" > "/Users/sawyer/gitSync/gpt-cursor-runner/pids/cloudflared-webhook.pid"

# Wait for tunnel to start
sleep 5

# Check if tunnel process is running
if ps -p $TUNNEL_PID > /dev/null; then
  echo "[✅] Tunnel process is running (PID: $TUNNEL_PID)" | tee -a "$LOG_FILE"
  ps aux | grep cloudflared | grep -v grep | tee -a "$LOG_FILE"
else
  echo "[❌] Tunnel process failed to start" | tee -a "$LOG_FILE"
  echo "[DEBUG] Last 20 lines of log:" | tee -a "$LOG_FILE"
  tail -n 20 "$LOG_FILE" | tee -a "$LOG_FILE"
  exit 1
fi 