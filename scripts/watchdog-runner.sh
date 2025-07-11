#!/bin/bash

# Patch Runner Watchdog Daemon v1.0
# Monitors patch-runner daemon health and queue status
# Part of the hardened fallback pipeline for GHOST↔DEV reliability

set -e

# Configuration
RUNNER_PORT=5052
HEALTH_ENDPOINT="http://localhost:$RUNNER_PORT/health"
LOG_DIR="./logs/watchdogs"
PID_FILE="./logs/watchdog-runner.pid"
RUNNER_PID_FILE="./logs/local-daemon.pid"
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
    echo "[$timestamp] [${OPERATION_UUID}] [$level] $message" | tee -a "$LOG_DIR/runner-watchdog.log"
}

# Notify dashboard of status changes
notify_dashboard() {
    local message="$1"
    local level="${2:-INFO}"
    
    curl -s --max-time 10 -X POST "$DASHBOARD_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{
            \"command\": \"/alert-runner-crash\",
            \"text\": \"[RUNNER-WATCHDOG] ${level}: ${message}\",
            \"user_name\": \"runner-watchdog\",
            \"channel_id\": \"infrastructure\"
        }" >> "$LOG_DIR/runner-watchdog.log" 2>&1 || log "WARN" "Dashboard notification failed"
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

# Check if patch-runner daemon is running
check_runner_daemon() {
    log "INFO" "🔍 Checking if patch-runner daemon is running"
    
    if [ -f "$RUNNER_PID_FILE" ]; then
        local runner_pid=$(cat "$RUNNER_PID_FILE")
        if kill -0 "$runner_pid" 2>/dev/null; then
            log "INFO" "✅ Patch-runner daemon running (PID: $runner_pid)"
            return 0
        else
            log "ERROR" "❌ Patch-runner daemon not running (stale PID: $runner_pid)"
            return 1
        fi
    else
        log "ERROR" "❌ Patch-runner PID file not found"
        return 1
    fi
}

# Check runner health endpoint
check_runner_health() {
    log "INFO" "🔍 Checking runner health endpoint: $HEALTH_ENDPOINT"
    
    local health_response
    health_response=$(curl -s --max-time 10 "$HEALTH_ENDPOINT" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ] && echo "$health_response" | grep -q "OK\|healthy\|alive"; then
        log "INFO" "✅ Runner health endpoint check passed"
        return 0
    else
        log "ERROR" "❌ Runner health endpoint check failed (exit: $exit_code): $health_response"
        return 1
    fi
}

# Check if runner port is listening
check_runner_port() {
    log "INFO" "🔍 Checking if runner port $RUNNER_PORT is listening"
    
    if netstat -an 2>/dev/null | grep -q ":$RUNNER_PORT.*LISTEN"; then
        log "INFO" "✅ Runner port $RUNNER_PORT is listening"
        return 0
    else
        log "ERROR" "❌ Runner port $RUNNER_PORT is not listening"
        return 1
    fi
}

# Check patch queue health
check_patch_queue() {
    log "INFO" "🔍 Checking patch queue health"
    
    # Check if patches directory exists and is accessible
    if [ ! -d "./patches" ]; then
        log "ERROR" "❌ Patches directory not found"
        return 1
    fi
    
    # Check for stuck or failed patches
    local failed_patches=$(find ./patches -name "*.json" -mtime +1 2>/dev/null | wc -l)
    if [ "$failed_patches" -gt 0 ]; then
        log "WARN" "⚠️ Found $failed_patches potentially stuck patches"
    else
        log "INFO" "✅ No stuck patches detected"
    fi
    
    # Check quarantine directory
    if [ -d "./quarantine" ]; then
        local quarantined_patches=$(find ./quarantine -name "*.json" 2>/dev/null | wc -l)
        if [ "$quarantined_patches" -gt 0 ]; then
            log "WARN" "⚠️ Found $quarantined_patches quarantined patches"
        fi
    fi
    
    return 0
}

# Check Python patch runner module
check_python_runner() {
    log "INFO" "🔍 Checking Python patch runner module"
    
    if python3 -c "import gpt_cursor_runner.patch_runner" 2>/dev/null; then
        log "INFO" "✅ Python patch runner module available"
        return 0
    else
        log "ERROR" "❌ Python patch runner module not available"
        return 1
    fi
}

