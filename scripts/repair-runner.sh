#!/bin/bash

# Patch Runner Repair Script v1.0
# Repairs patch-runner daemon issues with logging and auto-retry capabilities
# Part of the hardened fallback pipeline for GHOST↔DEV reliability

set -e

# Configuration
RUNNER_PORT=5052
HEALTH_ENDPOINT="http://localhost:$RUNNER_PORT/health"
LOG_DIR="./logs/watchdogs"
LOG_FILE="$LOG_DIR/runner-repair.log"
RUNNER_PID_FILE="./logs/local-daemon.pid"
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
    echo "[$timestamp] [${OPERATION_UUID}] [$level] $message" | tee -a "$LOG_FILE"
}

# Notify dashboard of repair actions
notify_dashboard() {
    local message="$1"
    local level="${2:-INFO}"
    
    curl -s --max-time 10 -X POST "$DASHBOARD_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{
            \"command\": \"/alert-runner-crash\",
            \"text\": \"[RUNNER-REPAIR] ${level}: ${message}\",
            \"user_name\": \"runner-repair\",
            \"channel_id\": \"infrastructure\"
        }" >> "$LOG_FILE" 2>&1 || log "WARN" "Dashboard notification failed"
}

# Check if Python is available
check_python() {
    log "INFO" "🔍 Checking if Python is available"
    
    if command -v python3 >/dev/null 2>&1; then
        log "INFO" "✅ Python3 found in PATH"
        return 0
    else
        log "ERROR" "❌ Python3 not found in PATH"
        return 1
    fi
}

# Check Python patch runner module
check_python_module() {
    log "INFO" "🔍 Checking Python patch runner module"
    
    if python3 -c "import gpt_cursor_runner.patch_runner" 2>/dev/null; then
        log "INFO" "✅ Python patch runner module available"
        return 0
    else
        log "ERROR" "❌ Python patch runner module not available"
        return 1
    fi
}

# Kill existing runner processes
kill_runner_processes() {
    log "INFO" "🛑 Killing existing runner processes"
    
    # Kill by PID file
    if [ -f "$RUNNER_PID_FILE" ]; then
        local runner_pid=$(cat "$RUNNER_PID_FILE")
        if kill -0 "$runner_pid" 2>/dev/null; then
            kill "$runner_pid" 2>/dev/null
            log "INFO" "✅ Killed runner process (PID: $runner_pid)"
        fi
    fi
    
    # Kill any remaining Python runner processes
    local killed_count=0
    local pids=$(pgrep -f "python3.*gpt_cursor_runner" 2>/dev/null || echo "")
    
    if [ -n "$pids" ]; then
        for pid in $pids; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null
                killed_count=$((killed_count + 1))
                log "INFO" "✅ Killed Python runner process (PID: $pid)"
            fi
        done
    fi
    
    log "INFO" "✅ Killed $killed_count Python runner processes"
    
    # Wait for processes to fully terminate
    sleep 3
}

# Start patch runner daemon
start_runner_daemon() {
    local attempt=$1
    log "INFO" "🚀 Starting patch runner daemon (attempt $attempt/$MAX_RETRIES)"
    notify_dashboard "Starting patch runner daemon (attempt $attempt/$MAX_RETRIES)" "WARNING"
    
    # Start the daemon using the existing script
    if [ -f "./scripts/start-local-daemon.sh" ]; then
        local start_output
        start_output=$(./scripts/start-local-daemon.sh 2>&1)
        local exit_code=$?
        
        if [ $exit_code -eq 0 ]; then
            log "INFO" "✅ Patch runner daemon start initiated successfully"
            return 0
        else
            log "ERROR" "❌ Patch runner daemon start failed: $start_output"
            return 1
        fi
    else
        # Fallback: start directly
        log "INFO" "🔄 Using direct start method"
        nohup python3 -m gpt_cursor_runner.main >/dev/null 2>&1 &
        local runner_pid=$!
        echo $runner_pid > "$RUNNER_PID_FILE"
        log "INFO" "✅ Patch runner daemon started (PID: $runner_pid)"
        return 0
    fi
}

# Check runner health
check_runner_health() {
    log "INFO" "🔍 Checking runner health"
    
    # Check if runner process is running
    if [ -f "$RUNNER_PID_FILE" ]; then
        local runner_pid=$(cat "$RUNNER_PID_FILE")
        if ! kill -0 "$runner_pid" 2>/dev/null; then
            log "ERROR" "❌ Runner process not running (PID: $runner_pid)"
            return 1
        fi
    else
        log "ERROR" "❌ Runner PID file not found"
        return 1
    fi
    
    # Check if port is listening
    if ! netstat -an 2>/dev/null | grep -q ":$RUNNER_PORT.*LISTEN"; then
        log "ERROR" "❌ Runner port $RUNNER_PORT is not listening"
        return 1
    fi
    
    # Check health endpoint
    local health_response
    health_response=$(curl -s --max-time 10 "$HEALTH_ENDPOINT" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ] && echo "$health_response" | grep -q "OK\|healthy\|alive"; then
        log "INFO" "✅ Runner health check passed"
        return 0
    else
        log "ERROR" "❌ Runner health check failed (exit: $exit_code): $health_response"
        return 1
    fi
}

