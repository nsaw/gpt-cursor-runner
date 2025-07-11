#!/bin/bash

# Safe Fly Logs Wrapper
# Replaces blocking `fly logs` commands with daemon-based access

set -e

# Configuration
LOG_DIR="./logs/fly"
DAEMON_SCRIPT="./scripts/start-fly-log-daemon.sh"
PID_FILE="./logs/fly-log-daemon.pid"

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
    echo "[$timestamp] [$level] $message"
}

# Check if daemon is running
is_daemon_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            return 0  # Running
        fi
    fi
    return 1  # Not running
}

# Start daemon if not running
ensure_daemon_running() {
    if ! is_daemon_running; then
        log "INFO" "🔄 Starting log daemon..."
        "$DAEMON_SCRIPT" start >/dev/null 2>&1
        sleep 2  # Give daemon time to start
        
        if is_daemon_running; then
            log "INFO" "✅ Daemon started successfully"
        else
            log "ERROR" "❌ Failed to start daemon"
            return 1
        fi
    else
        log "INFO" "✅ Daemon already running"
    fi
}

# Get recent logs safely
get_recent_logs() {
    local lines="${1:-20}"
    local log_file="$LOG_DIR/app.log"
    
    ensure_daemon_running
    
    if [ -f "$log_file" ]; then
        log "INFO" "📋 Recent logs (last $lines lines):"
        tail -n "$lines" "$log_file"
    else
        log "WARN" "No log file found yet, daemon may still be starting"
        echo "Waiting for logs to appear..."
        sleep 5
        if [ -f "$log_file" ]; then
            tail -n "$lines" "$log_file"
        else
            log "ERROR" "No logs available after waiting"
        fi
    fi
}

# Monitor logs for specific patterns
monitor_logs() {
    local pattern="${1:-ERROR}"
    
    ensure_daemon_running
    
    log "INFO" "🔍 Monitoring logs for pattern: $pattern"
    "$DAEMON_SCRIPT" monitor "$pattern"
}

# Get daemon status
get_status() {
    "$DAEMON_SCRIPT" status
}

# Stop daemon
stop_daemon() {
    log "INFO" "🛑 Stopping log daemon..."
    "$DAEMON_SCRIPT" stop
}

# Main command handling
case "${1:-recent}" in
    recent|tail)
        get_recent_logs "${2:-20}"
        ;;
    monitor|watch)
        monitor_logs "${2:-ERROR}"
        ;;
    status)
        get_status
        ;;
    stop)
        stop_daemon
        ;;
    start)
        ensure_daemon_running
        ;;
    restart)
        stop_daemon
        sleep 2
        ensure_daemon_running
        ;;
    *)
        echo "Usage: $0 {recent|tail|monitor|watch|status|stop|start|restart}"
        echo "  recent [lines] - Get recent logs (default: 20 lines)"
        echo "  tail [lines]   - Alias for recent"
        echo "  monitor [pattern] - Monitor logs for pattern (default: ERROR)"
        echo "  watch [pattern]   - Alias for monitor"
        echo "  status         - Show daemon status"
        echo "  stop           - Stop the daemon"
        echo "  start          - Start the daemon"
        echo "  restart        - Restart the daemon"
        echo ""
        echo "Examples:"
        echo "  $0 recent 50     # Get last 50 lines"
        echo "  $0 monitor ERROR # Monitor for errors"
        echo "  $0 status        # Check daemon status"
        exit 1
        ;;
esac 