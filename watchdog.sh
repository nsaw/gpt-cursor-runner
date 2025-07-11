#!/bin/bash

# GPT Cursor Runner Watchdog
# Monitors and restarts the runner if it goes down

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RUNNER_DIR="/Users/sawyer/gitSync/gpt-cursor-runner"
RUNNER_CMD="python3 -m gpt_cursor_runner.main"
RUNNER_URL="http://localhost:5051"
CHECK_INTERVAL=30
LOG_FILE="/Users/sawyer/Library/Logs/gpt-cursor-runner-watchdog.log"

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "info") echo -e "${BLUE}[${timestamp}] ℹ️  ${message}${NC}" ;;
        "success") echo -e "${GREEN}[${timestamp}] ✓ ${message}${NC}" ;;
        "warning") echo -e "${YELLOW}[${timestamp}] ⚠️  ${message}${NC}" ;;
        "error") echo -e "${RED}[${timestamp}] ❌ ${message}${NC}" ;;
    esac
    
    # Also log to file
    echo "[${timestamp}] ${message}" >> "$LOG_FILE"
}

check_runner() {
    # Check if process is running
    if ! pgrep -f "python3 -m gpt_cursor_runner.main" > /dev/null; then
        return 1
    fi
    
    # Check if runner is responding on localhost:5051
    if command -v curl >/dev/null 2>&1; then
        if curl -s -f "$RUNNER_URL/health" >/dev/null 2>&1; then
            return 0
        else
            log "warning" "Runner process running but not responding on localhost:5051"
            return 1
        fi
    else
        # Fallback: just check if process is running
        return 0
    fi
}

start_runner() {
    log "info" "Starting GPT Cursor Runner..."
    
    cd "$RUNNER_DIR"
    
    if python3 -m gpt_cursor_runner.main &>> "$LOG_FILE" & then
        local pid=$!
        log "success" "Runner started with PID: $pid"
        return 0
    else
        log "error" "Failed to start runner"
        return 1
    fi
}

stop_runner() {
    log "info" "Stopping GPT Cursor Runner..."
    
    if pkill -f "python3 -m gpt_cursor_runner.main"; then
        log "success" "Runner stopped"
        sleep 2
        return 0
    else
        log "warning" "No runner process found to stop"
        return 0
    fi
}

restart_runner() {
    log "warning" "Runner not responding, restarting..."
    stop_runner
    sleep 3
    start_runner
}

main() {
    log "info" "GPT Cursor Runner Watchdog started"
    log "info" "Monitoring runner process..."
    
    # Start runner if not already running
    if ! check_runner; then
        log "info" "Runner not running, starting..."
        start_runner
    fi
    
    # Main monitoring loop
    while true; do
            if check_runner; then
        log "success" "Runner is healthy (localhost:5051)"
    else
        log "error" "Runner is down or not responding on localhost:5051, restarting..."
        restart_runner
    fi
        
        sleep "$CHECK_INTERVAL"
    done
}

# Handle signals
trap 'log "info" "Watchdog received signal, shutting down..."; stop_runner; exit 0' SIGTERM SIGINT

# Run main function
main "$@" 