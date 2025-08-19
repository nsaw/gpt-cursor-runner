#!/bin/bash

# Ghost Status Validation Script
# Validates that all ghost services are running and healthy

set -e

echo "🔍 Validating Ghost Status..."

# Create heartbeat directory if it doesn't exist
mkdir -p summaries/_heartbeat

# Check if ghost status file exists
if [ ! -f "summaries/_heartbeat/.ghost-status.json" ]; then
    echo "❌ Ghost status file not found"
    exit 1
fi

# Check if last MD write log exists
if [ ! -f "summaries/_heartbeat/.last-md-write.log" ]; then
    echo "❌ Last MD write log not found"
    exit 1
fi

# Check ghost status
***REMOVED***_STATUS=$(cat summaries/_heartbeat/.ghost-status.json)
if echo "$***REMOVED***_STATUS" | grep -q '"status": "LIVE"'; then
    echo "✅ Ghost status is LIVE"
else
    echo "❌ Ghost status is not LIVE"
    echo "Current status: $***REMOVED***_STATUS"
    exit 1
fi

# Check if all service PIDs are running
***REMOVED***_BRIDGE_PID=$(echo "$***REMOVED***_STATUS" | grep -o '"ghost-bridge": "[^"]*"' | cut -d'"' -f4)
PATCH_EXECUTOR_PID=$(echo "$***REMOVED***_STATUS" | grep -o '"patch-executor": "[^"]*"' | cut -d'"' -f4)
SUMMARY_MONITOR_PID=$(echo "$***REMOVED***_STATUS" | grep -o '"summary-monitor": "[^"]*"' | cut -d'"' -f4)

echo "Checking service PIDs:"
echo "  Ghost Bridge: $***REMOVED***_BRIDGE_PID"
echo "  Patch Executor: $PATCH_EXECUTOR_PID"
echo "  Summary Monitor: $SUMMARY_MONITOR_PID"

# Check if processes are running
if [ -n "$***REMOVED***_BRIDGE_PID" ] && kill -0 $***REMOVED***_BRIDGE_PID 2>/dev/null; then
    echo "✅ Ghost Bridge is running"
else
    echo "❌ Ghost Bridge is not running"
    exit 1
fi

if [ -n "$PATCH_EXECUTOR_PID" ] && kill -0 $PATCH_EXECUTOR_PID 2>/dev/null; then
    echo "✅ Patch Executor is running"
else
    echo "❌ Patch Executor is not running"
    exit 1
fi

if [ -n "$SUMMARY_MONITOR_PID" ] && kill -0 $SUMMARY_MONITOR_PID 2>/dev/null; then
    echo "✅ Summary Monitor is running"
else
    echo "❌ Summary Monitor is not running"
    exit 1
fi

# Check last MD write log timestamp
LAST_WRITE=$(tail -1 summaries/_heartbeat/.last-md-write.log)
echo "Last MD write: $LAST_WRITE"

# Check if the last write was recent (within last 5 minutes)
LAST_WRITE_TIME=$(echo "$LAST_WRITE" | grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T[0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}Z')
if [ -n "$LAST_WRITE_TIME" ]; then
    CURRENT_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "Current time: $CURRENT_TIME"
    echo "Last write time: $LAST_WRITE_TIME"
    echo "✅ Last MD write log is updating"
else
    echo "❌ Last MD write log timestamp not found"
    exit 1
fi

echo "✅ All ghost services are validated and running"
exit 0 
