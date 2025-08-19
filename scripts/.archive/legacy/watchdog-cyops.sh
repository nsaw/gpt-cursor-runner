#!/bin/bash

# CYOPS Daemon Watchdog Script
# Monitors and restarts the CYOPS daemon if it goes down

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CYOPS_DAEMON="$PROJECT_DIR/cyops_daemon.py"
LOG_FILE="$PROJECT_DIR/logs/cyops-daemon.log"
WATCHDOG_LOG="$PROJECT_DIR/logs/cyops-watchdog.log"
MAX_RESTARTS=5
RESTART_COUNT=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$WATCHDOG_LOG"
}

# Function to check if CYOPS daemon is running
check_cyops_daemon() {
    pgrep -f "python.*cyops_daemon" > /dev/null 2>&1
}

# Function to start CYOPS daemon
start_cyops_daemon() {
    log "🚀 Starting CYOPS daemon..."
    cd "$PROJECT_DIR"
    python3 "$CYOPS_DAEMON" > "$LOG_FILE" 2>&1 &
    sleep 2
    
    if check_cyops_daemon; then
        log "✅ CYOPS daemon started successfully"
        return 0
    else
        log "❌ Failed to start CYOPS daemon"
        return 1
    fi
}

# Function to stop CYOPS daemon
stop_cyops_daemon() {
    log "🛑 Stopping CYOPS daemon..."
    pkill -f "python.*cyops_daemon" > /dev/null 2>&1
    sleep 2
    
    if ! check_cyops_daemon; then
        log "✅ CYOPS daemon stopped successfully"
        return 0
    else
        log "❌ Failed to stop CYOPS daemon"
        return 1
    fi
}

# Function to send Slack alert
send_slack_alert() {
    local message="$1"
    log "📡 Sending Slack alert: $message"
    # Add Slack webhook call here if needed
    echo "SLACK_ALERT: $message" >> "$WATCHDOG_LOG"
}

# Function to show status
show_status() {
    if check_cyops_daemon; then
        local pid=$(pgrep -f "python.*cyops_daemon")
        log "✅ CYOPS daemon is running (PID: $pid)"
        return 0
    else
        log "❌ CYOPS daemon is not running"
        return 1
    fi
}

# Function to show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo "=== CYOPS Daemon Logs ==="
        tail -20 "$LOG_FILE"
    else
        log "📝 No log file found: $LOG_FILE"
    fi
}

# Function to show watchdog logs
show_watchdog_logs() {
    if [ -f "$WATCHDOG_LOG" ]; then
        echo "=== CYOPS Watchdog Logs ==="
        tail -20 "$WATCHDOG_LOG"
    else
        log "📝 No watchdog log file found: $WATCHDOG_LOG"
    fi
}

# Main monitoring function
monitor() {
    log "👁️ Starting CYOPS daemon monitoring..."
    
    while true; do
        if ! check_cyops_daemon; then
            log "⚠️ CYOPS daemon is down, attempting restart..."
            
            if [ $RESTART_COUNT -ge $MAX_RESTARTS ]; then
                log "🚨 Maximum restart attempts reached ($MAX_RESTARTS)"
                send_slack_alert "CYOPS daemon failed to start after $MAX_RESTARTS attempts"
                break
            fi
            
            if start_cyops_daemon; then
                RESTART_COUNT=0
                log "✅ CYOPS daemon restarted successfully"
            else
                ((RESTART_COUNT++))
                log "❌ Failed to restart CYOPS daemon (attempt $RESTART_COUNT/$MAX_RESTARTS)"
                
                if [ $RESTART_COUNT -eq $MAX_RESTARTS ]; then
                    send_slack_alert "CYOPS daemon restart failed $MAX_RESTARTS times"
                fi
            fi
        else
            if [ $RESTART_COUNT -gt 0 ]; then
                log "✅ CYOPS daemon is healthy again"
                RESTART_COUNT=0
            fi
        fi
        
        sleep 30
    done
}

# Health check function (for cron jobs)
health_check() {
    if check_cyops_daemon; then
        log "✅ CYOPS daemon health check: OK"
        exit 0
    else
        log "❌ CYOPS daemon health check: FAILED"
        exit 1
    fi
}

# Main script logic
case "${1:-monitor}" in
    "start")
        if check_cyops_daemon; then
            log "⚠️ CYOPS daemon is already running"
            exit 1
        else
            start_cyops_daemon
        fi
        ;;
    "stop")
        stop_cyops_daemon
        ;;
    "restart")
        stop_cyops_daemon
        sleep 2
        start_cyops_daemon
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "watchdog-logs")
        show_watchdog_logs
        ;;
    "monitor")
        monitor
        ;;
    "health")
        health_check
        ;;
    *)
        echo "CYOPS Daemon Watchdog"
        echo "====================="
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|watchdog-logs|monitor|health}"
        echo ""
        echo "Commands:"
        echo "  start           - Start CYOPS daemon"
        echo "  stop            - Stop CYOPS daemon"
        echo "  restart         - Restart CYOPS daemon"
        echo "  status          - Check daemon status"
        echo "  logs            - Show daemon logs"
        echo "  watchdog-logs   - Show watchdog logs"
        echo "  monitor         - Monitor and auto-restart daemon"
        echo "  health          - Health check (for cron)"
        echo ""
        echo "Configuration:"
        echo "  Daemon: $CYOPS_DAEMON"
        echo "  Log File: $LOG_FILE"
        echo "  Watchdog Log: $WATCHDOG_LOG"
        echo "  Max Restarts: $MAX_RESTARTS"
        ;;
esac 
