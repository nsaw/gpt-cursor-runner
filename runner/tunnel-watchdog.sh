#!/bin/bash

# FILENAME: tunnel-watchdog.sh
# PURPOSE: Auto-restarts Cloudflare tunnel if DNS or port is down

TUNNEL_NAME="tm-runner-expo"
RUNNER_PORT=5555
CHECK_URL="http://localhost:$RUNNER_PORT/health"

if ! curl -s --max-time 2 "$CHECK_URL" | grep -q "OK"; then
  echo "⚠️ Runner tunnel appears down. Restarting Cloudflare tunnel..."
  pkill -f cloudflared
  cloudflared tunnel run "$TUNNEL_NAME" &
  echo "✅ Tunnel restarted."
else
  echo "✅ Tunnel healthy. No action needed."
fi
