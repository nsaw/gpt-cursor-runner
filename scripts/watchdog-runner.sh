#!/bin/bash

# Patch Runner Watchdog Daemon v1.0
# Monitors patch-runner health and functionality
# Part of the hardened fallback pipeline for GHOST↔DEV reliability

set -e

# Configuration
RUNNER_PORT=5000
HEALTH_ENDPOINT="http://localhost:$RUNNER_PORT/health"
LOG_DIR="./logs/watchdogs"
PID_FILE="./logs/watchdog-runner.pid"
CHECK_INTERVAL=30
MAX_RETRIES=3
DASHBOARD_WEBHOOK="https://gpt-cursor-runner.fly.dev/slack/commands"
SUMMARIES_DIR="./summaries"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Generate operation UUID for tracking
OPERATION_UUID=$(uuidgen)
START_TIME=$(date +%s)

# Ensure summaries directory exists
mkdir -p "$SUMMARIES_DIR"

# Write summary function
write_summary() {
    local event_type="$1"
    local title="$2"
    local content="$3"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local filename="summary-runner-watchdog-${event_type}_${timestamp}.md"
    local filepath="$SUMMARIES_DIR/$filename"
    
    cat > "$filepath" << EOF
# $title

**Event Type:** $event_type
**Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
**Watchdog:** Runner
**Context:** Patch Runner

$content

EOF
    
    echo "📝 Summary written: $filepath"
}

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
    
    # Check for Python patch-runner process
    if pgrep -f "python.*patch_runner" >/dev/null 2>&1; then
        log "INFO" "✅ Patch-runner daemon is running"
        return 0
    else
        log "ERROR" "❌ Patch-runner daemon is not running"
        return 1
    fi
}

