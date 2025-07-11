#!/bin/bash

# Uninstall Patch Watchdog Service

WATCHDOG_LABEL="com.thoughtmarks.patchwatchdog"
PLIST_FILE="/Users/sawyer/Library/LaunchAgents/com.thoughtmarks.patchwatchdog.plist"

echo "🔄 Uninstalling patch watchdog service..."

# Stop the service
launchctl stop "" 2>/dev/null

# Unload the service
launchctl unload "/Users/sawyer/Library/LaunchAgents/com.thoughtmarks.patchwatchdog.plist" 2>/dev/null

# Remove the plist file
if [[ -f "/Users/sawyer/Library/LaunchAgents/com.thoughtmarks.patchwatchdog.plist" ]]; then
    rm "/Users/sawyer/Library/LaunchAgents/com.thoughtmarks.patchwatchdog.plist"
    echo "✅ Removed plist file"
fi

# Kill any remaining processes
pkill -f "patch-watchdog.js" 2>/dev/null

echo "✅ Patch watchdog service uninstalled"
echo "💡 You can reinstall by running: ./scripts/setup-patch-watchdog-launchd.sh"
