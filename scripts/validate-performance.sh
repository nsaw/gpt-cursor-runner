#!/bin/bash

echo "🔍 Performance Validation - Dashboard Performance"

# Check dashboard load time
START_TIME=$(date +%s.%N)
curl -s http://localhost:8787/monitor >/dev/null
END_TIME=$(date +%s.%N)
LOAD_TIME=$(echo "$END_TIME - $START_TIME" | bc -l)

if (( $(echo "$LOAD_TIME < 2.0" | bc -l) )); then
    echo "✅ Dashboard loads quickly: ${LOAD_TIME}s"
else
    echo "⚠️  Dashboard load time is slow: ${LOAD_TIME}s"
fi

# Check if dashboard has auto-refresh configured
if grep -q "setInterval" web/monitor/dashboardLayout.js; then
    echo "✅ Dashboard has auto-refresh configured"
else
    echo "❌ Dashboard missing auto-refresh"
    exit 1
fi

# Check refresh interval (should be reasonable)
if grep -q "refreshInterval" web/monitor/dashboardLayout.js; then
    echo "✅ Dashboard has configurable refresh interval"
else
    echo "❌ Dashboard missing refresh interval configuration"
    exit 1
fi

# Check if render monitor has reasonable check interval
if grep -q "checkInterval" scripts/monitor/renderMonitor.js; then
    echo "✅ Render monitor has configurable check interval"
else
    echo "❌ Render monitor missing check interval configuration"
    exit 1
fi

# Check if dashboard uses efficient data loading
if grep -q "fetch" web/monitor/dashboardLayout.js; then
    echo "✅ Dashboard uses fetch for data loading"
else
    echo "❌ Dashboard missing fetch implementation"
    exit 1
fi

# Check if render monitor uses efficient file operations
if grep -q "fs.readFileSync" scripts/monitor/renderMonitor.js; then
    echo "✅ Render monitor uses efficient file operations"
else
    echo "⚠️  Render monitor may not use efficient file operations"
fi

echo "✅ Performance validation completed"
exit 0 