# Check runner port
check_runner_port() {
    log "INFO" "🔍 Checking runner port $RUNNER_PORT"
    
    if netstat -an 2>/dev/null | grep -q ":$RUNNER_PORT.*LISTEN"; then
        log "INFO" "✅ Runner port $RUNNER_PORT is listening"
        return 0
    elif lsof -i :$RUNNER_PORT >/dev/null 2>&1; then
        log "INFO" "✅ Runner port $RUNNER_PORT is in use"
        return 0
    else
        log "ERROR" "❌ Runner port $RUNNER_PORT is not listening"
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

# Check Python patch runner module
check_python_runner() {
    log "INFO" "🔍 Checking Python patch runner module"
    
    if python3 -c "from gpt_cursor_runner.patch_runner import apply_patch; print('✅ Patch runner module available')" 2>/dev/null; then
        log "INFO" "✅ Python patch runner module is available"
        return 0
    else
        log "ERROR" "❌ Python patch runner module is not available"
        return 1
    fi
}

# Check patch queue health
check_patch_queue() {
    log "INFO" "🔍 Checking patch queue health"
    
    # Check if patches directory exists and has files
    if [ -d "patches" ] && [ "$(ls -A patches 2>/dev/null)" ]; then
        local patch_count=$(find patches -name "*.json" | wc -l)
        log "INFO" "✅ Patch queue has $patch_count patches"
        return 0
    else
        log "WARN" "⚠️ Patch queue is empty or directory not found"
        return 0  # Not a failure, just empty
    fi
}

# Check runner logs for errors
check_runner_logs() {
    log "INFO" "🔍 Checking runner logs for errors"
    
    local error_found=false
    local log_files=(
        "logs/patch-failures/*.log"
        "logs/watchdogs/*.log"
        "patch-log.json"
    )
    
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
    
    # Write repair summary
    write_summary "repair_triggered" "Runner Watchdog Repair Triggered" "
## Runner Watchdog Repair Triggered

The runner watchdog has detected health issues and is triggering repair sequence.

### Repair Details
- **Watchdog:** Runner
- **Trigger:** Health check failure
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Next Steps
1. Execute repair-runner.sh script
2. Monitor repair progress
3. Verify health after repair
"
    
    # Call the repair script using safe-run
    if [ -f "./scripts/repair-runner.sh" ]; then
        log "INFO" "🔧 Executing repair-runner.sh via safe-run"
        ./scripts/safe-run.sh shell "./scripts/repair-runner.sh" "Runner Repair" 120
        local repair_exit=$?
        
        if [ $repair_exit -eq 0 ]; then
            log "INFO" "✅ Runner repair completed successfully"
            notify_dashboard "Runner repair completed successfully" "SUCCESS"
            
            # Write success summary
            write_summary "repair_success" "Runner Watchdog Repair Success" "
## Runner Watchdog Repair Success

The runner repair sequence completed successfully.

### Repair Results
- **Status:** SUCCESS
- **Exit Code:** $repair_exit
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Health Status
- **Runner:** Patch Runner
- **Repair:** Completed
- **Next Check:** In $CHECK_INTERVAL seconds
"
        else
            log "ERROR" "❌ Runner repair failed (exit: $repair_exit)"
            notify_dashboard "Runner repair failed" "ERROR"
            
            # Write failure summary
            write_summary "repair_failure" "Runner Watchdog Repair Failure" "
## Runner Watchdog Repair Failure

The runner repair sequence failed.

### Repair Results
- **Status:** FAILED
- **Exit Code:** $repair_exit
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Error Details
- **Script:** repair-runner.sh
- **Exit Code:** $repair_exit
- **Context:** Runner health check failure

### Next Steps
1. Check repair script logs
2. Manual intervention may be required
3. Monitor for additional failures
"
        fi
    else
        log "ERROR" "❌ Repair script not found: ./scripts/repair-runner.sh"
        notify_dashboard "Runner repair script not found" "ERROR"
        
        # Write missing script summary
        write_summary "repair_script_missing" "Runner Watchdog Repair Script Missing" "
## Runner Watchdog Repair Script Missing

The runner repair script was not found.

### Error Details
- **Missing Script:** ./scripts/repair-runner.sh
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Impact
- Automatic repair is not available
- Manual intervention required
- Health issues may persist

### Next Steps
1. Create repair-runner.sh script
2. Implement repair logic
3. Test repair functionality
"
    fi
}

# Start the watchdog daemon (FOREGROUND for launchd)
start_daemon() {
    log "INFO" "🚀 Starting patch-runner watchdog daemon"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Check if already running
    if check_pid; then
        log "WARN" "Daemon already running (PID: $(cat $PID_FILE))"
        return 1
    fi
    
    # Write startup summary
    write_summary "started" "Runner Watchdog Started" "
## Runner Watchdog Started

The runner watchdog daemon has been started.

### Startup Details
- **Health Endpoint:** $HEALTH_ENDPOINT
- **Check Interval:** $CHECK_INTERVAL seconds
- **PID File:** $PID_FILE
- **Log Directory:** $LOG_DIR

### Configuration
- **Max Retries:** $MAX_RETRIES
- **Dashboard Webhook:** $DASHBOARD_WEBHOOK
- **Operation UUID:** $OPERATION_UUID

### Status
- **State:** STARTING
- **Mode:** FOREGROUND (launchd compatible)
- **Monitoring:** Active
"
    
    # Save current PID for launchd
    echo $$ > "$PID_FILE"
    log "INFO" "✅ Patch-runner watchdog daemon started with PID: $$"
    
    # Write daemon summary
    write_summary "daemon_running" "Runner Watchdog Daemon Running" "
## Runner Watchdog Daemon Running

The runner watchdog is now running in foreground mode.

### Daemon Status
- **PID:** $$
- **Mode:** FOREGROUND
- **Launchd:** Compatible
- **Status:** ACTIVE

### Monitoring Loop
- **Health Checks:** Every $CHECK_INTERVAL seconds
- **Repair Triggers:** On health failure
- **Summary Generation:** On all events
"
    
    # FOREGROUND MONITORING LOOP (no backgrounding)
    log "INFO" "📡 Starting patch-runner health monitoring loop (FOREGROUND)"
    
    while true; do
        # Perform comprehensive health check
        if check_runner_health_comprehensive; then
            log "INFO" "✅ Patch-runner health check passed"
            
            # Write periodic health summary (every 10th check)
            local check_count=$(( (SECONDS - START_TIME) / CHECK_INTERVAL ))
            if [ $((check_count % 10)) -eq 0 ]; then
                write_summary "health_ok" "Runner Health Check OK" "
## Runner Health Check OK

Periodic health check completed successfully.

### Health Status
- **Runner:** Patch Runner
- **Status:** HEALTHY
- **Check Count:** $check_count
- **Uptime:** $((SECONDS - START_TIME)) seconds

### All Checks Passed
- ✅ Patch-runner daemon running
- ✅ Runner port listening
- ✅ Health endpoint
- ✅ Python module available
- ✅ Patch queue accessible
- ✅ No recent errors in logs
"
            fi
        else
            log "ERROR" "❌ Patch-runner health check failed"
            notify_dashboard "Patch-runner health check failed" "ERROR"
            
            # Write failure summary
            write_summary "health_failure" "Runner Health Check Failed" "
## Runner Health Check Failed

The runner health check has failed.

### Failure Details
- **Runner:** Patch Runner
- **Status:** UNHEALTHY
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Health Checks
- ❌ Patch-runner daemon running
- ❌ Runner port listening
- ❌ Health endpoint
- ❌ Python module available
- ❌ Patch queue accessible
- ❌ Recent errors in logs

### Next Action
- Triggering repair sequence
- Monitoring repair progress
- Re-checking health after repair
"
            
            # Trigger repair after failure
            trigger_runner_repair
        fi
        
        # Wait before next check
        sleep $CHECK_INTERVAL
    done
}

# Stop the daemon
stop_daemon() {
    log "INFO" "🛑 Stopping patch-runner watchdog daemon"
    
    # Write stop summary
    write_summary "stopped" "Runner Watchdog Stopped" "
## Runner Watchdog Stopped

The runner watchdog daemon has been stopped.

### Stop Details
- **Runner:** Patch Runner
- **PID:** $$
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Status
- **State:** STOPPED
- **Monitoring:** Inactive
- **Health Checks:** Disabled
"
    
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
        
        # Write status summary
        write_summary "status_check" "Runner Watchdog Status Check" "
## Runner Watchdog Status Check

The runner watchdog daemon is running.

### Status Details
- **Runner:** Patch Runner
- **PID:** $pid
- **Status:** RUNNING
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Recent Activity
- **Health Checks:** Active
- **Monitoring:** Enabled
- **Logs:** Available
"
        
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
        
        # Write not running summary
        write_summary "not_running" "Runner Watchdog Not Running" "
## Runner Watchdog Not Running

The runner watchdog daemon is not currently running.

### Status Details
- **Runner:** Patch Runner
- **Status:** STOPPED
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Impact
- **Health Monitoring:** Disabled
- **Automatic Repair:** Unavailable
- **Dashboard Alerts:** Inactive

### Next Steps
1. Start the watchdog daemon
2. Check for startup errors
3. Verify launchd configuration
"
        
        return 1
    fi
}

# Run single health check
health_check() {
    log "INFO" "🔍 Running single patch-runner health check"
    
    # Write single check summary
    write_summary "single_check" "Runner Single Health Check" "
## Runner Single Health Check

Performing a single health check.

### Check Details
- **Runner:** Patch Runner
- **Type:** Single Check
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
"
    
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
        echo "  start   - Start the patch-runner watchdog daemon (FOREGROUND)"
        echo "  stop    - Stop the patch-runner watchdog daemon"
        echo "  restart - Restart the patch-runner watchdog daemon"
        echo "  status  - Show daemon status and recent logs"
        echo "  health  - Run single health check"
        exit 1
        ;;
esac 