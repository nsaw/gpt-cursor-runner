#!/bin/bash

# Tunnel Watchdog Daemon v1.0
# Monitors Cloudflare tunnel health with PID monitoring and localhost endpoint checks
# Part of the hardened fallback pipeline for GHOST↔DEV reliability

set -e

# Configuration
TUNNEL_NAME="tm-runner-expo"
RUNNER_PORT=5555
CHECK_URL="http://localhost:$RUNNER_PORT/health"
LOG_DIR="./logs/watchdogs"
PID_FILE="./logs/watchdog-tunnel.pid"
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
        log "INFO" "✅ cloudflared found in PATH"
        return 0
    else
        log "ERROR" "❌ cloudflared not found in PATH"
        return 1
    fi
}

# Check if cloudflared process is running
check_cloudflared_process() {
    log "INFO" "🔍 Checking if cloudflared process is running"
    
    if pgrep -f cloudflared >/dev/null; then
        local pids=$(pgrep -f cloudflared)
        log "INFO" "✅ cloudflared process running (PIDs: $pids)"
        return 0
    else
        log "ERROR" "❌ cloudflared process not found"
        return 1
    fi
}

# Check tunnel configuration
check_tunnel_config() {
    log "INFO" "🔍 Checking tunnel configuration for $TUNNEL_NAME"
    
    if cloudflared tunnel info "$TUNNEL_NAME" >/dev/null 2>&1; then
        log "INFO" "✅ Tunnel $TUNNEL_NAME configuration found"
        return 0
    else
        log "ERROR" "❌ Tunnel $TUNNEL_NAME configuration not found"
        return 1
    fi
}

# Check localhost endpoint health
check_localhost_endpoint() {
    log "INFO" "🔍 Checking localhost endpoint: $CHECK_URL"
    
    local health_response
    health_response=$(curl -s --max-time 10 "$CHECK_URL" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ] && echo "$health_response" | grep -q "OK\|healthy\|alive"; then
        log "INFO" "✅ Localhost endpoint check passed"
        return 0
    else
        log "ERROR" "❌ Localhost endpoint check failed (exit: $exit_code): $health_response"
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
    
    # Call the repair script
    if [ -f "./scripts/repair-tunnel.sh" ]; then
        log "INFO" "🔧 Executing repair-tunnel.sh"
        ./scripts/repair-tunnel.sh >> "$LOG_DIR/tunnel-repair.log" 2>&1
        local repair_exit=$?
        
        if [ $repair_exit -eq 0 ]; then
            log "INFO" "✅ Tunnel repair completed successfully"
            notify_dashboard "Tunnel repair completed successfully" "SUCCESS"
        else
            log "ERROR" "❌ Tunnel repair failed (exit: $repair_exit)"
            notify_dashboard "Tunnel repair failed" "ERROR"
        fi
    else
        log "ERROR" "❌ Repair script not found: ./scripts/repair-tunnel.sh"
        notify_dashboard "Tunnel repair script not found" "ERROR"
    fi
}

# Start the watchdog daemon
start_daemon() {
    log "INFO" "🚀 Starting tunnel watchdog daemon for $TUNNEL_NAME"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Check if already running
    if check_pid; then
        log "WARN" "Daemon already running (PID: $(cat $PID_FILE))"
        return 1
    fi
    
    # Start background monitoring
    (
        log "INFO" "📡 Starting tunnel health monitoring loop"
        
        while true; do
            # Perform comprehensive health check
            if check_tunnel_health; then
                log "INFO" "✅ Tunnel health check passed"
            else
                log "ERROR" "❌ Tunnel health check failed"
                notify_dashboard "Tunnel health check failed" "ERROR"
                
                # Trigger repair after failure
                trigger_tunnel_repair
            fi
            
            # Wait before next check
            sleep $CHECK_INTERVAL
        done
    ) &
    
    local daemon_pid=$!
    echo $daemon_pid > "$PID_FILE"
    log "INFO" "✅ Tunnel watchdog daemon started with PID: $daemon_pid"
    
    return 0
}

# Stop the daemon
stop_daemon() {
    log "INFO" "🛑 Stopping tunnel watchdog daemon"
    
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
        return 1
    fi
}

# Run single health check
health_check() {
    log "INFO" "🔍 Running single tunnel health check"
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
        echo "  start   - Start the tunnel watchdog daemon"
        echo "  stop    - Stop the tunnel watchdog daemon"
        echo "  restart - Restart the tunnel watchdog daemon"
        echo "  status  - Show daemon status and recent logs"
        echo "  health  - Run single health check"
        exit 1
        ;;
esac 