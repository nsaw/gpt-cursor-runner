#!/bin/bash
set -eo pipefail

# =============================================================================
# UNIFIED MANAGER SCRIPT - HARDENED PORT ASSIGNMENTS
# =============================================================================

# CRITICAL PORT ASSIGNMENTS (HARDCODED)
GHOST_BRIDGE_PORT=5051          # Ghost Bridge (Slack commands and webhooks)
FLASK_DASHBOARD_PORT=8787       # Flask Dashboard (Main dashboard)
TELEMETRY_API_PORT=8788         # Telemetry API (Internal service)
TELEMETRY_ORCHESTRATOR_PORT=8789 # Telemetry Orchestrator (PM2 managed)
EXPO_DEV_PORT=8081              # Expo/Metro (Development server)
MAIN_BACKEND_PORT=4000          # MAIN Backend API (tm-mobile-cursor)
GHOST_RELAY_PORT=3001           # Ghost Relay (Internal relay service)

# CLOUDFLARE TUNNEL CONFIGURATION
TUNNEL_ID="16db2f43-4725-419a-a64b-5ceeb7a5d4c3"
TUNNEL_CONFIG="/Users/sawyer/.cloudflared/config.yml"
FLY_URL="https://gpt-cursor-runner.fly.dev"
LOCAL_URL="http://localhost:5051"  # Ghost Bridge (Slack commands)
DASHBOARD_URL="http://localhost:8787"  # Flask Dashboard (monitoring)
SLACK_URL="https://slack.thoughtmarks.app"

# SERVICE HEALTH ENDPOINTS
GHOST_BRIDGE_HEALTH="http://localhost:5051/health"
FLASK_DASHBOARD_HEALTH="http://localhost:8787/api/health"
TELEMETRY_API_HEALTH="http://localhost:8788/health"
EXPO_DEV_HEALTH="http://localhost:8081"

# LOGGING
LOG_DIR="/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs"
PID_DIR="/Users/sawyer/gitSync/gpt-cursor-runner/pids"
MANAGER_LOG="$LOG_DIR/unified-manager.log"

# Create directories
mkdir -p "$LOG_DIR" "$PID_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$MANAGER_LOG"
}

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

# Generic non-blocking runner with disown and optional timeout (defaults to 30s)
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

# Mandatory curl non-blocking pattern with PID capture and disown
# Usage: curl_nb "http://host:port/path" "Label" [timeoutSeconds]
curl_nb() {
    local url="$1"
    local label="$2"
    local t=${3:-30}
    (
      if curl --silent --max-time "$t" "$url" 2>/dev/null | grep -q '.'; then
        log "✅ ${label} healthy (${url})"
      else
        log "❌ ${label} unhealthy (${url})"
      fi
    ) &
    local PID=$!
    sleep "$t"
    disown $PID 2>/dev/null || true
}

# Health check function (dispatch non-blocking)
check_health() {
    local url=$1
    local service_name=$2
    local timeout=${3:-30}
    log "Checking health for $service_name at $url (non-blocking, ${timeout}s)"
    curl_nb "$url" "$service_name" "$timeout"
    return 0
}

# Check Fly.io health
check_fly_health() {
    log "Checking Fly.io health (non-blocking)..."
    curl_nb "$FLY_URL/health" "Fly.io" 30
    return 0
}

# Switch tunnel to Fly.io
switch_tunnel_to_fly() {
    log "Switching tunnel to Fly.io..."
    
    # Update tunnel config
    nb "sed -i '' 's|service: http://localhost:5051|service: $FLY_URL|g' '$TUNNEL_CONFIG'" 10
    nb "sed -i '' 's|# Primary: Fly.io deployment (currently failing)|# Primary: Fly.io deployment (active)|g' '$TUNNEL_CONFIG'" 10
    nb "sed -i '' 's|# Fallback: Local Flask app (active now)|# Fallback: Local Flask app|g' '$TUNNEL_CONFIG'" 10
    
    # Restart tunnel
    restart_tunnel
    log "✅ Tunnel switched to Fly.io"
}

# Switch tunnel to local
switch_tunnel_to_local() {
    log "Switching tunnel to local Flask..."
    
    # Update tunnel config
    nb "sed -i '' 's|service: $FLY_URL|service: http://localhost:5051|g' '$TUNNEL_CONFIG'" 10
    nb "sed -i '' 's|# Primary: Fly.io deployment (active)|# Primary: Fly.io deployment (currently failing)|g' '$TUNNEL_CONFIG'" 10
    nb "sed -i '' 's|# Fallback: Local Flask app|# Fallback: Local Flask app (active now)|g' '$TUNNEL_CONFIG'" 10
    
    # Restart tunnel
    restart_tunnel
    log "✅ Tunnel switched to local Flask"
}

