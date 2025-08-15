#!/bin/bash
set -euo pipefail

# Dashboard Uplink Watchdog
# Monitors and restarts dashboard-uplink.js if it fails

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/dashboard-uplink-watchdog.log"
PID_FILE="$PROJECT_ROOT/pids/dashboard-uplink-watchdog.pid"
TARGET_SCRIPT="$PROJECT_ROOT/scripts/watchdogs/dashboard-uplink.js"
TARGET_LOG="$PROJECT_ROOT/logs/dashboard-uplink.log"

# Create directories if they don't exist
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$PID_FILE")"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if dashboard-uplink is running
is_running() {
    pgrep -f "dashboard-uplink.js" >/dev/null 2>&1
}

# Function to start dashboard-uplink
start_dashboard_uplink() {
    log "Starting dashboard-uplink.js..."
    
    # Set environment variables
    export DASHBOARD_URL="https://gpt-cursor-runner.thoughtmarks.app/monitor"
    export DASHBOARD_TOKEN="$(op read op://SecretKeeper/RUNNER_TOKEN/credential)"
    export CF_API_TOKEN="$(op read op://SecretKeeper/CF_API_TOKEN/credential)"
    
    # Start the process with proper wrapping and disown
    cd "$PROJECT_ROOT"
    { nohup node "$TARGET_SCRIPT" >> "$TARGET_LOG" 2>&1 & } >/dev/null 2>&1 & disown
    
    # Wait a moment and check if it started successfully
    sleep 5
    if is_running; then
        log "✅ dashboard-uplink.js started successfully"
        return 0
    else
        log "❌ dashboard-uplink.js failed to start"
        return 1
    fi
}

# Function to stop dashboard-uplink
stop_dashboard_uplink() {
    log "Stopping dashboard-uplink.js..."
    pkill -f "dashboard-uplink.js" || true
    sleep 2
}

# Function to check if dashboard uplink is healthy
is_healthy() {
    # Check if the log file has recent activity (within last 5 minutes)
    if [ -f "$TARGET_LOG" ]; then
        # Look for recent heartbeat activity
        local recent_activity=$(tail -n 20 "$TARGET_LOG" 2>/dev/null | grep -c "POST 200 - heartbeat" 2>/dev/null || echo "0")
        if [ -n "$recent_activity" ] && [ "$recent_activity" -gt 0 ] 2>/dev/null; then
            return 0
        fi
        
        # Also check for recent startup messages
        local startup_activity=$(tail -n 10 "$TARGET_LOG" 2>/dev/null | grep -c "dashboard-uplink.*started" 2>/dev/null || echo "0")
        if [ -n "$startup_activity" ] && [ "$startup_activity" -gt 0 ] 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# Main watchdog loop
main() {
    log "🚀 Dashboard Uplink Watchdog starting..."
    
    # Write PID file
    echo $$ > "$PID_FILE"
    
    # Initial start
    if ! is_running; then
        start_dashboard_uplink
    else
        log "✅ dashboard-uplink.js already running"
    fi
    
    # Main monitoring loop
    while true; do
        if ! is_running; then
            log "⚠️ dashboard-uplink.js not running, restarting..."
            stop_dashboard_uplink
            start_dashboard_uplink
            
            # Wait longer after restart
            sleep 10
        elif ! is_healthy; then
            log "⚠️ dashboard-uplink.js not healthy (no recent activity), restarting..."
            stop_dashboard_uplink
            start_dashboard_uplink
            
            # Wait longer after restart
            sleep 10
        else
            log "✅ dashboard-uplink.js healthy"
        fi
        
        # Check every 60 seconds
        sleep 60
    done
}

# Handle script termination
cleanup() {
    log "🛑 Dashboard Uplink Watchdog stopping..."
    rm -f "$PID_FILE"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start the watchdog
main "$@" 
