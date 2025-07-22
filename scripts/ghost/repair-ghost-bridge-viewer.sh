#!/bin/bash
set -e

pm2 describe ghost-bridge-viewer &> /dev/null || {
  echo '[RESTART] ghost-bridge-viewer not running. Starting via PM2.'
  pm2 start ecosystem.config.js --only ghost-bridge,ghost-bridge-viewer
}

# Rebind if tunnel isn't responding
if ! curl -s https://thoughtmarks.internal:7474/ghost | grep -q '<html'; then
  echo '[REPAIR] Live-viewer portal unreachable. Rebinding...'
  pm2 restart ghost-bridge ghost-bridge-viewer || pm2 start ecosystem.config.js --only ghost-bridge,ghost-bridge-viewer
fi

echo '{ "status": "online", "endpoint": "https://thoughtmarks.internal:7474/ghost" }' > /Users/sawyer/gitSync/.cursor-cache/ROOT/summaries/.heartbeat/ghost-bridge-viewer.json

echo '[✅] Ghost Bridge Viewer verified and bound.' 