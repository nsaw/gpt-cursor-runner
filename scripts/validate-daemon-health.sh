#!/bin/bash

echo "[VALIDATE] Checking daemon health..."

# Check PM2 processes
if command -v pm2 > /dev/null; then
    echo "✅ PM2 is available"
    
    # Check for ghost-bridge and ghost-viewer
    if pm2 list | grep -q "ghost-bridge"; then
        echo "✅ ghost-bridge daemon is running"
    else
        echo "⚠️ ghost-bridge daemon not running"
    fi
    
    if pm2 list | grep -q "ghost-viewer"; then
        echo "✅ ghost-viewer daemon is running"
    else
        echo "⚠️ ghost-viewer daemon not running"
    fi
else
    echo "⚠️ PM2 not available"
fi

# Check if summary directories are writable
if [ -w "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries" ]; then
    echo "✅ CYOPS summaries directory is writable"
else
    echo "❌ CYOPS summaries directory not writable"
    exit 1
fi

if [ -w "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries" ]; then
    echo "✅ MAIN summaries directory is writable"
else
    echo "❌ MAIN summaries directory not writable"
    exit 1
fi

echo "✅ Daemon health validation passed" 