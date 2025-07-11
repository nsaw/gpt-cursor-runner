#!/bin/bash

# FILENAME: tunnel-watchdog.sh
# PURPOSE: Auto-restarts Cloudflare tunnel if DNS or port is down
# ENHANCED: Added validation, retry logic, dashboard notifications, UUID tracking
# SELF-HEALING: Decoupled monitoring with fallback mechanisms

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
    
    # Use fallback notification if primary webhook fails
    if ! curl -s --max-time 10 -X POST "$DASHBOARD_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{
            \"command\": \"/alert-runner-crash\",
            \"text\": \"[TUNNEL-WATCHDOG] ${level}: ${message}\",
            \"user_name\": \"tunnel-watchdog\",
            \"channel_id\": \"infrastructure\"
        }" >> "$LOG_FILE" 2>&1; then
        log "⚠️ Primary webhook failed, using fallback notification"
        # Fallback: log to local file for manual review
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [FALLBACK] ${level}: ${message}" >> "./logs/tunnel-fallback.log"
    fi
}

# Check tunnel health with enhanced validation and fallback
check_tunnel_health() {
    local health_check_result=""
    local exit_code=0
    
    # Test local health endpoint with timeout
    health_check_result=$(curl -s --max-time 5 "$CHECK_URL" 2>/dev/null)
    exit_code=$?
    
    if [ $exit_code -eq 0 ] && echo "$health_check_result" | grep -q "OK"; then
        return 0  # Healthy
    else
        return 1  # Unhealthy
    fi
}

# Test external connectivity with multiple fallbacks
test_external_connectivity() {
    local fallback_urls=(
        "https://gpt-cursor-runner.fly.dev/health"
        "https://httpbin.org/get"
        "https://api.github.com/zen"
    )
    
    for url in "${fallback_urls[@]}"; do
        if curl -s --max-time 10 "$url" >/dev/null 2>&1; then
            log "✅ External connectivity confirmed via $url"
            return 0
        fi
    done
    
    log "❌ All external connectivity tests failed"
    return 1
}

# Self-healing tunnel restart with enhanced retry logic
restart_tunnel() {
    local attempt=$1
    local max_attempts=3
    
    log "🔄 Restarting Cloudflare tunnel (attempt $attempt/$max_attempts)"
    notify_dashboard "Restarting Cloudflare tunnel (attempt $attempt/$max_attempts)" "WARNING"
    
    # Kill existing tunnel processes with enhanced cleanup
    pkill -f cloudflared 2>/dev/null
    sleep 3
    
    # Clear any stale tunnel connections
    cloudflared tunnel cleanup "$TUNNEL_NAME" 2>/dev/null || true
    
    # Start new tunnel with enhanced error handling
    nohup cloudflared tunnel run "$TUNNEL_NAME" >/dev/null 2>&1 &
    local tunnel_pid=$!
    
    # Wait for tunnel to start with progressive checks
    for i in {1..10}; do
        if ps -p $tunnel_pid >/dev/null 2>&1; then
            log "✅ Tunnel process started (PID: $tunnel_pid)"
            break
        fi
        sleep 1
    done
    
    # Verify tunnel is running and healthy
    if ps -p $tunnel_pid >/dev/null 2>&1; then
        # Wait additional time for tunnel to fully establish
        sleep 5
        
        # Test tunnel connectivity
        if check_tunnel_health; then
            log "✅ Tunnel restarted successfully and verified healthy"
            notify_dashboard "Tunnel restarted successfully and verified" "SUCCESS"
            return 0
        else
            log "⚠️ Tunnel restarted but health check failed - will retry"
            notify_dashboard "Tunnel restarted but health check failed" "WARNING"
            return 1
        fi
    else
        log "❌ Tunnel restart failed - process not found"
        notify_dashboard "Tunnel restart failed - process not found" "ERROR"
        return 1
    fi
}

# Enhanced diagnostic with self-healing capabilities
run_diagnostics() {
    log "🔍 Running enhanced diagnostics..."
    
    # Check if cloudflared is installed and accessible
    if ! command -v cloudflared >/dev/null 2>&1; then
        log "❌ Cloudflared not found in PATH"
        notify_dashboard "Cloudflared not found in PATH" "ERROR"
        return 1
    fi
    
    # Check if cloudflared is running
    if ! pgrep -f cloudflared >/dev/null; then
        log "❌ Cloudflared process not found"
        notify_dashboard "Cloudflared process not found" "ERROR"
    fi
    
    # Check local port with enhanced validation
    if ! netstat -an 2>/dev/null | grep -q ":$RUNNER_PORT.*LISTEN"; then
        log "❌ Runner port $RUNNER_PORT not listening"
        notify_dashboard "Runner port $RUNNER_PORT not listening" "ERROR"
    fi
    
    # Test external connectivity with fallbacks
    if test_external_connectivity; then
        log "✅ External connectivity confirmed"
    else
        log "❌ External connectivity failed"
        notify_dashboard "External connectivity failed" "ERROR"
    fi
    
    # Check tunnel configuration
    if ! cloudflared tunnel info "$TUNNEL_NAME" >/dev/null 2>&1; then
        log "❌ Tunnel $TUNNEL_NAME not configured"
        notify_dashboard "Tunnel $TUNNEL_NAME not configured" "ERROR"
    fi
    
    return 0
}

# Main tunnel watchdog logic with self-healing
log "🔍 Starting enhanced tunnel health check (operation: $OPERATION_UUID)"

# Check if tunnel is healthy
if check_tunnel_health; then
    log "✅ Tunnel healthy. No action needed."
    notify_dashboard "Tunnel health check passed" "INFO"
    exit 0
else
    log "⚠️ Runner tunnel appears down. Starting enhanced diagnostic..."
    notify_dashboard "Tunnel appears down - starting enhanced diagnostic" "WARNING"
    
    # Run enhanced diagnostics
    if ! run_diagnostics; then
        log "🚨 Critical diagnostic failures detected"
        notify_dashboard "Critical diagnostic failures detected" "CRITICAL"
    fi
    
    # Attempt tunnel restart with enhanced retry logic
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
            sleep $((attempt * 10))  # Progressive backoff
        fi
    done
    
    # All retry attempts failed - escalate with enhanced reporting
    log "🚨 All tunnel restart attempts failed - escalating with enhanced reporting"
    notify_dashboard "All tunnel restart attempts failed - escalating to GPT/DEV" "CRITICAL"
    
    # Enhanced escalation report
    ESCALATION_REPORT=$(cat <<EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "operation_uuid": "$OPERATION_UUID",
    "tunnel_name": "$TUNNEL_NAME",
    "retry_attempts": $((attempt - 1)),
    "escalationLevel": "CRITICAL",
    "action": "ESCALATE_TO_GPT_DEV",
    "total_recovery_time": $(( $(date +%s) - START_TIME )),
    "diagnostic_summary": {
        "cloudflared_installed": "$(command -v cloudflared >/dev/null && echo 'true' || echo 'false')",
        "cloudflared_running": "$(pgrep -f cloudflared >/dev/null && echo 'true' || echo 'false')",
        "port_listening": "$(netstat -an 2>/dev/null | grep -q ":$RUNNER_PORT.*LISTEN" && echo 'true' || echo 'false')",
        "external_connectivity": "$(test_external_connectivity && echo 'true' || echo 'false')"
    }
}
EOF
)
    
    echo "$ESCALATION_REPORT" >> "./logs/tunnel-escalation.log"
    log "📋 Enhanced escalation logged to ./logs/tunnel-escalation.log"
    
    exit 1
fi
