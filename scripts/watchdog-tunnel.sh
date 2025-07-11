#!/bin/bash

# Tunnel Watchdog Daemon v1.0
# Monitors Cloudflare tunnel health and connectivity
# Part of the hardened fallback pipeline for GHOST↔DEV reliability

set -e

# Configuration
TUNNEL_NAME="gpt-cursor-runner-tunnel"
RUNNER_PORT=5000
HEALTH_ENDPOINT="http://localhost:$RUNNER_PORT/health"
LOG_DIR="./logs/watchdogs"
PID_FILE="./logs/watchdog-tunnel.pid"
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
    local filename="summary-tunnel-watchdog-${event_type}_${timestamp}.md"
    local filepath="$SUMMARIES_DIR/$filename"
    
    cat > "$filepath" << EOF
# $title

**Event Type:** $event_type
**Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
**Watchdog:** Tunnel
**Context:** $TUNNEL_NAME

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
    echo "[$timestamp] [${OPERATION_UUID}] [$level] $message" | tee -a "$LOG_DIR/tunnel-watchdog.log"
}

# Notify dashboard of status changes
notify_dashboard() {
    local message="$1"
    local level="${2:-INFO}"
    
    curl -s --max-time 10 -X POST "$DASHBOARD_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{
            \"command\": \"/alert-runner-crash\",
            \"text\": \"[TUNNEL-WATCHDOG] ${level}: ${message}\",
            \"user_name\": \"tunnel-watchdog\",
            \"channel_id\": \"infrastructure\"
        }" >> "$LOG_DIR/tunnel-watchdog.log" 2>&1 || log "WARN" "Dashboard notification failed"
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

# Check if cloudflared is installed
check_cloudflared_installed() {
    log "INFO" "🔍 Checking if cloudflared is installed"
    
    if command -v cloudflared >/dev/null 2>&1; then
        log "INFO" "✅ cloudflared is installed"
        return 0
    else
        log "ERROR" "❌ cloudflared is not installed"
        return 1
    fi
}

# Check if cloudflared process is running
check_cloudflared_process() {
    log "INFO" "🔍 Checking if cloudflared process is running"
    
    if pgrep -f "cloudflared" >/dev/null 2>&1; then
        log "INFO" "✅ cloudflared process is running"
        return 0
    else
        log "ERROR" "❌ cloudflared process is not running"
        return 1
    fi
}

