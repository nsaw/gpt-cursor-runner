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
    local filename="summary-fly-watchdog-${event_type}_${timestamp}.md"
    local filepath="$SUMMARIES_DIR/$filename"
    
    cat > "$filepath" << EOF
# $title

**Event Type:** $event_type
**Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
**Watchdog:** Fly
**Context:** $APP_NAME

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
    
    # Write repair summary
    write_summary "repair_triggered" "Fly Watchdog Repair Triggered" "
## Fly Watchdog Repair Triggered

The Fly watchdog has detected health issues and is triggering repair sequence.

### Repair Details
- **Watchdog:** Fly
- **App:** $APP_NAME
- **Trigger:** Health check failure
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Next Steps
1. Execute repair-fly.sh script
2. Monitor repair progress
3. Verify health after repair
"
    
    # Call the repair script using safe-run
    if [ -f "./scripts/repair-fly.sh" ]; then
        log "INFO" "🔧 Executing repair-fly.sh via safe-run"
        ./scripts/safe-run.sh shell "./scripts/repair-fly.sh" "Fly Repair" 120
        local repair_exit=$?
        
        if [ $repair_exit -eq 0 ]; then
            log "INFO" "✅ Fly repair completed successfully"
            notify_dashboard "Fly repair completed successfully" "SUCCESS"
            
            # Write success summary
            write_summary "repair_success" "Fly Watchdog Repair Success" "
## Fly Watchdog Repair Success

The Fly repair sequence completed successfully.

### Repair Results
- **Status:** SUCCESS
- **Exit Code:** $repair_exit
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Health Status
- **App:** $APP_NAME
- **Repair:** Completed
- **Next Check:** In $CHECK_INTERVAL seconds
"
        else
            log "ERROR" "❌ Fly repair failed (exit: $repair_exit)"
            notify_dashboard "Fly repair failed" "ERROR"
            
            # Write failure summary
            write_summary "repair_failure" "Fly Watchdog Repair Failure" "
## Fly Watchdog Repair Failure

The Fly repair sequence failed.

### Repair Results
- **Status:** FAILED
- **Exit Code:** $repair_exit
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Error Details
- **Script:** repair-fly.sh
- **Exit Code:** $repair_exit
- **Context:** Fly health check failure

### Next Steps
1. Check repair script logs
2. Manual intervention may be required
3. Monitor for additional failures
"
        fi
    else
        log "ERROR" "❌ Repair script not found: ./scripts/repair-fly.sh"
        notify_dashboard "Fly repair script not found" "ERROR"
        
        # Write missing script summary
        write_summary "repair_script_missing" "Fly Watchdog Repair Script Missing" "
## Fly Watchdog Repair Script Missing

The Fly repair script was not found.

### Error Details
- **Missing Script:** ./scripts/repair-fly.sh
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Impact
- Automatic repair is not available
- Manual intervention required
- Health issues may persist

### Next Steps
1. Create repair-fly.sh script
2. Implement repair logic
3. Test repair functionality
"
    fi
}

# Start the watchdog daemon (FOREGROUND for launchd)
start_daemon() {
    log "INFO" "🚀 Starting Fly watchdog daemon for $APP_NAME"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Check if already running
    if check_pid; then
        log "WARN" "Daemon already running (PID: $(cat $PID_FILE))"
        return 1
    fi
    
    # Write startup summary
    write_summary "started" "Fly Watchdog Started" "
## Fly Watchdog Started

The Fly watchdog daemon has been started.

### Startup Details
- **App:** $APP_NAME
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
    log "INFO" "✅ Fly watchdog daemon started with PID: $$"
    
    # Write daemon summary
    write_summary "daemon_running" "Fly Watchdog Daemon Running" "
## Fly Watchdog Daemon Running

The Fly watchdog is now running in foreground mode.

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
    log "INFO" "📡 Starting Fly health monitoring loop (FOREGROUND)"
    
    while true; do
        # Perform comprehensive health check
        if check_fly_health; then
            log "INFO" "✅ Fly health check passed"
            
            # Write periodic health summary (every 10th check)
            local check_count=$(( (SECONDS - START_TIME) / CHECK_INTERVAL ))
            if [ $((check_count % 10)) -eq 0 ]; then
                write_summary "health_ok" "Fly Health Check OK" "
## Fly Health Check OK

Periodic health check completed successfully.

### Health Status
- **App:** $APP_NAME
- **Status:** HEALTHY
- **Check Count:** $check_count
- **Uptime:** $((SECONDS - START_TIME)) seconds

### All Checks Passed
- ✅ Fly app status
- ✅ Health endpoint
- ✅ Recent logs
"
            fi
        else
            log "ERROR" "❌ Fly health check failed"
            notify_dashboard "Fly health check failed" "ERROR"
            
            # Write failure summary
            write_summary "health_failure" "Fly Health Check Failed" "
## Fly Health Check Failed

The Fly health check has failed.

### Failure Details
- **App:** $APP_NAME
- **Status:** UNHEALTHY
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Health Checks
- ❌ Fly app status
- ❌ Health endpoint  
- ❌ Recent logs

### Next Action
- Triggering repair sequence
- Monitoring repair progress
- Re-checking health after repair
"
            
            # Trigger repair after failure
            trigger_fly_repair
        fi
        
        # Wait before next check
        sleep $CHECK_INTERVAL
    done
}

# Stop the daemon
stop_daemon() {
    log "INFO" "🛑 Stopping Fly watchdog daemon"
    
    # Write stop summary
    write_summary "stopped" "Fly Watchdog Stopped" "
## Fly Watchdog Stopped

The Fly watchdog daemon has been stopped.

### Stop Details
- **App:** $APP_NAME
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
        log "INFO" "✅ Fly watchdog daemon running (PID: $pid)"
        
        # Write status summary
        write_summary "status_check" "Fly Watchdog Status Check" "
## Fly Watchdog Status Check

The Fly watchdog daemon is running.

### Status Details
- **App:** $APP_NAME
- **PID:** $pid
- **Status:** RUNNING
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Recent Activity
- **Health Checks:** Active
- **Monitoring:** Enabled
- **Logs:** Available
"
        
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
        
        # Write not running summary
        write_summary "not_running" "Fly Watchdog Not Running" "
## Fly Watchdog Not Running

The Fly watchdog daemon is not currently running.

### Status Details
- **App:** $APP_NAME
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
    log "INFO" "🔍 Running single Fly health check"
    
    # Write single check summary
    write_summary "single_check" "Fly Single Health Check" "
## Fly Single Health Check

Performing a single health check.

### Check Details
- **App:** $APP_NAME
- **Type:** Single Check
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
"
    
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
        echo "  start   - Start the Fly watchdog daemon (FOREGROUND)"
        echo "  stop    - Stop the Fly watchdog daemon"
        echo "  restart - Restart the Fly watchdog daemon"
        echo "  status  - Show daemon status and recent logs"
        echo "  health  - Run single health check"
        exit 1
        ;;
esac 