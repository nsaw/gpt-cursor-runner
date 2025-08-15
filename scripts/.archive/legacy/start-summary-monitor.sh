#!/bin/bash

# Summary Monitor Start Script
# Monitors and processes summary files

set -e

echo "📊 Starting Summary Monitor..."

# Kill any existing summary monitor processes
pkill -f "summary-monitor" || true

sleep 2

# Create necessary directories
mkdir -p summaries/_heartbeat
mkdir -p logs

# Start summary monitor
echo "🔍 Starting summary-monitor..."
node scripts/summary-monitor-simple.js > logs/summary-monitor.log 2>&1 &
SUMMARY_MONITOR_PID=$!
echo $SUMMARY_MONITOR_PID > /tmp/summary-monitor.pid

# Update last MD write log
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - Summary monitor started (PID: $SUMMARY_MONITOR_PID)" > summaries/_heartbeat/.last-md-write.log

# Wait a moment for service to initialize
sleep 3

# Check if service is running
if kill -0 $SUMMARY_MONITOR_PID 2>/dev/null; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - Summary monitor LIVE (PID: $SUMMARY_MONITOR_PID)" >> summaries/_heartbeat/.last-md-write.log
    echo "✅ Summary monitor is LIVE (PID: $SUMMARY_MONITOR_PID)"
    exit 0
else
    echo "❌ Summary monitor failed to start"
    exit 1
fi 
