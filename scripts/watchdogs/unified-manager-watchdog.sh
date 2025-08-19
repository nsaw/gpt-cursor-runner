#!/bin/bash
set -eo pipefail

# =============================================================================
# UNIFIED MANAGER WATCHDOG - HARDENED PORT ASSIGNMENTS
# =============================================================================

# CRITICAL PORT ASSIGNMENTS (HARDCODED)
***REMOVED***_BRIDGE_PORT=5051          # Ghost Bridge (Slack commands and webhooks)
FLASK_DASHBOARD_PORT=8787       # Flask Dashboard (Main dashboard)
TELEMETRY_API_PORT=8788         # Telemetry API (Internal service)
TELEMETRY_ORCHESTRATOR_PORT=8789 # Telemetry Orchestrator (PM2 managed)
EXPO_DEV_PORT=8081              # Expo/Metro (Development server)
MAIN_BACKEND_PORT=4000          # MAIN Backend API (tm-mobile-cursor)
***REMOVED***_RELAY_PORT=3001           # Ghost Relay (Internal relay service)

# CLOUDFLARE TUNNEL CONFIGURATION
TUNNEL_ID="16db2f43-4725-419a-a64b-5ceeb7a5d4c3"
TUNNEL_CONFIG="/Users/sawyer/.cloudflared/config.yml"
FLY_URL="${FLY_URL:-https://gpt-cursor-runner.thoughtmarks.app}"
LOCAL_URL="http://localhost:5051"  # Ghost Bridge (Slack commands)
DASHBOARD_URL="http://localhost:8787"  # Flask Dashboard (monitoring)
SLACK_URL="https://slack.thoughtmarks.app"

# TUNNEL FAILOVER CONFIGURATION
TUNNEL_FAILOVER=(
    "dashboard:https://gpt-cursor-runner.thoughtmarks.app:https://health-thoughtmarks.thoughtmarks.app:https://ghost-thoughtmarks.thoughtmarks.app"
    "slack:https://slack.thoughtmarks.app:https://webhook-thoughtmarks.thoughtmarks.app:https://ghost-thoughtmarks.thoughtmarks.app"
    "expo:https://expo-thoughtmarks.thoughtmarks.app:https://deciding-externally-caiman.ngrok-free.app:https://dev-thoughtmarks.thoughtmarks.app"
)

# SERVICE HEALTH ENDPOINTS
***REMOVED***_BRIDGE_HEALTH="http://localhost:5051/health"
FLASK_DASHBOARD_HEALTH="http://localhost:8787/api/health"
TELEMETRY_API_HEALTH="http://localhost:8788/health"
EXPO_DEV_HEALTH="http://localhost:8081"

# LOGGING AND PID MANAGEMENT
LOG_DIR="/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs"
PID_DIR="/Users/sawyer/gitSync/gpt-cursor-runner/pids"
WATCHDOG_PID_FILE="$PID_DIR/unified-manager-watchdog.pid"
WATCHDOG_LOG="$LOG_DIR/unified-manager-watchdog.log"

# RESTART TRACKING (PREVENT INFINITE LOOPS)
TUNNEL_RESTART_COUNT_FILE="$PID_DIR/tunnel-restart-count.txt"
TUNNEL_RESTART_TIME_FILE="$PID_DIR/tunnel-restart-time.txt"
MAX_RESTARTS_PER_HOUR=5
RESTART_WINDOW_SECONDS=3600

# Create directories
mkdir -p "$LOG_DIR" "$PID_DIR"

# Resolve timeout binary (prefer coreutils gtimeout on macOS if available)
resolve_timeout_bin() {
    if command -v timeout >/dev/null 2>&1; then
        echo "timeout"
    elif command -v gtimeout >/dev/null 2>&1; then
        echo "gtimeout"
    else
        echo ""
    fi
}

TIMEOUT_BIN="$(resolve_timeout_bin)"

# Non-blocking command runner with optional timeout and disown
# Usage: nb "command string" [timeoutSeconds]
nb() {
    local cmd_str="$1"
    local t=${2:-30}
    if [ -n "$TIMEOUT_BIN" ]; then
        { $TIMEOUT_BIN ${t}s bash -lc "$cmd_str" & } >/dev/null 2>&1 & disown || true
    else
        { bash -lc "$cmd_str" & } >/dev/null 2>&1 & disown || true
    fi
}

# Synchronous bounded runner (subshell with timeout, no disown)
# Usage: run "command string" [timeoutSeconds]
run() {
    local cmd_str="$1"
    local t=${2:-30}
    if [ -n "$TIMEOUT_BIN" ]; then
        ( $TIMEOUT_BIN ${t}s bash -lc "$cmd_str" )
    else
        ( bash -lc "$cmd_str" )
    fi
}

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$WATCHDOG_LOG"
}

