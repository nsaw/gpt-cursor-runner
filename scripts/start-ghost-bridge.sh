#!/bin/bash

# Ghost Bridge Start Script
# Bridges communication between ghost services

set -e

echo "📡 Starting Ghost Bridge..."

# Kill any existing ghost bridge processes
pkill -f "ghost-bridge" || true

sleep 2

# Create necessary directories
mkdir -p logs

# Start ghost bridge
echo "🌉 Starting ghost-bridge..."
node scripts/ghost-bridge-simple.js > logs/ghost-bridge.log 2>&1 &
GHOST_BRIDGE_PID=$!
echo $GHOST_BRIDGE_PID > /tmp/ghost-bridge.pid

# Update last MD write log
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - Ghost bridge started (PID: $GHOST_BRIDGE_PID)" >> summaries/_heartbeat/.last-md-write.log

# Wait a moment for service to initialize
sleep 3

# Check if service is running
if kill -0 $GHOST_BRIDGE_PID 2>/dev/null; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - Ghost bridge LIVE (PID: $GHOST_BRIDGE_PID)" >> summaries/_heartbeat/.last-md-write.log
    echo "✅ Ghost bridge is LIVE (PID: $GHOST_BRIDGE_PID)"
    exit 0
else
    echo "❌ Ghost bridge failed to start"
    exit 1
fi 