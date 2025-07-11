#!/bin/bash

# Tunnel Repair Script v1.0
# Repairs Cloudflare tunnel issues with logging and auto-retry capabilities
# Part of the hardened fallback pipeline for GHOST↔DEV reliability

set -e

# Configuration
TUNNEL_NAME="tm-runner-expo"
RUNNER_PORT=5555
CHECK_URL="http://localhost:$RUNNER_PORT/health"
LOG_DIR="./logs/watchdogs"
LOG_FILE="$LOG_DIR/tunnel-repair.log"
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
            \"text\": \"[TUNNEL-REPAIR] ${level}: ${message}\",
            \"user_name\": \"tunnel-repair\",
            \"channel_id\": \"infrastructure\"
        }" >> "$LOG_FILE" 2>&1 || log "WARN" "Dashboard notification failed"
}

# Check if cloudflared is available
check_cloudflared() {
    log "INFO" "🔍 Checking if cloudflared is available"
    
    if command -v cloudflared >/dev/null 2>&1; then
        log "INFO" "✅ cloudflared found in PATH"
        return 0
    else
        log "ERROR" "❌ cloudflared not found in PATH"
        return 1
    fi
}

# Check tunnel configuration
check_tunnel_config() {
    log "INFO" "🔍 Checking tunnel configuration"
    
    if cloudflared tunnel info "$TUNNEL_NAME" >/dev/null 2>&1; then
        log "INFO" "✅ Tunnel $TUNNEL_NAME configuration found"
        return 0
    else
        log "ERROR" "❌ Tunnel $TUNNEL_NAME configuration not found"
        return 1
    fi
}

# Kill existing tunnel processes
kill_tunnel_processes() {
    log "INFO" "🛑 Killing existing tunnel processes"
    
    local killed_count=0
    local pids=$(pgrep -f cloudflared 2>/dev/null || echo "")
    
    if [ -n "$pids" ]; then
        for pid in $pids; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null
                killed_count=$((killed_count + 1))
                log "INFO" "✅ Killed tunnel process (PID: $pid)"
            fi
        done
        log "INFO" "✅ Killed $killed_count tunnel processes"
    else
        log "INFO" "ℹ️ No tunnel processes found to kill"
    fi
    
    # Wait for processes to fully terminate
    sleep 3
}

# Clean up tunnel connections
cleanup_tunnel() {
    log "INFO" "🧹 Cleaning up tunnel connections"
    
    # Clean up tunnel
    local cleanup_output
    cleanup_output=$(cloudflared tunnel cleanup "$TUNNEL_NAME" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log "INFO" "✅ Tunnel cleanup completed successfully"
    else
        log "WARN" "⚠️ Tunnel cleanup failed: $cleanup_output"
    fi
}

# Start tunnel
start_tunnel() {
    local attempt=$1
    log "INFO" "🚀 Starting tunnel (attempt $attempt/$MAX_RETRIES)"
    notify_dashboard "Starting tunnel (attempt $attempt/$MAX_RETRIES)" "WARNING"
    
    # Start tunnel in background
    nohup cloudflared tunnel run "$TUNNEL_NAME" >/dev/null 2>&1 &
    local tunnel_pid=$!
    
    # Wait for tunnel to start
    local wait_time=0
    local max_wait=30
    
    while [ $wait_time -lt $max_wait ]; do
        if ps -p $tunnel_pid >/dev/null 2>&1; then
            log "INFO" "✅ Tunnel process started (PID: $tunnel_pid)"
            return 0
        fi
        
        sleep 1
        wait_time=$((wait_time + 1))
    done
    
    log "ERROR" "❌ Tunnel failed to start within ${max_wait}s"
    return 1
}

# Check tunnel health
check_tunnel_health() {
    log "INFO" "🔍 Checking tunnel health"
    
    # Check if tunnel process is running
    if ! pgrep -f cloudflared >/dev/null; then
        log "ERROR" "❌ Tunnel process not running"
        return 1
    fi
    
    # Check localhost endpoint
    local health_response
    health_response=$(curl -s --max-time 10 "$CHECK_URL" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ] && echo "$health_response" | grep -q "OK\|healthy\|alive"; then
        log "INFO" "✅ Tunnel health check passed"
        return 0
    else
        log "ERROR" "❌ Tunnel health check failed (exit: $exit_code): $health_response"
        return 1
    fi
}

# Wait for tunnel to be healthy
wait_for_tunnel_health() {
    local max_wait=120  # 2 minutes
    local wait_time=0
    local check_interval=5
    
    log "INFO" "⏳ Waiting for tunnel to become healthy (max ${max_wait}s)"
    
    while [ $wait_time -lt $max_wait ]; do
        if check_tunnel_health; then
            log "INFO" "✅ Tunnel is healthy after ${wait_time}s"
            return 0
        fi
        
        sleep $check_interval
        wait_time=$((wait_time + check_interval))
        log "INFO" "⏳ Still waiting for tunnel health... (${wait_time}s elapsed)"
    done
    
    log "ERROR" "❌ Tunnel did not become healthy within ${max_wait}s"
    return 1
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

# Main repair sequence
repair_tunnel() {
    log "INFO" "🚀 Starting tunnel repair sequence"
    notify_dashboard "Starting tunnel repair sequence" "WARNING"
    
    # Check if cloudflared is available
    if ! check_cloudflared; then
        log "ERROR" "❌ Cannot repair tunnel - cloudflared not available"
        notify_dashboard "Cannot repair tunnel - cloudflared not available" "ERROR"
        return 1
    fi
    
    # Check tunnel configuration
    if ! check_tunnel_config; then
        log "ERROR" "❌ Cannot repair tunnel - configuration not found"
        notify_dashboard "Cannot repair tunnel - configuration not found" "ERROR"
        return 1
    fi
    
    # Check current health
    if check_tunnel_health; then
        log "INFO" "✅ Tunnel is already healthy"
        return 0
    fi
    
    # Kill existing processes
    kill_tunnel_processes
    
    # Clean up tunnel
    cleanup_tunnel
    
    # Attempt restart
    local attempt=1
    while [ $attempt -le $MAX_RETRIES ]; do
        log "INFO" "🔄 Repair attempt $attempt/$MAX_RETRIES"
        
        # Start tunnel
        if start_tunnel $attempt; then
            # Wait for health
            if wait_for_tunnel_health; then
                log "INFO" "✅ Tunnel repair successful"
                notify_dashboard "Tunnel repair successful" "SUCCESS"
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
    log "ERROR" "❌ All tunnel repair attempts failed"
    notify_dashboard "All tunnel repair attempts failed" "ERROR"
    
    # Log final status
    TOTAL_TIME=$(( $(date +%s) - START_TIME ))
    log "INFO" "📊 Tunnel repair metrics: ${TOTAL_TIME}s total time, ${MAX_RETRIES} restart attempts"
    
    return 1
}

# Main execution
main() {
    log "INFO" "🚀 Starting tunnel repair script (operation: $OPERATION_UUID)"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Run repair sequence
    if repair_tunnel; then
        log "INFO" "✅ Tunnel repair completed successfully"
        exit 0
    else
        log "ERROR" "❌ Tunnel repair failed"
        exit 1
    fi
}

# Run main function
main "$@" 