# Initialize restart tracking
init_restart_tracking() {
    if [ ! -f "$TUNNEL_RESTART_COUNT_FILE" ]; then
        echo "0" > "$TUNNEL_RESTART_COUNT_FILE"
    fi
    if [ ! -f "$TUNNEL_RESTART_TIME_FILE" ]; then
        echo "$(date +%s)" > "$TUNNEL_RESTART_TIME_FILE"
    fi
}

# Check restart limits
check_restart_limits() {
    local current_time=$(date +%s)
    local last_restart_time=$(cat "$TUNNEL_RESTART_TIME_FILE" 2>/dev/null || echo "0")
    local restart_count=$(cat "$TUNNEL_RESTART_COUNT_FILE" 2>/dev/null || echo "0")
    
    # Reset counter if window has passed
    if [ $((current_time - last_restart_time)) -gt $RESTART_WINDOW_SECONDS ]; then
        echo "0" > "$TUNNEL_RESTART_COUNT_FILE"
        echo "$current_time" > "$TUNNEL_RESTART_TIME_FILE"
        restart_count=0
    fi
    
    if [ "$restart_count" -ge "$MAX_RESTARTS_PER_HOUR" ]; then
        log "⚠️ Maximum restarts per hour reached for tunnel - skipping restart"
        return 1
    fi
    
    return 0
}

# Increment restart counter
increment_restart_counter() {
    local current_count=$(cat "$TUNNEL_RESTART_COUNT_FILE" 2>/dev/null || echo "0")
    local new_count=$((current_count + 1))
    echo "$new_count" > "$TUNNEL_RESTART_COUNT_FILE"
    echo "$(date +%s)" > "$TUNNEL_RESTART_TIME_FILE"
    log "Tunnel restart count: $new_count/$MAX_RESTARTS_PER_HOUR"
}

# Health check using mandated curl disown pattern while preserving exit status
# Returns 0 if healthy, 1 otherwise
check_health() {
    local url=$1
    local service_name=$2
    local timeout=${3:-30}
    local tmp_file="/tmp/umw_${service_name// /_}_$$.status"
    rm -f "$tmp_file" 2>/dev/null || true
    log "Checking health for $service_name at $url"
    (
      if curl --silent --max-time "$timeout" "$url" 2>/dev/null | grep -q .; then
        echo OK > "$tmp_file"
        echo "✅ $service_name healthy ($url)" >> "$WATCHDOG_LOG"
      else
        echo FAIL > "$tmp_file"
        echo "❌ $service_name unhealthy ($url)" >> "$WATCHDOG_LOG"
      fi
    ) &
    local PID=$!
    sleep "$timeout"
    disown $PID 2>/dev/null || true
    local result="$(cat "$tmp_file" 2>/dev/null || echo FAIL)"
    rm -f "$tmp_file" 2>/dev/null || true
    [ "$result" = "OK" ]
}

# Monitor Ghost Bridge
monitor_ghost_bridge() {
    log "Monitoring Ghost Bridge..."
    
    if ! check_health "$***REMOVED***_BRIDGE_HEALTH" "Ghost Bridge" 30; then
        log "❌ Ghost Bridge health check failed - attempting restart"
        
        # Restart Ghost Bridge via PM2
        nb "pm2 restart ghost-bridge" 30
        log "✅ Ghost Bridge restart dispatched via PM2"
        
        # Wait for service to come back up
        sleep 10
        
        # Verify restart
        if check_health "$***REMOVED***_BRIDGE_HEALTH" "Ghost Bridge" 30; then
            log "✅ Ghost Bridge is healthy after restart"
        else
            log "❌ Ghost Bridge still unhealthy after restart"
        fi
    else
        log "✅ Ghost Bridge is healthy"
    fi
}

# Monitor Flask Dashboard
monitor_flask_dashboard() {
    log "Monitoring Flask Dashboard..."
    
    if ! check_health "$FLASK_DASHBOARD_HEALTH" "Flask Dashboard" 30; then
        log "❌ Flask Dashboard health check failed - attempting restart"
        
        # Restart Flask Dashboard via PM2
        nb "pm2 restart flask-dashboard" 30
        log "✅ Flask Dashboard restart dispatched via PM2"
        
        # Wait for service to come back up
        sleep 10
        
        # Verify restart
        if check_health "$FLASK_DASHBOARD_HEALTH" "Flask Dashboard" 30; then
            log "✅ Flask Dashboard is healthy after restart"
        else
            log "❌ Flask Dashboard still unhealthy after restart"
        fi
    else
        log "✅ Flask Dashboard is healthy"
    fi
}

