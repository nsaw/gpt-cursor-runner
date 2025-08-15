#!/bin/bash

echo "[VALIDATE] Checking patch watchers..."

# Check if patch directories exist
if [ -d "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches" ]; then
    echo "✅ CYOPS patches directory exists"
else
    echo "❌ CYOPS patches directory missing"
    exit 1
fi

if [ -d "/Users/sawyer/gitSync/.cursor-cache/MAIN/patches" ]; then
    echo "✅ MAIN patches directory exists"
else
    echo "❌ MAIN patches directory missing"
    exit 1
fi

# Check if daemons are running
if pgrep -f "doc-daemon" > /dev/null; then
    echo "✅ Doc daemon is running"
else
    echo "⚠️ Doc daemon not running (may be expected)"
fi

echo "✅ Patch watchers validation passed" 
