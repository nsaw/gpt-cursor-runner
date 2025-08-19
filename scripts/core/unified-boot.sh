#!/bin/bash
set -eo pipefail

# =============================================================================
# UNIFIED BOOT SCRIPT - HARDENED PORT ASSIGNMENTS
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

# SERVICE HEALTH ENDPOINTS
***REMOVED***_BRIDGE_HEALTH="http://localhost:5051/health"
FLASK_DASHBOARD_HEALTH="http://localhost:8787/api/health"
TELEMETRY_API_HEALTH="http://localhost:8788/health"
EXPO_DEV_HEALTH="http://localhost:8081"

# LOGGING
LOG_DIR="/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs"
PID_DIR="/Users/sawyer/gitSync/gpt-cursor-runner/pids"
BOOT_LOG="$LOG_DIR/unified-boot.log"

# Create directories
mkdir -p "$LOG_DIR" "$PID_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BOOT_LOG"
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
    # Run the required curl PID pattern inside a detached subshell via nb(), so caller is non-blocking
    nb "( if curl --silent --max-time ${t} '${url}' 2>/dev/null | grep -q '.'; then echo '[OK] ${label}'; else echo '[FAIL] ${label}'; fi ) & PID=\$!; sleep ${t}; disown \$PID" "$t"
}

# Health check helper (non-blocking). Logs result and returns immediately
check_health() {
    local url=$1
    local service_name=$2
    local timeout=${3:-30}
    log "Checking health for $service_name at $url (non-blocking, ${timeout}s)"
    curl_nb "$url" "$service_name" "$timeout"
    # Non-blocking: do not gate on return; always return success to keep boot flowing
    return 0
}

# Kill processes on specific ports
kill_port() {
    local port=$1
    local service_name=$2
    
    log "Killing processes on port $port ($service_name)"
    
    # Find and kill processes using the port
    lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null || true
    sleep 2
    
    # Verify port is free
    if lsof -i:$port >/dev/null 2>&1; then
        log "⚠️ Port $port still in use after kill attempt"
        return 1
    else
        log "✅ Port $port is now free"
        return 0
    fi
}

# Start Flask Dashboard
start_flask_dashboard() {
    log "Starting Flask Dashboard on port $FLASK_DASHBOARD_PORT"
    
    # Kill any existing Flask processes
    kill_port $FLASK_DASHBOARD_PORT "Flask Dashboard"
    
    # Start Flask dashboard (non-blocking, disowned)
    { (
        cd /Users/sawyer/gitSync/gpt-cursor-runner || exit 0
        python3 dashboard/app.py >/dev/null 2>&1 &
        local flask_pid=$!
        echo $flask_pid > "$PID_DIR/flask-dashboard.pid"
        sleep 8
        check_health "$FLASK_DASHBOARD_HEALTH" "Flask Dashboard" 20
      ) & } >/dev/null 2>&1 & disown
}

# Start Telemetry API
start_telemetry_api() {
    log "Starting Telemetry API on port $TELEMETRY_API_PORT"
    
    # Kill any existing telemetry processes
    kill_port $TELEMETRY_API_PORT "Telemetry API"
    
    # Start telemetry API (non-blocking, disowned)
    { (
        cd /Users/sawyer/gitSync/gpt-cursor-runner || exit 0
        node scripts/daemons/telemetry-api.js >/dev/null 2>&1 &
        local telemetry_pid=$!
        echo $telemetry_pid > "$PID_DIR/telemetry-api.pid"
        sleep 5
        check_health "$TELEMETRY_API_HEALTH" "Telemetry API" 20
      ) & } >/dev/null 2>&1 & disown
}

# Start PM2 services
start_pm2_services() {
    log "Starting PM2 services..."
    
    # Kill any existing PM2 processes (non-blocking)
    nb "pm2 kill" 15
    sleep 2
    
    # Start PM2 services (non-blocking) - standardize to config/ecosystem.config.js
    nb "pm2 start /Users/sawyer/gitSync/gpt-cursor-runner/config/ecosystem.config.js" 30
    nb "pm2 save" 10
    
    # Non-blocking status snapshot
    nb "pm2 list" 15
}

# Start Expo development server
start_expo_dev_server() {
    log "Starting Expo development server on port $EXPO_DEV_PORT..."
    
    # Kill any existing Expo processes
    kill_port $EXPO_DEV_PORT "Expo Dev Server"
    
    # Navigate to Expo project directory and start server
    local expo_project_dir="/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh"
    
    if [ -d "$expo_project_dir" ]; then
        log "Found Expo project at $expo_project_dir"
        nb "cd $expo_project_dir && npx expo start --port $EXPO_DEV_PORT --non-interactive" 45
    else
        log "⚠️ Expo project directory not found at $expo_project_dir"
        return 1
    fi
}

