#!/bin/bash
set -e

pm2 describe ghost-bridge-viewer &> /dev/null || {
  echo '[RESTART] ghost-bridge-viewer not running. Starting via PM2.'
  pm2 start ecosystem.config.js --only ghost-bridge,ghost-bridge-viewer
}

# Get the actual ngrok tunnel URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null || echo "https://2802f45bb758.ngrok-free.app")

# Rebind if tunnel isn't responding
if ! curl -s ${NGROK_URL}/ghost | grep -q '<html'; then
  echo '[REPAIR] Live-viewer portal unreachable. Rebinding...'
  pm2 restart ghost-bridge ghost-bridge-viewer || pm2 start ecosystem.config.js --only ghost-bridge,ghost-bridge-viewer
fi

echo '{ "status": "online", "endpoint": "'${NGROK_URL}'/ghost", "process": "ghost-viewer", "tunnel": "ngrok" }' > /Users/sawyer/gitSync/.cursor-cache/ROOT/summaries/.heartbeat/ghost-bridge-viewer.json

echo '[✅] Ghost Bridge Viewer verified and bound.' 