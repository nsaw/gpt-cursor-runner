#!/bin/bash
set -e

TUNNEL_NAME="gpt-cursor-runner"
TUNNEL_ID="f1545c78-1a94-408f-ba6b-9c4223b4c2bf"
EXTERNAL_HOST="runner.thoughtmarks.app"
ENDPOINT="https://$EXTERNAL_HOST/health"

LOG_FILE="/Users/sawyer/gitSync/gpt-cursor-runner/summaries/_cf-tunnel-validation.log"
echo "🌐 Tunnel Repair @ $(date)" > "$LOG_FILE"

# 1. Validate tunnel exists and start if needed
if ! pgrep -f cloudflared > /dev/null; then
  echo "⚠️ cloudflared not running, starting tunnel..." >> "$LOG_FILE"
  cloudflared tunnel --config /Users/sawyer/.cloudflared/gpt-cursor-runner-config.yml run $TUNNEL_ID &
  sleep 3
  if ! pgrep -f cloudflared > /dev/null; then
    echo "❌ Failed to start cloudflared tunnel" >> "$LOG_FILE"
    exit 201
  fi
  echo "✅ cloudflared tunnel started" >> "$LOG_FILE"
else
  echo "✅ cloudflared process found" >> "$LOG_FILE"
fi

# 2. Check if local service is running, start simple health server if not
if ! lsof -i :5555 > /dev/null 2>&1; then
  echo "⚠️ Local service not running on port 5555, starting health server..." >> "$LOG_FILE"
  node /Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/health_server_once.js &
  sleep 3
  if ! lsof -i :5555 > /dev/null 2>&1; then
    echo "❌ Failed to start health server on port 5555" >> "$LOG_FILE"
    exit 202
  fi
  echo "✅ Health server started on port 5555" >> "$LOG_FILE"
else
  echo "✅ Local service found on port 5555" >> "$LOG_FILE"
fi

# 3. Check endpoint via curl
(timeout 5s curl -s -o /dev/null -w "%{http_code}" "$ENDPOINT" || echo "error") >> "$LOG_FILE"

# 4. Attempt route remap if not 200
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$ENDPOINT")
if [ "$STATUS_CODE" != "200" ]; then
  echo "⚠️ Remapping Cloudflare route for $TUNNEL_NAME..." >> "$LOG_FILE"
  cloudflared tunnel route dns "$TUNNEL_NAME" "$EXTERNAL_HOST" || echo "⚠️ Route remap failed" >> "$LOG_FILE"
else
  echo "✅ Tunnel endpoint OK ($STATUS_CODE)" >> "$LOG_FILE"
fi

exit 0 
