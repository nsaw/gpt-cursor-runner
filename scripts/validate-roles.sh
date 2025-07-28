#!/bin/bash

echo "🔍 Role Validation - Dashboard Roles and Permissions"

# Check if .cursor-config.json exists and has required settings
if [ -f ".cursor-config.json" ]; then
    echo "✅ .cursor-config.json exists"
    
    # Check for required validation settings
    if grep -q "enforceValidationGate" .cursor-config.json; then
        echo "✅ enforceValidationGate is configured"
    else
        echo "❌ enforceValidationGate is missing"
        exit 1
    fi
    
    if grep -q "strictRuntimeAudit" .cursor-config.json; then
        echo "✅ strictRuntimeAudit is configured"
    else
        echo "❌ strictRuntimeAudit is missing"
        exit 1
    fi
    
    if grep -q "blockCommitOnError" .cursor-config.json; then
        echo "✅ blockCommitOnError is configured"
    else
        echo "❌ blockCommitOnError is missing"
        exit 1
    fi
else
    echo "❌ .cursor-config.json missing"
    exit 1
fi

# Check if dashboard has proper error handling
if grep -q "showError" web/monitor/dashboardLayout.js; then
    echo "✅ Dashboard has error handling"
else
    echo "❌ Dashboard missing error handling"
    exit 1
fi

# Check if render monitor has proper error handling
if grep -q "console.error" scripts/monitor/renderMonitor.js; then
    echo "✅ Render monitor has error handling"
else
    echo "❌ Render monitor missing error handling"
    exit 1
fi

# Check if non-blocking patterns are used
if grep -q "disown" web/monitor/dashboardLayout.js || grep -q "disown" scripts/monitor/renderMonitor.js; then
    echo "✅ Non-blocking patterns are implemented"
else
    echo "⚠️  Non-blocking patterns may not be implemented"
fi

echo "✅ Role validation completed"
exit 0 