#!/bin/bash
set -e

echo "[GHOST-RELAY] Starting ghost relay system..."

# Ensure directories exist
mkdir -p /Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs
mkdir -p /Users/sawyer/gitSync/.cursor-cache/MAIN/.logs
mkdir -p /Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries
mkdir -p /Users/sawyer/gitSync/.cursor-cache/MAIN/summaries

# Start ghost relay via PM2 (non-blocking)
{ pm2 start ecosystem.config.js --only ghost-relay & } >/dev/null 2>&1 & disown || {
  echo "[GHOST-RELAY] Starting ghost relay directly (non-blocking)..."
  { node scripts/ghost/ghost-relay.js & } >/dev/null 2>&1 & disown
  echo $! > /tmp/ghost-relay.pid
}

# Wait for ghost relay to start
sleep 3

# Test ghost relay
if curl -s http://localhost:3001/health | grep -q "healthy"; then
  echo "[GHOST-RELAY] ✅ Ghost relay started successfully"
else
  echo "[GHOST-RELAY] ❌ Ghost relay failed to start"
  exit 1
fi

# Update status logs
curl -s -X POST http://localhost:3001/status/CYOPS -H "Content-Type: application/json" -d '{"status": "Ghost relay system initialized"}'
curl -s -X POST http://localhost:3001/status/MAIN -H "Content-Type: application/json" -d '{"status": "Ghost relay system initialized"}'

echo "[GHOST-RELAY] Ghost relay system ready"
echo "[GHOST-RELAY] API: http://localhost:3001"
echo "[GHOST-RELAY] Health: http://localhost:3001/health"
echo "[GHOST-RELAY] Status: http://localhost:3001/status" 
