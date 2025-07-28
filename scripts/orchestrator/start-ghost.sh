#!/bin/bash

# Ghost Orchestrator Start Script
# Restores ghost-runner's critical services

set -e

echo "🚀 Starting Ghost Orchestrator..."

# Kill any existing ghost processes
pkill -f "ghost-bridge" || true
pkill -f "patch-executor" || true
pkill -f "summary-monitor" || true
pkill -f "backend-api" || true

sleep 2

# Start ghost-bridge
echo "📡 Starting ghost-bridge..."
node scripts/ghost-bridge.js > logs/ghost-bridge.log 2>&1 &
GHOST_BRIDGE_PID=$!
echo $GHOST_BRIDGE_PID > /tmp/ghost-bridge.pid

# Start patch-executor
echo "🔧 Starting patch-executor..."
node scripts/patch-executor.js > logs/patch-executor.log 2>&1 &
PATCH_EXECUTOR_PID=$!
echo $PATCH_EXECUTOR_PID > /tmp/patch-executor.pid

# Start summary-monitor
echo "📊 Starting summary-monitor..."
node scripts/summary-monitor.js > logs/summary-monitor.log 2>&1 &
SUMMARY_MONITOR_PID=$!
echo $SUMMARY_MONITOR_PID > /tmp/summary-monitor.pid

# Create heartbeat directory if it doesn't exist
mkdir -p summaries/_heartbeat

# Update ghost status
echo '{"status": "STARTING", "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", "services": {"ghost-bridge": "'$GHOST_BRIDGE_PID'", "patch-executor": "'$PATCH_EXECUTOR_PID'", "summary-monitor": "'$SUMMARY_MONITOR_PID'"}}' > summaries/_heartbeat/.ghost-status.json

echo "✅ Ghost services started with PIDs:"
echo "   Ghost Bridge: $GHOST_BRIDGE_PID"
echo "   Patch Executor: $PATCH_EXECUTOR_PID"
echo "   Summary Monitor: $SUMMARY_MONITOR_PID"

# Wait a moment for services to initialize
sleep 3

# Check if services are running
if kill -0 $GHOST_BRIDGE_PID 2>/dev/null && kill -0 $PATCH_EXECUTOR_PID 2>/dev/null && kill -0 $SUMMARY_MONITOR_PID 2>/dev/null; then
    echo '{"status": "LIVE", "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", "services": {"ghost-bridge": "'$GHOST_BRIDGE_PID'", "patch-executor": "'$PATCH_EXECUTOR_PID'", "summary-monitor": "'$SUMMARY_MONITOR_PID'"}}' > summaries/_heartbeat/.ghost-status.json
    echo "✅ All ghost services are LIVE"
    exit 0
else
    echo "❌ Some ghost services failed to start"
    exit 1
fi 