# Check tunnel configuration
check_tunnel_config() {
    log "INFO" "🔍 Checking tunnel configuration"
    
    # Check if tunnel config file exists
    local config_file="$HOME/.cloudflared/config.yml"
    if [ -f "$config_file" ]; then
        log "INFO" "✅ Tunnel config file exists: $config_file"
        return 0
    else
        log "WARN" "⚠️ Tunnel config file not found: $config_file"
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

# Check localhost endpoint
check_localhost_endpoint() {
    log "INFO" "🔍 Checking localhost endpoint: $HEALTH_ENDPOINT"
    
    local health_response
    health_response=$(curl -s --max-time 10 "$HEALTH_ENDPOINT" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ] && echo "$health_response" | grep -q "OK\|healthy\|alive"; then
        log "INFO" "✅ Localhost endpoint check passed"
        return 0
    else
        log "ERROR" "❌ Localhost endpoint check failed (exit: $exit_code): $health_response"
        return 1
    fi
}

# Test external connectivity
test_external_connectivity() {
    log "INFO" "🔍 Testing external connectivity"
    
    local fallback_urls=(
        "https://gpt-cursor-runner.fly.dev/health"
        "https://httpbin.org/get"
        "https://api.github.com/zen"
    )
    
    for url in "${fallback_urls[@]}"; do
        if curl -s --max-time 10 "$url" >/dev/null 2>&1; then
            log "INFO" "✅ External connectivity confirmed via $url"
            return 0
        fi
    done
    
    log "ERROR" "❌ All external connectivity tests failed"
    return 1
}

# Comprehensive tunnel health check
check_tunnel_health() {
    local all_checks_passed=true
    
    # Check if cloudflared is installed
    if ! check_cloudflared_installed; then
        all_checks_passed=false
    fi
    
    # Check if cloudflared process is running
    if ! check_cloudflared_process; then
        all_checks_passed=false
    fi
    
    # Check tunnel configuration
    if ! check_tunnel_config; then
        all_checks_passed=false
    fi
    
    # Check runner port
    if ! check_runner_port; then
        all_checks_passed=false
    fi
    
    # Check localhost endpoint
    if ! check_localhost_endpoint; then
        all_checks_passed=false
    fi
    
    # Test external connectivity
    if ! test_external_connectivity; then
        all_checks_passed=false
    fi
    
    if [ "$all_checks_passed" = true ]; then
        log "INFO" "✅ All tunnel health checks passed"
        return 0
    else
        log "ERROR" "❌ One or more tunnel health checks failed"
        return 1
    fi
}

# Trigger tunnel repair
trigger_tunnel_repair() {
    log "WARN" "🛠️ Triggering tunnel repair sequence"
    notify_dashboard "Triggering tunnel repair sequence" "WARNING"
    
    # Write repair summary
    write_summary "repair_triggered" "Tunnel Watchdog Repair Triggered" "
## Tunnel Watchdog Repair Triggered

The tunnel watchdog has detected health issues and is triggering repair sequence.

### Repair Details
- **Watchdog:** Tunnel
- **Tunnel:** $TUNNEL_NAME
- **Trigger:** Health check failure
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Next Steps
1. Execute repair-tunnel.sh script
2. Monitor repair progress
3. Verify health after repair
"
    
    # Call the repair script using safe-run
    if [ -f "./scripts/repair-tunnel.sh" ]; then
        log "INFO" "🔧 Executing repair-tunnel.sh via safe-run"
        ./scripts/safe-run.sh shell "./scripts/repair-tunnel.sh" "Tunnel Repair" 120
        local repair_exit=$?
        
        if [ $repair_exit -eq 0 ]; then
            log "INFO" "✅ Tunnel repair completed successfully"
            notify_dashboard "Tunnel repair completed successfully" "SUCCESS"
            
            # Write success summary
            write_summary "repair_success" "Tunnel Watchdog Repair Success" "
## Tunnel Watchdog Repair Success

The tunnel repair sequence completed successfully.

### Repair Results
- **Status:** SUCCESS
- **Exit Code:** $repair_exit
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Health Status
- **Tunnel:** $TUNNEL_NAME
- **Repair:** Completed
- **Next Check:** In $CHECK_INTERVAL seconds
"
        else
            log "ERROR" "❌ Tunnel repair failed (exit: $repair_exit)"
            notify_dashboard "Tunnel repair failed" "ERROR"
            
            # Write failure summary
            write_summary "repair_failure" "Tunnel Watchdog Repair Failure" "
## Tunnel Watchdog Repair Failure

The tunnel repair sequence failed.

### Repair Results
- **Status:** FAILED
- **Exit Code:** $repair_exit
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Error Details
- **Script:** repair-tunnel.sh
- **Exit Code:** $repair_exit
- **Context:** Tunnel health check failure

### Next Steps
1. Check repair script logs
2. Manual intervention may be required
3. Monitor for additional failures
"
        fi
    else
        log "ERROR" "❌ Repair script not found: ./scripts/repair-tunnel.sh"
        notify_dashboard "Tunnel repair script not found" "ERROR"
        
        # Write missing script summary
        write_summary "repair_script_missing" "Tunnel Watchdog Repair Script Missing" "
## Tunnel Watchdog Repair Script Missing

The tunnel repair script was not found.

### Error Details
- **Missing Script:** ./scripts/repair-tunnel.sh
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Impact
- Automatic repair is not available
- Manual intervention required
- Health issues may persist

### Next Steps
1. Create repair-tunnel.sh script
2. Implement repair logic
3. Test repair functionality
"
    fi
}

# Start the watchdog daemon (FOREGROUND for launchd)
start_daemon() {
    log "INFO" "🚀 Starting tunnel watchdog daemon for $TUNNEL_NAME"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Check if already running
    if check_pid; then
        log "WARN" "Daemon already running (PID: $(cat $PID_FILE))"
        return 1
    fi
    
    # Write startup summary
    write_summary "started" "Tunnel Watchdog Started" "
## Tunnel Watchdog Started

The tunnel watchdog daemon has been started.

### Startup Details
- **Tunnel:** $TUNNEL_NAME
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
    log "INFO" "✅ Tunnel watchdog daemon started with PID: $$"
    
    # Write daemon summary
    write_summary "daemon_running" "Tunnel Watchdog Daemon Running" "
## Tunnel Watchdog Daemon Running

The tunnel watchdog is now running in foreground mode.

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
    log "INFO" "📡 Starting tunnel health monitoring loop (FOREGROUND)"
    
    while true; do
        # Perform comprehensive health check
        if check_tunnel_health; then
            log "INFO" "✅ Tunnel health check passed"
            
            # Write periodic health summary (every 10th check)
            local check_count=$(( (SECONDS - START_TIME) / CHECK_INTERVAL ))
            if [ $((check_count % 10)) -eq 0 ]; then
                write_summary "health_ok" "Tunnel Health Check OK" "
## Tunnel Health Check OK

Periodic health check completed successfully.

### Health Status
- **Tunnel:** $TUNNEL_NAME
- **Status:** HEALTHY
- **Check Count:** $check_count
- **Uptime:** $((SECONDS - START_TIME)) seconds

### All Checks Passed
- ✅ cloudflared installed
- ✅ cloudflared process running
- ✅ tunnel configuration
- ✅ runner port listening
- ✅ localhost endpoint
- ✅ external connectivity
"
            fi
        else
            log "ERROR" "❌ Tunnel health check failed"
            notify_dashboard "Tunnel health check failed" "ERROR"
            
            # Write failure summary
            write_summary "health_failure" "Tunnel Health Check Failed" "
## Tunnel Health Check Failed

The tunnel health check has failed.

### Failure Details
- **Tunnel:** $TUNNEL_NAME
- **Status:** UNHEALTHY
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Health Checks
- ❌ cloudflared installed
- ❌ cloudflared process running
- ❌ tunnel configuration
- ❌ runner port listening
- ❌ localhost endpoint
- ❌ external connectivity

### Next Action
- Triggering repair sequence
- Monitoring repair progress
- Re-checking health after repair
"
            
            # Trigger repair after failure
            trigger_tunnel_repair
        fi
        
        # Wait before next check
        sleep $CHECK_INTERVAL
    done
}

# Stop the daemon
stop_daemon() {
    log "INFO" "🛑 Stopping tunnel watchdog daemon"
    
    # Write stop summary
    write_summary "stopped" "Tunnel Watchdog Stopped" "
## Tunnel Watchdog Stopped

The tunnel watchdog daemon has been stopped.

### Stop Details
- **Tunnel:** $TUNNEL_NAME
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
        log "INFO" "✅ Tunnel watchdog daemon running (PID: $pid)"
        
        # Write status summary
        write_summary "status_check" "Tunnel Watchdog Status Check" "
## Tunnel Watchdog Status Check

The tunnel watchdog daemon is running.

### Status Details
- **Tunnel:** $TUNNEL_NAME
- **PID:** $pid
- **Status:** RUNNING
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

### Recent Activity
- **Health Checks:** Active
- **Monitoring:** Enabled
- **Logs:** Available
"
        
        # Show recent logs
        if [ -f "$LOG_DIR/tunnel-watchdog.log" ]; then
            log "INFO" "📋 Recent watchdog logs:"
            tail -5 "$LOG_DIR/tunnel-watchdog.log" | while IFS= read -r line; do
                echo "  $line"
            done
        fi
        
        return 0
    else
        log "WARN" "❌ Tunnel watchdog daemon not running"
        
        # Write not running summary
        write_summary "not_running" "Tunnel Watchdog Not Running" "
## Tunnel Watchdog Not Running

The tunnel watchdog daemon is not currently running.

### Status Details
- **Tunnel:** $TUNNEL_NAME
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
    log "INFO" "🔍 Running single tunnel health check"
    
    # Write single check summary
    write_summary "single_check" "Tunnel Single Health Check" "
## Tunnel Single Health Check

Performing a single health check.

### Check Details
- **Tunnel:** $TUNNEL_NAME
- **Type:** Single Check
- **Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
"
    
    check_tunnel_health
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
        echo "  start   - Start the tunnel watchdog daemon (FOREGROUND)"
        echo "  stop    - Stop the tunnel watchdog daemon"
        echo "  restart - Restart the tunnel watchdog daemon"
        echo "  status  - Show daemon status and recent logs"
        echo "  health  - Run single health check"
        exit 1
        ;;
esac 