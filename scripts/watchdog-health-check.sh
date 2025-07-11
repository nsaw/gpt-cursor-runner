#!/bin/bash

# Patch Watchdog Health Check Script
# Monitors the watchdog service and restarts if needed

WATCHDOG_LABEL="com.thoughtmarks.patchwatchdog"
LOG_FILE="./logs/watchdog-health-check.log"
DASHBOARD_WEBHOOK="https://gpt-cursor-runner.fly.dev/slack/commands"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

notify_dashboard() {
    local message="$1"
    local level="${2:-INFO}"
    
    curl -s -X POST "$DASHBOARD_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{
            \"command\": \"/alert-runner-crash\",
            \"text\": \"[WATCHDOG-HEALTH] ${level}: ${message}\",
            \"user_name\": \"watchdog-health\",
            \"channel_id\": \"infrastructure\"
        }" >> "$LOG_FILE" 2>&1
}

# Check if watchdog is running
if ! launchctl list | grep -q "$WATCHDOG_LABEL"; then
    log "⚠️  Watchdog service not running - restarting..."
    notify_dashboard "Watchdog service not running - restarting", "WARNING"
    
    # Try to start the service
    if launchctl start "$WATCHDOG_LABEL" 2>/dev/null; then
        log "✅ Watchdog service restarted successfully"
        notify_dashboard "Watchdog service restarted successfully", "SUCCESS"
    else
        log "❌ Failed to restart watchdog service"
        notify_dashboard "Failed to restart watchdog service", "ERROR"
        exit 1
    fi
else
    log "✅ Watchdog service is running"
fi

# Check if the process is actually responding
if ! pgrep -f "patch-watchdog.js" >/dev/null; then
    log "⚠️  Watchdog process not found - restarting..."
    notify_dashboard "Watchdog process not found - restarting", "WARNING"
    
    # Kill any existing processes and restart
    pkill -f "patch-watchdog.js" 2>/dev/null
    sleep 2
    
    if launchctl start "$WATCHDOG_LABEL" 2>/dev/null; then
        log "✅ Watchdog process restarted successfully"
        notify_dashboard "Watchdog process restarted successfully", "SUCCESS"
    else
        log "❌ Failed to restart watchdog process"
        notify_dashboard "Failed to restart watchdog process", "ERROR"
        exit 1
    fi
else
    log "✅ Watchdog process is running"
fi