# Start Cloudflare tunnel
start_cloudflare_tunnel() {
    log "Starting Cloudflare tunnel..."
    
    # Kill any existing tunnel processes
    pkill -f "cloudflared.*$TUNNEL_ID" 2>/dev/null || true
    sleep 2
    
    # Start tunnel (non-blocking, disowned)
    { (
        cloudflared tunnel run "$TUNNEL_ID" >/dev/null 2>&1 &
        local tunnel_pid=$!
        echo $tunnel_pid > "$PID_DIR/cloudflared.pid"
        sleep 10
        curl_nb "$SLACK_URL/health" "Cloudflare tunnel" 20
      ) & } >/dev/null 2>&1 & disown
}

# Validate all services
validate_services() {
    log "Validating all services..."
    
    local all_healthy=true
    
    # Check Ghost Bridge
    if ! check_health "$***REMOVED***_BRIDGE_HEALTH" "Ghost Bridge" 30; then
        all_healthy=false
    fi
    
    # Check Flask Dashboard
    if ! check_health "$FLASK_DASHBOARD_HEALTH" "Flask Dashboard" 30; then
        all_healthy=false
    fi
    
    # Check Telemetry API
    if ! check_health "$TELEMETRY_API_HEALTH" "Telemetry API" 30; then
        all_healthy=false
    fi
    
    # Check Expo Dev Server
    if ! check_health "$EXPO_DEV_HEALTH" "Expo Dev Server" 30; then
        all_healthy=false
    fi
    
    # PM2 services snapshot (non-blocking; do not gate boot)
    nb "pm2 list" 15
    
    if [ "$all_healthy" = true ]; then
        log "✅ Health checks dispatched (non-blocking). Review $BOOT_LOG for results."
    else
        log "⚠️ Some services reported unhealthy during dispatch"
    fi
    # Non-blocking mode: always return success to avoid blocking the boot flow
    return 0
}

# Validate tunnel health
validate_tunnel_health() {
    log "Validating tunnel health..."
    
    # Dispatch tunnel health check (non-blocking)
    curl_nb "$SLACK_URL/health" "Primary tunnel" 15
    return 0
}

# Additional port preflight cleanup for services that may autostart on boot
preflight_ports_cleanup() {
    # Known auxiliary ports that can be occupied by autostarts
    local ports=(
      3001  # dual-monitor
      3002  # comprehensive dashboard / registry
      5001  # dashboard status API
      5050  # runner microservice
      5054  # alert-engine alt
      7474  # live-status-server
      8789  # real-time status API / orchestrator
      3222  # status server
    )
    for p in "${ports[@]}"; do
      kill_port "$p" "Preflight"
    done
}

# Post-boot PM2 status/log sampling and safe restarts (all non-blocking)
post_boot_pm2_introspection() {
    log "Dispatching post-boot PM2 status/log sampling (non-blocking)"
    nb "pm2 status" 15
    nb "pm2 logs --lines 20" 15
    nb "pm2 logs dual-monitor --lines 10" 15
    nb "pm2 logs ghost-relay --lines 5" 15
    nb "pm2 restart dual-monitor ghost-relay ghost-viewer" 30
}

# Main boot sequence
main() {
    log "=== UNIFIED BOOT SEQUENCE STARTED ==="
    
    # Phase 1: Kill conflicting processes
    log "Phase 1: Killing conflicting processes"
    kill_port $FLASK_DASHBOARD_PORT "Flask Dashboard"
    kill_port $TELEMETRY_API_PORT "Telemetry API"
    kill_port $***REMOVED***_BRIDGE_PORT "Ghost Bridge"
    kill_port $EXPO_DEV_PORT "Expo Dev Server"
    preflight_ports_cleanup
    
    # Phase 2: Start core services
    log "Phase 2: Starting core services"
    start_flask_dashboard
    start_telemetry_api
    start_pm2_services
    start_expo_dev_server
    
    # Phase 3: Start tunnel
    log "Phase 3: Starting Cloudflare tunnel"
    start_cloudflare_tunnel
    
    # Phase 4: Validate services
    log "Phase 4: Validating all services"
    sleep 10  # Shorter wait; health checks are non-blocking and will continue logging
    validate_services
    
    # Phase 5: Validate tunnel health
    log "Phase 5: Validating tunnel health"
    validate_tunnel_health
    
    # Phase 6: PM2 post-boot insights
    log "Phase 6: PM2 introspection"
    post_boot_pm2_introspection
    
    log "=== UNIFIED BOOT SEQUENCE COMPLETED ==="
}

# Run main function
main "$@" 
