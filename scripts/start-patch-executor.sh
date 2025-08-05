#!/bin/bash

# Patch Executor Start Script
# Executes patches from the queue

set -e

echo "🔧 Starting Patch Executor..."

# Kill any existing patch executor processes
pkill -f "patch-executor" || true

sleep 2

# Create necessary directories
mkdir -p logs
mkdir -p .cursor-cache/CYOPS/patches

# Start patch executor
echo "⚡ Starting patch-executor..."
node scripts/patch-executor-simple.js > logs/patch-executor.log 2>&1 &
PATCH_EXECUTOR_PID=$!
echo $PATCH_EXECUTOR_PID > /tmp/patch-executor.pid

# Update last MD write log
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - Patch executor started (PID: $PATCH_EXECUTOR_PID)" >> summaries/_heartbeat/.last-md-write.log

# Wait a moment for service to initialize
sleep 3

# Check if service is running
if kill -0 $PATCH_EXECUTOR_PID 2>/dev/null; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - Patch executor LIVE (PID: $PATCH_EXECUTOR_PID)" >> summaries/_heartbeat/.last-md-write.log
    echo "✅ Patch executor is LIVE (PID: $PATCH_EXECUTOR_PID)"
    exit 0
else
    echo "❌ Patch executor failed to start"
    exit 1
fi 