# Monitor Cloudflare Tunnel
monitor_tunnel() {
    log "Monitoring Cloudflare Tunnel..."
    
    # Check if tunnel process is running
    local tunnel_running
    tunnel_running=$(run "ps aux | grep 'cloudflared.*$TUNNEL_ID' | grep -v grep | wc -l" 10 || echo 0)
    
    if [ "$tunnel_running" -eq 0 ]; then
        log "❌ Cloudflare tunnel process not running - attempting start"
        
        if check_restart_limits; then
            # Kill any existing cloudflared processes
            run "pkill -f 'cloudflared.*$TUNNEL_ID'" 5 || true
            sleep 2
            
            # Start tunnel
            nb "cloudflared tunnel run '$TUNNEL_ID' >/dev/null 2>&1" 60
            echo "$(date '+%Y-%m-%d %H:%M:%S') dispatched cloudflared restart" >> "$WATCHDOG_LOG"
            # Post-start health log (non-blocking)
            (
              if curl --silent --max-time 30 "$SLACK_URL/health" >/dev/null 2>&1; then
                echo "$(date '+%Y-%m-%d %H:%M:%S') ✅ tunnel healthy after restart" >> "$WATCHDOG_LOG"
              else
                echo "$(date '+%Y-%m-%d %H:%M:%S') ⚠️ tunnel health check failed after restart" >> "$WATCHDOG_LOG"
              fi
            ) & disown
            
            increment_restart_counter
        fi
    else
        log "✅ Cloudflare tunnel process is running"
        
        # Check tunnel health (but don't restart if process is running)
        (
          if curl --silent --max-time 30 "$SLACK_URL/health" >/dev/null 2>&1; then
              log "✅ Cloudflare tunnel health check passed"
          else
              log "⚠️ Cloudflare tunnel health check failed (process running, may need DNS propagation)"
          fi
        ) & disown
    fi
}

# Monitor PM2 services
monitor_pm2_services() {
    log "Monitoring PM2 services..."
    
    # Get PM2 status
    local pm2_status
    pm2_status=$(run "pm2 list 2>/dev/null | grep -E '(error|stopped)' | wc -l" 15 || echo 0)
    
    if [ "$pm2_status" -gt 0 ]; then
        log "❌ Some PM2 services are in error/stopped state - attempting restart"
        
        # Restart all PM2 services
        nb "pm2 restart all" 60
        log "✅ PM2 restart dispatched"
        
        # Wait for services to come back up
        sleep 10
        
        # Verify restart
        local new_pm2_status
        new_pm2_status=$(run "pm2 list 2>/dev/null | grep -E '(error|stopped)' | wc -l" 15 || echo 0)
        if [ "$new_pm2_status" -eq 0 ]; then
            log "✅ All PM2 services are healthy after restart"
        else
            log "❌ Some PM2 services still unhealthy after restart"
        fi
    else
        log "✅ All PM2 services are healthy"
    fi
}

# Monitor Tunnel Health and Failover
monitor_tunnel_health() {
    log "Monitoring tunnel health and failover..."
    
    for tunnel_config in "${TUNNEL_FAILOVER[@]}"; do
        IFS=':' read -r service primary secondary tertiary <<< "$tunnel_config"
        
        log "Checking tunnel health for $service service..."
        
        # Check primary tunnel
        local primary_healthy=false
        if check_health "$primary/health" "$service-primary" 30; then
            primary_healthy=true
            log "✅ $service primary tunnel ($primary) is healthy"
        else
            log "❌ $service primary tunnel ($primary) is unhealthy"
        fi
        
        # If primary is unhealthy, check secondary
        if [ "$primary_healthy" = false ]; then
            log "🔄 $service primary tunnel failed - checking secondary..."
            
            local secondary_healthy=false
            if check_health "$secondary/health" "$service-secondary" 30; then
                secondary_healthy=true
                log "✅ $service secondary tunnel ($secondary) is healthy"
            else
                log "❌ $service secondary tunnel ($secondary) is unhealthy"
            fi
            
            # If secondary is also unhealthy, check tertiary
            if [ "$secondary_healthy" = false ]; then
                log "🔄 $service secondary tunnel failed - checking tertiary..."
                
                if check_health "$tertiary/health" "$service-tertiary" 30; then
                    log "✅ $service tertiary tunnel ($tertiary) is healthy"
                else
                    log "❌ $service tertiary tunnel ($tertiary) is unhealthy"
                    log "🚨 CRITICAL: All $service tunnels are down - manual intervention required"
                    echo "[$(date '+%Y-%m-%d %H:%M:%S')] CRITICAL: All $service tunnels down - $primary, $secondary, $tertiary" >> "$LOG_DIR/tunnel-critical-failures.log"
                fi
            fi
        fi
    done
}

