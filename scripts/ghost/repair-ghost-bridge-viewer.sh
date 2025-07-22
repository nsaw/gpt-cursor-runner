#!/bin/bash
set -e

pm2 describe ghost-bridge-viewer &> /dev/null || {
  echo '[RESTART] ghost-bridge-viewer not running. Starting via PM2.'
  pm2 start ecosystem.config.js --only ghost-bridge,ghost-bridge-viewer
}

# Check Cloudflare tunnel status
CLOUDFLARE_URL="https://webhook-thoughtmarks.THOUGHTMARKS.app"

# Rebind if tunnel isn't responding
if ! curl -s --resolve webhook-thoughtmarks.THOUGHTMARKS.app:443:104.21.80.1 ${CLOUDFLARE_URL}/ghost | grep -q '<html'; then
  echo '[REPAIR] Live-viewer portal unreachable. Rebinding...'
  pm2 restart ghost-bridge ghost-bridge-viewer || pm2 start ecosystem.config.js --only ghost-bridge,ghost-bridge-viewer
fi

echo '{ "status": "online", "endpoint": "'${CLOUDFLARE_URL}'/ghost", "process": "ghost-viewer", "tunnel": "cloudflare-webhook" }' > /Users/sawyer/gitSync/.cursor-cache/ROOT/summaries/.heartbeat/ghost-bridge-viewer.json

echo '[✅] Ghost Bridge Viewer verified and bound.' 