# Check patch runner logs for errors
check_runner_logs() {
    log "INFO" "🔍 Checking patch runner logs for errors"
    
    local log_files=(
        "./logs/patch-daemon.log"
        "./logs/patch-application.log"
        "./logs/patch-daemon-error.log"
    )
    
    local error_found=false
    
    for log_file in "${log_files[@]}"; do
        if [ -f "$log_file" ]; then
            # Check for error patterns in recent logs
            local recent_errors=$(tail -50 "$log_file" | grep -c -E "(ERROR|FAIL|Exception|Traceback)" || echo "0")
            if [ "$recent_errors" -gt 0 ]; then
                log "WARN" "⚠️ Found $recent_errors errors in $log_file"
                error_found=true
            fi
        fi
    done
    
    if [ "$error_found" = false ]; then
        log "INFO" "✅ No recent errors in patch runner logs"
        return 0
    else
        return 1
    fi
}

# Comprehensive runner health check
check_runner_health_comprehensive() {
    local all_checks_passed=true
    
    # Check if patch-runner daemon is running
    if ! check_runner_daemon; then
        all_checks_passed=false
    fi
    
    # Check runner port
    if ! check_runner_port; then
        all_checks_passed=false
    fi
    
    # Check runner health endpoint
    if ! check_runner_health; then
        all_checks_passed=false
    fi
    
    # Check Python patch runner module
    if ! check_python_runner; then
        all_checks_passed=false
    fi
    
    # Check patch queue health
    if ! check_patch_queue; then
        all_checks_passed=false
    fi
    
    # Check runner logs
    if ! check_runner_logs; then
        all_checks_passed=false
    fi
    
    if [ "$all_checks_passed" = true ]; then
        log "INFO" "✅ All runner health checks passed"
        return 0
    else
        log "ERROR" "❌ One or more runner health checks failed"
        return 1
    fi
}

# Trigger runner repair
trigger_runner_repair() {
    log "WARN" "🛠️ Triggering runner repair sequence"
    notify_dashboard "Triggering runner repair sequence" "WARNING"
    
    # Call the repair script
    if [ -f "./scripts/repair-runner.sh" ]; then
        log "INFO" "🔧 Executing repair-runner.sh"
        ./scripts/repair-runner.sh >> "$LOG_DIR/runner-repair.log" 2>&1
        local repair_exit=$?
        
        if [ $repair_exit -eq 0 ]; then
            log "INFO" "✅ Runner repair completed successfully"
            notify_dashboard "Runner repair completed successfully" "SUCCESS"
        else
            log "ERROR" "❌ Runner repair failed (exit: $repair_exit)"
            notify_dashboard "Runner repair failed" "ERROR"
        fi
    else
        log "ERROR" "❌ Repair script not found: ./scripts/repair-runner.sh"
        notify_dashboard "Runner repair script not found" "ERROR"
    fi
}

# Start the watchdog daemon
start_daemon() {
    log "INFO" "🚀 Starting patch-runner watchdog daemon"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Check if already running
    if check_pid; then
        log "WARN" "Daemon already running (PID: $(cat $PID_FILE))"
        return 1
    fi
    
    # Start background monitoring
    (
        log "INFO" "📡 Starting patch-runner health monitoring loop"
        
        while true; do
            # Perform comprehensive health check
            if check_runner_health_comprehensive; then
                log "INFO" "✅ Patch-runner health check passed"
            else
                log "ERROR" "❌ Patch-runner health check failed"
                notify_dashboard "Patch-runner health check failed" "ERROR"
                
                # Trigger repair after failure
                trigger_runner_repair
            fi
            
            # Wait before next check
            sleep $CHECK_INTERVAL
        done
    ) &
    
    local daemon_pid=$!
    echo $daemon_pid > "$PID_FILE"
    log "INFO" "✅ Patch-runner watchdog daemon started with PID: $daemon_pid"
    
    return 0
}

# Stop the daemon
stop_daemon() {
    log "INFO" "🛑 Stopping patch-runner watchdog daemon"
    
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
        log "INFO" "✅ Patch-runner watchdog daemon running (PID: $pid)"
        
        # Show recent logs
        if [ -f "$LOG_DIR/runner-watchdog.log" ]; then
            log "INFO" "📋 Recent watchdog logs:"
            tail -5 "$LOG_DIR/runner-watchdog.log" | while IFS= read -r line; do
                echo "  $line"
            done
        fi
        
        return 0
    else
        log "WARN" "❌ Patch-runner watchdog daemon not running"
        return 1
    fi
}

# Run single health check
health_check() {
    log "INFO" "🔍 Running single patch-runner health check"
    check_runner_health_comprehensive
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
        echo "  start   - Start the patch-runner watchdog daemon"
        echo "  stop    - Stop the patch-runner watchdog daemon"
        echo "  restart - Restart the patch-runner watchdog daemon"
        echo "  status  - Show daemon status and recent logs"
        echo "  health  - Run single health check"
        exit 1
        ;;
esac 