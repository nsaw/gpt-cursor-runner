#!/bin/bash

# FILENAME: tunnel-watchdog.sh
# PURPOSE: Auto-restarts Cloudflare tunnel if DNS or port is down
# ENHANCED: Added validation, retry logic, dashboard notifications, UUID tracking

TUNNEL_NAME="tm-runner-expo"
RUNNER_PORT=5555
CHECK_URL="http://localhost:$RUNNER_PORT/health"
DASHBOARD_WEBHOOK="https://gpt-cursor-runner.fly.dev/slack/commands"
LOG_FILE="./logs/tunnel-watchdog.log"

# Generate operation UUID for tracking
OPERATION_UUID=$(uuidgen)
START_TIME=$(date +%s)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${OPERATION_UUID}] $1" | tee -a "$LOG_FILE"
}

notify_dashboard() {
    local message="$1"
    local level="${2:-INFO}"
    
    curl -s -X POST "$DASHBOARD_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{
            \"command\": \"/alert-runner-crash\",
            \"text\": \"[TUNNEL-WATCHDOG] ${level}: ${message}\",
            \"user_name\": \"tunnel-watchdog\",
            \"channel_id\": \"infrastructure\"
        }" >> "$LOG_FILE" 2>&1
}

# Check tunnel health with enhanced validation
check_tunnel_health() {
    local health_check_result=""
    local exit_code=0
    
    # Test local health endpoint
    health_check_result=$(curl -s --max-time 5 "$CHECK_URL" 2>/dev/null)
    exit_code=$?
    
    if [ $exit_code -eq 0 ] && echo "$health_check_result" | grep -q "OK"; then
        return 0  # Healthy
    else
        return 1  # Unhealthy
    fi
}

# Test external connectivity
test_external_connectivity() {
    # Test if we can reach the external endpoint
    if curl -s --max-time 10 "https://gpt-cursor-runner.fly.dev/health" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Restart tunnel with retry logic
restart_tunnel() {
    local attempt=$1
    local max_attempts=3
    
    log "🔄 Restarting Cloudflare tunnel (attempt $attempt/$max_attempts)"
    notify_dashboard "Restarting Cloudflare tunnel (attempt $attempt/$max_attempts)" "WARNING"
    
    # Kill existing tunnel processes
    pkill -f cloudflared 2>/dev/null
    sleep 2
    
    # Start new tunnel
    cloudflared tunnel run "$TUNNEL_NAME" >/dev/null 2>&1 &
    local tunnel_pid=$!
    
    # Wait for tunnel to start
    sleep 5
    
    # Verify tunnel is running
    if ps -p $tunnel_pid >/dev/null 2>&1; then
        log "✅ Tunnel restarted successfully (PID: $tunnel_pid)"
        notify_dashboard "Tunnel restarted successfully" "SUCCESS"
        return 0
    else
        log "❌ Tunnel restart failed"
        notify_dashboard "Tunnel restart failed" "ERROR"
        return 1
    fi
}

# Main tunnel watchdog logic
log "🔍 Starting tunnel health check (operation: $OPERATION_UUID)"

# Check if tunnel is healthy
if check_tunnel_health; then
    log "✅ Tunnel healthy. No action needed."
    notify_dashboard "Tunnel health check passed" "INFO"
    exit 0
else
    log "⚠️ Runner tunnel appears down. Starting diagnostic..."
    notify_dashboard "Tunnel appears down - starting diagnostic" "WARNING"
    
    # Diagnostic checks
    log "🔍 Running diagnostic checks..."
    
    # Check if cloudflared is running
    if ! pgrep -f cloudflared >/dev/null; then
        log "❌ Cloudflared process not found"
        notify_dashboard "Cloudflared process not found" "ERROR"
    fi
    
    # Check local port
    if ! netstat -an | grep -q ":$RUNNER_PORT.*LISTEN"; then
        log "❌ Runner port $RUNNER_PORT not listening"
        notify_dashboard "Runner port $RUNNER_PORT not listening" "ERROR"
    fi
    
    # Test external connectivity
    if test_external_connectivity; then
        log "✅ External connectivity confirmed"
    else
        log "❌ External connectivity failed"
        notify_dashboard "External connectivity failed" "ERROR"
    fi
    
    # Attempt tunnel restart with retry logic
    local attempt=1
    local max_attempts=3
    
    while [ $attempt -le $max_attempts ]; do
        if restart_tunnel $attempt; then
            # Wait and verify tunnel is healthy
            sleep 10
            if check_tunnel_health; then
                log "✅ Tunnel restart successful and verified healthy"
                notify_dashboard "Tunnel restart successful and verified" "SUCCESS"
                
                # Log success metrics
                TOTAL_TIME=$(( $(date +%s) - START_TIME ))
                log "📊 Tunnel recovery metrics: ${TOTAL_TIME}s total time, ${attempt} attempts"
                exit 0
            else
                log "⚠️ Tunnel restarted but health check failed"
                notify_dashboard "Tunnel restarted but health check failed" "WARNING"
            fi
        fi
        
        attempt=$((attempt + 1))
        if [ $attempt -le $max_attempts ]; then
            log "⏰ Waiting before retry attempt $attempt..."
            sleep $((attempt * 5))  # Exponential backoff
        fi
    done
    
    # All retry attempts failed
    log "🚨 All tunnel restart attempts failed - escalating"
    notify_dashboard "All tunnel restart attempts failed - escalating to GPT/DEV" "CRITICAL"
    
    # Log escalation
    ESCALATION_REPORT=$(cat <<EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "operation_uuid": "$OPERATION_UUID",
    "tunnel_name": "$TUNNEL_NAME",
    "retry_attempts": $((attempt - 1)),
    "escalationLevel": "CRITICAL",
    "action": "ESCALATE_TO_GPT_DEV",
    "total_recovery_time": $(( $(date +%s) - START_TIME ))
}
EOF
)
    
    echo "$ESCALATION_REPORT" >> "./logs/tunnel-escalation.log"
    log "📋 Escalation logged to ./logs/tunnel-escalation.log"
    
    exit 1
fi
