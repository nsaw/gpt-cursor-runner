#!/bin/bash
set -euo pipefail

# Summary Watcher Watchdog
# Monitors and restarts summary-watcher.js if it fails

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/summary-watcher-watchdog.log"
PID_FILE="$PROJECT_ROOT/pids/summary-watcher-watchdog.pid"
TARGET_SCRIPT="$PROJECT_ROOT/scripts/watchdogs/summary-watcher.js"
TARGET_LOG="$PROJECT_ROOT/logs/summary-watcher.log"

# Create directories if they don't exist
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$PID_FILE")"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if summary-watcher is running
is_running() {
    pgrep -f "summary-watcher.js" >/dev/null 2>&1
}

# Function to start summary-watcher
start_summary_watcher() {
    log "Starting summary-watcher.js..."
    
    # Set environment variables
    export OPENAI_API_KEY="$(op read op://SecretKeeper/OPENAI_RUNNER_API_KEY/credential)"
    
    # Start the process with proper wrapping and disown
    cd "$PROJECT_ROOT"
    { nohup node "$TARGET_SCRIPT" >> "$TARGET_LOG" 2>&1 & } >/dev/null 2>&1 & disown
    
    # Wait a moment and check if it started successfully
    sleep 5
    if is_running; then
        log "✅ summary-watcher.js started successfully"
        return 0
    else
        log "❌ summary-watcher.js failed to start"
        return 1
    fi
}

# Function to stop summary-watcher
stop_summary_watcher() {
    log "Stopping summary-watcher.js..."
    pkill -f "summary-watcher.js" || true
    sleep 2
}

# Main watchdog loop
main() {
    log "🚀 Summary Watcher Watchdog starting..."
    
    # Write PID file
    echo $$ > "$PID_FILE"
    
    # Initial start
    if ! is_running; then
        start_summary_watcher
    else
        log "✅ summary-watcher.js already running"
    fi
    
    # Main monitoring loop
    while true; do
        if ! is_running; then
            log "⚠️ summary-watcher.js not running, restarting..."
            stop_summary_watcher
            start_summary_watcher
            
            # Wait longer after restart
            sleep 10
        else
            log "✅ summary-watcher.js healthy"
        fi
        
        # Check every 30 seconds
        sleep 30
    done
}

# Handle script termination
cleanup() {
    log "🛑 Summary Watcher Watchdog stopping..."
    rm -f "$PID_FILE"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start the watchdog
main "$@" 