# Show status
show_status() {
    echo "Enhanced Unified Manager Watchdog Status"
    echo "======================================="
    echo "PID File: $WATCHDOG_PID_FILE"
    
    # Check if watchdog is running
    if [ -f "$WATCHDOG_PID_FILE" ]; then
        local watchdog_pid=$(cat "$WATCHDOG_PID_FILE" 2>/dev/null)
        if ps -p "$watchdog_pid" >/dev/null 2>&1; then
            echo "Status: ✅ Running (PID: $watchdog_pid)"
        else
            echo "Status: ❌ Not running (stale PID file)"
        fi
    else
        echo "Status: ❌ Not running"
    fi
    
    echo ""
    echo "=== SERVICE HEALTH STATUS ==="
    
    # Check Ghost Bridge
    if check_health "$***REMOVED***_BRIDGE_HEALTH" "Ghost Bridge" 10; then
        echo "Ghost Bridge (5051): ✅ HEALTHY"
    else
        echo "Ghost Bridge (5051): ❌ UNHEALTHY"
    fi
    
    # Check Flask Dashboard
    if check_health "$FLASK_DASHBOARD_HEALTH" "Flask Dashboard" 10; then
        echo "Flask Dashboard (8787): ✅ HEALTHY"
    else
        echo "Flask Dashboard (8787): ❌ UNHEALTHY"
    fi
    
    # Check tunnel
    local tunnel_running
    tunnel_running=$(ps aux | grep "cloudflared.*$TUNNEL_ID" | grep -v grep | wc -l)
    if [ "$tunnel_running" -gt 0 ]; then
        echo "Cloudflare Tunnel: ✅ RUNNING"
    else
        echo "Cloudflare Tunnel: ❌ NOT RUNNING"
    fi
    
    # Check PM2 services
    local pm2_errors
    pm2_errors=$(run "pm2 list 2>/dev/null | grep -E '(error|stopped)' | wc -l" 15 || echo 0)
    if [ "$pm2_errors" -eq 0 ]; then
        echo "PM2 Services: ✅ ALL HEALTHY"
    else
        echo "PM2 Services: ❌ $pm2_errors SERVICES UNHEALTHY"
    fi
    
    echo ""
    echo "=== RESTART TRACKING ==="
    local restart_count=$(cat "$TUNNEL_RESTART_COUNT_FILE" 2>/dev/null || echo "0")
    echo "Tunnel restarts this hour: $restart_count/$MAX_RESTARTS_PER_HOUR"
}

# Main monitoring loop
monitor_loop() {
    log "=== UNIFIED MANAGER WATCHDOG STARTED ==="
    
    # Initialize restart tracking
    init_restart_tracking
    
    # Write PID file
    echo $$ > "$WATCHDOG_PID_FILE"
    
    # Main monitoring loop
    while true; do
        log "=== MONITORING CYCLE STARTED ==="
        
        # Monitor all services
        monitor_ghost_bridge
        monitor_flask_dashboard
        monitor_tunnel
        monitor_pm2_services
        monitor_tunnel_health
        
        log "=== MONITORING CYCLE COMPLETED ==="
        
        # Wait before next cycle (minimum 30 seconds to prevent infinite loops)
        sleep 60
    done
}

# Cleanup function
cleanup() {
    log "Watchdog shutting down..."
    rm -f "$WATCHDOG_PID_FILE"
    exit 0
}

# Signal handlers
trap cleanup SIGINT SIGTERM

# Command handler
case "${1:-}" in
    "monitor"|"start")
        monitor_loop
        ;;
    "status")
        show_status
        ;;
    "stop")
        if [ -f "$WATCHDOG_PID_FILE" ]; then
            local watchdog_pid=$(cat "$WATCHDOG_PID_FILE")
            if ps -p "$watchdog_pid" >/dev/null 2>&1; then
                kill "$watchdog_pid"
                log "Watchdog stopped"
            else
                log "Watchdog not running"
            fi
        else
            log "Watchdog not running"
        fi
        ;;
    *)
        echo "Usage: $0 {monitor|start|status|stop}"
        echo ""
        echo "Commands:"
        echo "  monitor|start   - Start monitoring loop"
        echo "  status          - Show current status"
        echo "  stop            - Stop watchdog"
        exit 1
        ;;
esac 