# Restart Cloudflare tunnel
restart_tunnel() {
    log "Restarting Cloudflare tunnel..."
    
    # Kill existing tunnel
    nb "pkill -f 'cloudflared.*$TUNNEL_ID'" 10 || true
    sleep 2
    
    # Start new tunnel
    { (
        cloudflared tunnel run "$TUNNEL_ID" >/dev/null 2>&1 &
        local tunnel_pid=$!
        echo $tunnel_pid > "$PID_DIR/cloudflared.pid"
        sleep 10
        curl_nb "$SLACK_URL/health" "Cloudflare tunnel" 20
      ) & } >/dev/null 2>&1 & disown
}

# Start PM2 services
start_pm2_services() {
    log "Starting PM2 services..."
    nb "pm2 start ecosystem.config.js" 30
    nb "pm2 list" 15
}

# Stop PM2 services
stop_pm2_services() {
    log "Stopping PM2 services..."
    nb "pm2 stop all" 20
}

# Restart PM2 services
restart_pm2_services() {
    log "Restarting PM2 services..."
    nb "pm2 restart all" 30
    nb "pm2 list" 15
}

# Show comprehensive status
show_status() {
    echo "=== UNIFIED MANAGER STATUS (DISPATCHED, SEE LOG) ==="
    echo "Tunnel ID: $TUNNEL_ID"
    echo "Slack URL: $SLACK_URL"
    echo "Log: $MANAGER_LOG"
    echo ""
    log "=== SERVICE HEALTH (dispatch) ==="
    check_health "$GHOST_BRIDGE_HEALTH" "Ghost Bridge" 10
    check_health "$FLASK_DASHBOARD_HEALTH" "Flask Dashboard" 10
    check_fly_health
    # Tunnel process check (non-blocking snapshot)
    nb "ps aux | grep \"cloudflared.*$TUNNEL_ID\" | grep -v grep >/dev/null && echo 'Cloudflare Tunnel: RUNNING' | tee -a $MANAGER_LOG || echo 'Cloudflare Tunnel: STOPPED' | tee -a $MANAGER_LOG" 10
    # Slack endpoint
    curl_nb "$SLACK_URL/health" "Slack Endpoint" 10
    log "=== PM2 SERVICES (dispatch) ==="
    nb "pm2 list | tee -a $MANAGER_LOG" 15
    log "=== ACTIVE PORTS (dispatch) ==="
    nb "lsof -i -P | grep LISTEN | grep -E '(5051|8787|8788|8789|8081|4000|3001)' | tee -a $MANAGER_LOG || echo 'No critical ports active' | tee -a $MANAGER_LOG" 10
    log "=== CURRENT TUNNEL CONFIG (snapshot) ==="
    nb "grep -A 2 'service:' $TUNNEL_CONFIG | tee -a $MANAGER_LOG || echo 'Config not found' | tee -a $MANAGER_LOG" 10
}

# Auto-failover logic
auto_failover() {
    log "Running auto-failover check..."
    
    if check_fly_health; then
        log "Fly.io is healthy - switching to primary"
        switch_tunnel_to_fly
    else
        log "Fly.io is down - switching to local fallback"
        switch_tunnel_to_local
    fi
}

# Command handler
case "${1:-}" in
    "start")
        start_pm2_services
        ;;
    "stop")
        stop_pm2_services
        ;;
    "restart")
        restart_pm2_services
        ;;
    "status")
        show_status
        ;;
    "tunnel-fly")
        switch_tunnel_to_fly
        ;;
    "tunnel-local")
        switch_tunnel_to_local
        ;;
    "tunnel-restart")
        restart_tunnel
        ;;
    "failover")
        auto_failover
        ;;
    "health")
        echo "=== HEALTH CHECK ==="
        check_health "$GHOST_BRIDGE_HEALTH" "Ghost Bridge" 30
        check_health "$FLASK_DASHBOARD_HEALTH" "Flask Dashboard" 30
        check_fly_health
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|tunnel-fly|tunnel-local|tunnel-restart|failover|health}"
        echo ""
        echo "Commands:"
        echo "  start           - Start all PM2 services"
        echo "  stop            - Stop all PM2 services"
        echo "  restart         - Restart all PM2 services"
        echo "  status          - Show comprehensive status"
        echo "  tunnel-fly      - Switch tunnel to Fly.io"
        echo "  tunnel-local    - Switch tunnel to local Flask"
        echo "  tunnel-restart  - Restart Cloudflare tunnel"
        echo "  failover        - Run auto-failover check"
        echo "  health          - Run health checks"
        exit 1
        ;;
esac 
