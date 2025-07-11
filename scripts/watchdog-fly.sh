#!/bin/bash

# Fly Watchdog Daemon v1.0
# Monitors Fly.io application health with status checks and health endpoint monitoring
# Part of the hardened fallback pipeline for GHOST↔DEV reliability

set -e

# Configuration
APP_NAME="gpt-cursor-runner"
HEALTH_ENDPOINT="https://gpt-cursor-runner.fly.dev/health"
LOG_DIR="./logs/watchdogs"
PID_FILE="./logs/watchdog-fly.pid"
CHECK_INTERVAL=30
MAX_RETRIES=3
DASHBOARD_WEBHOOK="https://gpt-cursor-runner.fly.dev/slack/commands"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Generate operation UUID for tracking
OPERATION_UUID=$(uuidgen)
START_TIME=$(date +%s)

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    echo "[$timestamp] [${OPERATION_UUID}] [$level] $message" | tee -a "$LOG_DIR/fly-watchdog.log"
}

# Notify dashboard of status changes
notify_dashboard() {
    local message="$1"
    local level="${2:-INFO}"
    
    curl -s --max-time 10 -X POST "$DASHBOARD_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{
            \"command\": \"/alert-runner-crash\",
            \"text\": \"[FLY-WATCHDOG] ${level}: ${message}\",
            \"user_name\": \"fly-watchdog\",
            \"channel_id\": \"infrastructure\"
        }" >> "$LOG_DIR/fly-watchdog.log" 2>&1 || log "WARN" "Dashboard notification failed"
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

# Check Fly application status
check_fly_status() {
    log "INFO" "🔍 Checking Fly application status for $APP_NAME"
    
    # Check if flyctl is available
    if ! command -v flyctl >/dev/null 2>&1; then
        log "ERROR" "flyctl not found in PATH"
        return 1
    fi
    
    # Get Fly app status
    local status_output
    status_output=$(flyctl status --app "$APP_NAME" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log "INFO" "✅ Fly app status check passed"
        return 0
    else
        log "ERROR" "❌ Fly app status check failed: $status_output"
        return 1
    fi
}

# Check health endpoint
check_health_endpoint() {
    log "INFO" "🔍 Checking health endpoint: $HEALTH_ENDPOINT"
    
    local health_response
    health_response=$(curl -s --max-time 10 "$HEALTH_ENDPOINT" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ] && echo "$health_response" | grep -q "OK\|healthy\|alive"; then
        log "INFO" "✅ Health endpoint check passed"
        return 0
    else
        log "ERROR" "❌ Health endpoint check failed (exit: $exit_code): $health_response"
        return 1
    fi
}

# Check Fly logs for errors
check_fly_logs() {
    log "INFO" "🔍 Checking recent Fly logs for errors"
    
    # Get recent logs and check for error patterns
    local log_output
    log_output=$(flyctl logs --app "$APP_NAME" --limit 10 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        # Check for error patterns in logs
        if echo "$log_output" | grep -q -E "(ERROR|FAIL|timeout|crash|stall|panic)"; then
            log "WARN" "⚠️ Error patterns detected in recent logs"
            echo "$log_output" >> "$LOG_DIR/fly-error-logs.log"
            return 1
        else
            log "INFO" "✅ No error patterns in recent logs"
            return 0
        fi
    else
        log "ERROR" "❌ Failed to retrieve Fly logs: $log_output"
        return 1
    fi
}

# Comprehensive Fly health check
check_fly_health() {
    local all_checks_passed=true
    
    # Check Fly app status
    if ! check_fly_status; then
        all_checks_passed=false
    fi
    
    # Check health endpoint
    if ! check_health_endpoint; then
        all_checks_passed=false
    fi
    
    # Check recent logs
    if ! check_fly_logs; then
        all_checks_passed=false
    fi
    
    if [ "$all_checks_passed" = true ]; then
        log "INFO" "✅ All Fly health checks passed"
        return 0
    else
        log "ERROR" "❌ One or more Fly health checks failed"
        return 1
    fi
}

# Trigger Fly repair
trigger_fly_repair() {
    log "WARN" "🛠️ Triggering Fly repair sequence"
    notify_dashboard "Triggering Fly repair sequence" "WARNING"
    
    # Call the repair script
    if [ -f "./scripts/repair-fly.sh" ]; then
        log "INFO" "🔧 Executing repair-fly.sh"
        ./scripts/repair-fly.sh >> "$LOG_DIR/fly-repair.log" 2>&1
        local repair_exit=$?
        
        if [ $repair_exit -eq 0 ]; then
            log "INFO" "✅ Fly repair completed successfully"
            notify_dashboard "Fly repair completed successfully" "SUCCESS"
        else
            log "ERROR" "❌ Fly repair failed (exit: $repair_exit)"
            notify_dashboard "Fly repair failed" "ERROR"
        fi
    else
        log "ERROR" "❌ Repair script not found: ./scripts/repair-fly.sh"
        notify_dashboard "Fly repair script not found" "ERROR"
    fi
}

# Start the watchdog daemon
start_daemon() {
    log "INFO" "🚀 Starting Fly watchdog daemon for $APP_NAME"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Check if already running
    if check_pid; then
        log "WARN" "Daemon already running (PID: $(cat $PID_FILE))"
        return 1
    fi
    
    # Start background monitoring
    (
        log "INFO" "📡 Starting Fly health monitoring loop"
        
        while true; do
            # Perform comprehensive health check
            if check_fly_health; then
                log "INFO" "✅ Fly health check passed"
            else
                log "ERROR" "❌ Fly health check failed"
                notify_dashboard "Fly health check failed" "ERROR"
                
                # Trigger repair after failure
                trigger_fly_repair
            fi
            
            # Wait before next check
            sleep $CHECK_INTERVAL
        done
    ) &
    
    local daemon_pid=$!
    echo $daemon_pid > "$PID_FILE"
    log "INFO" "✅ Fly watchdog daemon started with PID: $daemon_pid"
    
    return 0
}

# Stop the daemon
stop_daemon() {
    log "INFO" "🛑 Stopping Fly watchdog daemon"
    
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

# Get daemon status
status() {
    if check_pid; then
        local pid=$(cat "$PID_FILE")
        log "INFO" "✅ Fly watchdog daemon running (PID: $pid)"
        
        # Show recent logs
        if [ -f "$LOG_DIR/fly-watchdog.log" ]; then
            log "INFO" "📋 Recent watchdog logs:"
            tail -5 "$LOG_DIR/fly-watchdog.log" | while IFS= read -r line; do
                echo "  $line"
            done
        fi
        
        return 0
    else
        log "WARN" "❌ Fly watchdog daemon not running"
        return 1
    fi
}

# Run single health check
health_check() {
    log "INFO" "🔍 Running single Fly health check"
    check_fly_health
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
    health)
        health_check
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|health}"
        echo "  start   - Start the Fly watchdog daemon"
        echo "  stop    - Stop the Fly watchdog daemon"
        echo "  restart - Restart the Fly watchdog daemon"
        echo "  status  - Show daemon status and recent logs"
        echo "  health  - Run single health check"
        exit 1
        ;;
esac 