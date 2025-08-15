#!/bin/bash

echo "🔍 Component Validation - Dashboard Components"

# Check if dashboard layout file exists
if [ -f "web/monitor/dashboardLayout.js" ]; then
    echo "✅ Dashboard layout component exists"
else
    echo "❌ Dashboard layout component missing"
    exit 1
fi

# Check if render monitor script exists
if [ -f "scripts/monitor/renderMonitor.js" ]; then
    echo "✅ Render monitor script exists"
else
    echo "❌ Render monitor script missing"
    exit 1
fi

# Check if dashboard layout has required functions
if grep -q "loadMonitorData" web/monitor/dashboardLayout.js; then
    echo "✅ Dashboard has loadMonitorData function"
else
    echo "❌ Dashboard missing loadMonitorData function"
    exit 1
fi

if grep -q "checkDaemonLiveness" web/monitor/dashboardLayout.js; then
    echo "✅ Dashboard has checkDaemonLiveness function"
else
    echo "❌ Dashboard missing checkDaemonLiveness function"
    exit 1
fi

# Check if render monitor has required functions
if grep -q "getDaemonStatus" scripts/monitor/renderMonitor.js; then
    echo "✅ Render monitor has getDaemonStatus function"
else
    echo "❌ Render monitor missing getDaemonStatus function"
    exit 1
fi

if grep -q "getSummaryData" scripts/monitor/renderMonitor.js; then
    echo "✅ Render monitor has getSummaryData function"
else
    echo "❌ Render monitor missing getSummaryData function"
    exit 1
fi

# Check if mobile-first layout is implemented
if grep -q "mobile-first" web/monitor/dashboardLayout.js || grep -q "Mobile-First" web/monitor/dashboardLayout.js; then
    echo "✅ Mobile-first layout is implemented"
else
    echo "⚠️  Mobile-first layout may not be implemented"
fi

echo "✅ Component validation completed"
exit 0 
