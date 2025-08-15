#!/bin/bash

echo "🔍 Runtime Validation - Dashboard and Monitor Services"

# Check if monitor server is running
if curl -s http://localhost:8787/monitor >/dev/null 2>&1; then
    echo "✅ Monitor server (port 8787) is running"
else
    echo "❌ Monitor server (port 8787) is not responding"
    exit 1
fi

# Check if dashboard endpoints are accessible
if curl -s http://localhost:8787/monitor | grep -q "Dual Monitor"; then
    echo "✅ Dashboard HTML is being served"
else
    echo "❌ Dashboard HTML is not accessible"
    exit 1
fi

# Check if daemon processes are running
DAEMONS=("summary-monitor" "patch-executor" "doc-daemon")
for daemon in "${DAEMONS[@]}"; do
    if pgrep -f "$daemon" >/dev/null; then
        echo "✅ $daemon is running"
    else
        echo "⚠️  $daemon is not running"
    fi
done

# Check if log files are being written
LOG_FILES=("logs/unified-monitor.log" "logs/ghost-bridge.log" "logs/patch-executor.log")
for log_file in "${LOG_FILES[@]}"; do
    if [ -f "$log_file" ] && [ -s "$log_file" ]; then
        echo "✅ $log_file exists and has content"
    else
        echo "⚠️  $log_file is missing or empty"
    fi
done

echo "✅ Runtime validation completed"
exit 0 
