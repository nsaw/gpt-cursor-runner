#!/bin/bash

# Fly Repair Script v1.0
# Repairs Fly.io application issues with logging and auto-retry capabilities
# Part of the hardened fallback pipeline for GHOST↔DEV reliability

set -e

# Configuration
APP_NAME="gpt-cursor-runner"
LOG_DIR="./logs/watchdogs"
LOG_FILE="$LOG_DIR/fly-repair.log"
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
            \"text\": \"[FLY-REPAIR] ${level}: ${message}\",
            \"user_name\": \"fly-repair\",
            \"channel_id\": \"infrastructure\"
        }" >> "$LOG_FILE" 2>&1 || log "WARN" "Dashboard notification failed"
}

# Check if flyctl is available
check_flyctl() {
    log "INFO" "🔍 Checking if flyctl is available"
    
    if command -v flyctl >/dev/null 2>&1; then
        log "INFO" "✅ flyctl found in PATH"
        return 0
    else
        log "ERROR" "❌ flyctl not found in PATH"
        return 1
    fi
}

# Check Fly app status
check_fly_status() {
    log "INFO" "🔍 Checking Fly app status"
    
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

# Restart Fly app
restart_fly_app() {
    local attempt=$1
    log "INFO" "🔄 Restarting Fly app (attempt $attempt/$MAX_RETRIES)"
    notify_dashboard "Restarting Fly app (attempt $attempt/$MAX_RETRIES)" "WARNING"
    
    # Restart the Fly app
    local restart_output
    restart_output=$(flyctl apps restart "$APP_NAME" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log "INFO" "✅ Fly app restart initiated successfully"
        return 0
    else
        log "ERROR" "❌ Fly app restart failed: $restart_output"
        return 1
    fi
}

# Deploy Fly app
deploy_fly_app() {
    local attempt=$1
    log "INFO" "🚀 Deploying Fly app (attempt $attempt/$MAX_RETRIES)"
    notify_dashboard "Deploying Fly app (attempt $attempt/$MAX_RETRIES)" "WARNING"
    
    # Deploy the Fly app
    local deploy_output
    deploy_output=$(flyctl deploy --app "$APP_NAME" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log "INFO" "✅ Fly app deployment completed successfully"
        return 0
    else
        log "ERROR" "❌ Fly app deployment failed: $deploy_output"
        return 1
    fi
}

# Scale Fly app
scale_fly_app() {
    log "INFO" "📊 Scaling Fly app to ensure availability"
    notify_dashboard "Scaling Fly app to ensure availability" "INFO"
    
    # Scale to 1 instance to ensure availability
    local scale_output
    scale_output=$(flyctl scale count 1 --app "$APP_NAME" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log "INFO" "✅ Fly app scaling completed successfully"
        return 0
    else
        log "ERROR" "❌ Fly app scaling failed: $scale_output"
        return 1
    fi
}

# Check Fly logs for specific issues
check_fly_logs() {
    log "INFO" "🔍 Checking recent Fly logs for issues"
    
    # Get recent logs
    local log_output
    log_output=$(flyctl logs --app "$APP_NAME" --limit 20 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        # Check for specific error patterns
        if echo "$log_output" | grep -q -E "(panic|crash|timeout|connection refused)"; then
            log "WARN" "⚠️ Critical errors detected in Fly logs"
            echo "$log_output" >> "$LOG_DIR/fly-critical-errors.log"
            return 1
        else
            log "INFO" "✅ No critical errors in recent Fly logs"
            return 0
        fi
    else
        log "ERROR" "❌ Failed to retrieve Fly logs: $log_output"
        return 1
    fi
}

# Wait for Fly app to be healthy
wait_for_fly_health() {
    local max_wait=300  # 5 minutes
    local wait_time=0
    local check_interval=10
    
    log "INFO" "⏳ Waiting for Fly app to become healthy (max ${max_wait}s)"
    
    while [ $wait_time -lt $max_wait ]; do
        if check_fly_status; then
            log "INFO" "✅ Fly app is healthy after ${wait_time}s"
            return 0
        fi
        
        sleep $check_interval
        wait_time=$((wait_time + check_interval))
        log "INFO" "⏳ Still waiting for Fly app health... (${wait_time}s elapsed)"
    done
    
    log "ERROR" "❌ Fly app did not become healthy within ${max_wait}s"
    return 1
}

# Main repair sequence
repair_fly_app() {
    log "INFO" "🚀 Starting Fly app repair sequence"
    notify_dashboard "Starting Fly app repair sequence" "WARNING"
    
    # Check if flyctl is available
    if ! check_flyctl; then
        log "ERROR" "❌ Cannot repair Fly app - flyctl not available"
        notify_dashboard "Cannot repair Fly app - flyctl not available" "ERROR"
        return 1
    fi
    
    # Check current status
    if check_fly_status; then
        log "INFO" "✅ Fly app is already healthy"
        return 0
    fi
    
    # Attempt restart first
    local attempt=1
    while [ $attempt -le $MAX_RETRIES ]; do
        log "INFO" "🔄 Repair attempt $attempt/$MAX_RETRIES"
        
        # Restart the app
        if restart_fly_app $attempt; then
            # Wait for health
            if wait_for_fly_health; then
                log "INFO" "✅ Fly app repair successful via restart"
                notify_dashboard "Fly app repair successful via restart" "SUCCESS"
                return 0
            fi
        fi
        
        attempt=$((attempt + 1))
        if [ $attempt -le $MAX_RETRIES ]; then
            log "INFO" "⏳ Waiting before next repair attempt..."
            sleep 30
        fi
    done
    
    # If restart failed, try deployment
    log "INFO" "🔄 Restart attempts failed, trying deployment"
    attempt=1
    while [ $attempt -le $MAX_RETRIES ]; do
        log "INFO" "🚀 Deployment attempt $attempt/$MAX_RETRIES"
        
        # Deploy the app
        if deploy_fly_app $attempt; then
            # Wait for health
            if wait_for_fly_health; then
                log "INFO" "✅ Fly app repair successful via deployment"
                notify_dashboard "Fly app repair successful via deployment" "SUCCESS"
                return 0
            fi
        fi
        
        attempt=$((attempt + 1))
        if [ $attempt -le $MAX_RETRIES ]; then
            log "INFO" "⏳ Waiting before next deployment attempt..."
            sleep 60
        fi
    done
    
    # If deployment failed, try scaling
    log "INFO" "🔄 Deployment attempts failed, trying scaling"
    if scale_fly_app; then
        if wait_for_fly_health; then
            log "INFO" "✅ Fly app repair successful via scaling"
            notify_dashboard "Fly app repair successful via scaling" "SUCCESS"
            return 0
        fi
    fi
    
    # All repair attempts failed
    log "ERROR" "❌ All Fly app repair attempts failed"
    notify_dashboard "All Fly app repair attempts failed" "ERROR"
    
    # Log final status
    TOTAL_TIME=$(( $(date +%s) - START_TIME ))
    log "INFO" "📊 Fly repair metrics: ${TOTAL_TIME}s total time, ${MAX_RETRIES} restart attempts, ${MAX_RETRIES} deployment attempts"
    
    return 1
}

# Main execution
main() {
    log "INFO" "🚀 Starting Fly repair script (operation: $OPERATION_UUID)"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Run repair sequence
    if repair_fly_app; then
        log "INFO" "✅ Fly repair completed successfully"
        exit 0
    else
        log "ERROR" "❌ Fly repair failed"
        exit 1
    fi
}

# Run main function
main "$@" 