# Wait for runner to be healthy
wait_for_runner_health() {
    local max_wait=120  # 2 minutes
    local wait_time=0
    local check_interval=5
    
    log "INFO" "⏳ Waiting for runner to become healthy (max ${max_wait}s)"
    
    while [ $wait_time -lt $max_wait ]; do
        if check_runner_health; then
            log "INFO" "✅ Runner is healthy after ${wait_time}s"
            return 0
        fi
        
        sleep $check_interval
        wait_time=$((wait_time + check_interval))
        log "INFO" "⏳ Still waiting for runner health... (${wait_time}s elapsed)"
    done
    
    log "ERROR" "❌ Runner did not become healthy within ${max_wait}s"
    return 1
}

# Clean up stuck patches
cleanup_stuck_patches() {
    log "INFO" "🧹 Cleaning up stuck patches"
    
    # Move old patches to quarantine
    if [ -d "./patches" ]; then
        local old_patches=$(find ./patches -name "*.json" -mtime +1 2>/dev/null)
        local moved_count=0
        
        for patch in $old_patches; do
            if [ -f "$patch" ]; then
                local patch_name=$(basename "$patch")
                mkdir -p "./quarantine/stuck-patches"
                mv "$patch" "./quarantine/stuck-patches/$patch_name"
                moved_count=$((moved_count + 1))
                log "INFO" "✅ Moved stuck patch: $patch_name"
            fi
        done
        
        if [ $moved_count -gt 0 ]; then
            log "INFO" "✅ Moved $moved_count stuck patches to quarantine"
        else
            log "INFO" "ℹ️ No stuck patches found"
        fi
    fi
}

# Check runner logs for issues
check_runner_logs() {
    log "INFO" "🔍 Checking runner logs for issues"
    
    local log_files=(
        "./logs/patch-daemon.log"
        "./logs/patch-application.log"
        "./logs/patch-daemon-error.log"
    )
    
    local issues_found=false
    
    for log_file in "${log_files[@]}"; do
        if [ -f "$log_file" ]; then
            # Check for critical error patterns
            local critical_errors=$(tail -100 "$log_file" | grep -c -E "(panic|crash|segmentation fault|killed)" || echo "0")
            if [ "$critical_errors" -gt 0 ]; then
                log "WARN" "⚠️ Found $critical_errors critical errors in $log_file"
                issues_found=true
            fi
        fi
    done
    
    if [ "$issues_found" = false ]; then
        log "INFO" "✅ No critical issues in runner logs"
        return 0
    else
        return 1
    fi
}

# Main repair sequence
repair_runner() {
    log "INFO" "🚀 Starting patch runner repair sequence"
    notify_dashboard "Starting patch runner repair sequence" "WARNING"
    
    # Check if Python is available
    if ! check_python; then
        log "ERROR" "❌ Cannot repair runner - Python not available"
        notify_dashboard "Cannot repair runner - Python not available" "ERROR"
        return 1
    fi
    
    # Check Python module
    if ! check_python_module; then
        log "ERROR" "❌ Cannot repair runner - Python module not available"
        notify_dashboard "Cannot repair runner - Python module not available" "ERROR"
        return 1
    fi
    
    # Check current health
    if check_runner_health; then
        log "INFO" "✅ Runner is already healthy"
        return 0
    fi
    
    # Clean up stuck patches
    cleanup_stuck_patches
    
    # Kill existing processes
    kill_runner_processes
    
    # Attempt restart
    local attempt=1
    while [ $attempt -le $MAX_RETRIES ]; do
        log "INFO" "🔄 Repair attempt $attempt/$MAX_RETRIES"
        
        # Start runner
        if start_runner_daemon $attempt; then
            # Wait for health
            if wait_for_runner_health; then
                log "INFO" "✅ Runner repair successful"
                notify_dashboard "Runner repair successful" "SUCCESS"
                return 0
            fi
        fi
        
        attempt=$((attempt + 1))
        if [ $attempt -le $MAX_RETRIES ]; then
            log "INFO" "⏳ Waiting before next repair attempt..."
            sleep 10
        fi
    done
    
    # All repair attempts failed
    log "ERROR" "❌ All runner repair attempts failed"
    notify_dashboard "All runner repair attempts failed" "ERROR"
    
    # Log final status
    TOTAL_TIME=$(( $(date +%s) - START_TIME ))
    log "INFO" "📊 Runner repair metrics: ${TOTAL_TIME}s total time, ${MAX_RETRIES} restart attempts"
    
    return 1
}

# Main execution
main() {
    log "INFO" "🚀 Starting patch runner repair script (operation: $OPERATION_UUID)"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Run repair sequence
    if repair_runner; then
        log "INFO" "✅ Runner repair completed successfully"
        exit 0
    else
        log "ERROR" "❌ Runner repair failed"
        exit 1
    fi
}

# Run main function
main "$@" 