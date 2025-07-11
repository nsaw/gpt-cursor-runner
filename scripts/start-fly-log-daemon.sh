#!/bin/bash

# Fly Log Daemon - Background Log Monitoring
# Prevents terminal blocking by running fly logs in background

set -e

# Configuration
APP_NAME="gpt-cursor-runner"
LOG_DIR="./logs/fly"
PID_FILE="./logs/fly-log-daemon.pid"
MAX_LOG_SIZE="10M"
CHECK_INTERVAL=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_DIR/daemon.log"
}

# Check if daemon is already running
check_pid() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            return 0  # Running
        else
            log "WARN" "Stale PID file found, removing"
            rm -f "$PID_FILE"
        fi
    fi
    return 1  # Not running
}

# Start the log daemon
start_daemon() {
    log "INFO" "🚀 Starting Fly log daemon for $APP_NAME"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Check if already running
    if check_pid; then
        log "WARN" "Daemon already running (PID: $(cat $PID_FILE))"
        return 1
    fi
    
    # Start background log monitoring
    (
        # Set up log rotation
        while true; do
            # Rotate logs if they get too large
            if [ -f "$LOG_DIR/app.log" ] && [ $(stat -f%z "$LOG_DIR/app.log" 2>/dev/null || echo 0) -gt $(numfmt --from=iec $MAX_LOG_SIZE) ]; then
                mv "$LOG_DIR/app.log" "$LOG_DIR/app.log.$(date +%Y%m%d_%H%M%S)"
                log "INFO" "Rotated app log file"
            fi
            
            # Start fly logs in background with error handling
            log "INFO" "📡 Starting fly logs monitoring"
            
            # Use timeout to prevent hanging (macOS compatible)
            if command -v timeout >/dev/null 2>&1; then
                timeout 300 fly logs --app "$APP_NAME" --follow 2>&1 | while IFS= read -r line; do
                    echo "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ") $line" >> "$LOG_DIR/app.log"
                    
                    # Check for error patterns
                    if echo "$line" | grep -q -E "(ERROR|FAIL|timeout|crash|stall)"; then
                        log "ERROR" "🚨 Error detected in logs: $line"
                        # Could trigger alerts here
                    fi
                done
            elif command -v gtimeout >/dev/null 2>&1; then
                # macOS fallback: use gtimeout if available
                gtimeout 300 fly logs --app "$APP_NAME" --follow 2>&1 | while IFS= read -r line; do
                    echo "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ") $line" >> "$LOG_DIR/app.log"
                    
                    # Check for error patterns
                    if echo "$line" | grep -q -E "(ERROR|FAIL|timeout|crash|stall)"; then
                        log "ERROR" "🚨 Error detected in logs: $line"
                        # Could trigger alerts here
                    fi
                done
            else
                # No timeout available, use direct command
                fly logs --app "$APP_NAME" --follow 2>&1 | while IFS= read -r line; do
                    echo "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ") $line" >> "$LOG_DIR/app.log"
                    
                    # Check for error patterns
                    if echo "$line" | grep -q -E "(ERROR|FAIL|timeout|crash|stall)"; then
                        log "ERROR" "🚨 Error detected in logs: $line"
                        # Could trigger alerts here
                    fi
                done
            fi
            
            log "WARN" "Fly logs session ended, restarting in $CHECK_INTERVAL seconds..."
            sleep $CHECK_INTERVAL
        done
    ) &
    
    local daemon_pid=$!
    echo $daemon_pid > "$PID_FILE"
    log "INFO" "✅ Daemon started with PID: $daemon_pid"
    
    return 0
}

# Stop the daemon
stop_daemon() {
    log "INFO" "🛑 Stopping Fly log daemon"
    
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            log "INFO" "✅ Daemon stopped (PID: $pid)"
        else
            log "WARN" "Daemon not running (PID: $pid)"
        fi
        rm -f "$PID_FILE"
    else
        log "WARN" "No PID file found"
    fi
}

# Get log status
status() {
    if check_pid; then
        local pid=$(cat "$PID_FILE")
        log "INFO" "✅ Daemon running (PID: $pid)"
        
        # Show recent logs
        if [ -f "$LOG_DIR/app.log" ]; then
            log "INFO" "📋 Recent log entries:"
            tail -5 "$LOG_DIR/app.log" | while IFS= read -r line; do
                echo "  $line"
            done
        fi
        
        return 0
    else
        log "WARN" "❌ Daemon not running"
        return 1
    fi
}

# Monitor for specific patterns
monitor_logs() {
    local pattern="$1"
    local log_file="$LOG_DIR/app.log"
    
    if [ ! -f "$log_file" ]; then
        log "ERROR" "Log file not found: $log_file"
        return 1
    fi
    
    # Monitor for patterns in real-time
    tail -f "$log_file" | while IFS= read -r line; do
        if echo "$line" | grep -q "$pattern"; then
            log "ALERT" "🚨 Pattern '$pattern' detected: $line"
        fi
    done
}

# Main command handling
case "${1:-start}" in
    start)
        start_daemon
        ;;
    stop)
        stop_daemon
        ;;
    restart)
        stop_daemon
        sleep 2
        start_daemon
        ;;
    status)
        status
        ;;
    monitor)
        monitor_logs "${2:-ERROR}"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|monitor [pattern]}"
        echo "  start   - Start the log daemon"
        echo "  stop    - Stop the log daemon"
        echo "  restart - Restart the log daemon"
        echo "  status  - Show daemon status and recent logs"
        echo "  monitor - Monitor logs for specific patterns"
        exit 1
        ;;
esac 