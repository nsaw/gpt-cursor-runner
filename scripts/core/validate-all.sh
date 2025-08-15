#!/bin/bash
set -eo pipefail

# =============================================================================
# COMPREHENSIVE SYSTEM VALIDATION SCRIPT
# =============================================================================

# CRITICAL PORT ASSIGNMENTS
GHOST_BRIDGE_PORT=5051
FLASK_DASHBOARD_PORT=8787
TELEMETRY_API_PORT=8788
TELEMETRY_ORCHESTRATOR_PORT=8789
EXPO_DEV_PORT=8081
MAIN_BACKEND_PORT=4000
GHOST_RELAY_PORT=3001

# SERVICE HEALTH ENDPOINTS
GHOST_BRIDGE_HEALTH="http://localhost:5051/health"
FLASK_DASHBOARD_HEALTH="http://localhost:8787/api/health"
TELEMETRY_API_HEALTH="http://localhost:8788/health"
EXPO_DEV_HEALTH="http://localhost:8081"

# TUNNEL ENDPOINTS
SLACK_URL="https://slack.thoughtmarks.app"
DASHBOARD_URL="https://gpt-cursor-runner.thoughtmarks.app"
EXPO_URL="https://expo-thoughtmarks.thoughtmarks.app"

# LOGGING
LOG_DIR="/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs"
VALIDATION_LOG="$LOG_DIR/validation.log"

# Create log directory
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$VALIDATION_LOG"
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
nb() {
  local cmd_str="$1"
  local t=${2:-30}
  if [ -n "$TIMEOUT_BIN" ]; then
    { $TIMEOUT_BIN ${t}s bash -lc "$cmd_str" & } >>"$VALIDATION_LOG" 2>&1 & disown || true
  else
    { bash -lc "$cmd_str" & } >>"$VALIDATION_LOG" 2>&1 & disown || true
  fi
}

# Health check function
check_health() {
    local url=$1
    local service_name=$2
    local timeout=${3:-10}
    
    if curl -s --max-time $timeout "$url" >/dev/null 2>&1; then
        echo "✅ $service_name"
        return 0
    else
        echo "❌ $service_name"
        return 1
    fi
}

# Check port binding
check_port() {
    local port=$1
    local service_name=$2
    
    if lsof -i:$port >/dev/null 2>&1; then
        echo "✅ $service_name (port $port)"
        return 0
    else
        echo "❌ $service_name (port $port)"
        return 1
    fi
}

# Check PM2 process
check_pm2_process() {
    local process_name=$1
    # Use pm2 describe to avoid fragile JSON/regex quoting issues
    if pm2 describe "$process_name" >/dev/null 2>&1; then
        if pm2 describe "$process_name" | grep -qE "status\\s*online"; then
            echo "✅ $process_name (PM2)"
            return 0
        fi
    fi
    echo "❌ $process_name (PM2)"
    return 1
}

# Check tunnel health
check_tunnel() {
    local url=$1
    local tunnel_name=$2
    
    if curl -s --max-time 10 "$url/health" >/dev/null 2>&1; then
        echo "✅ $tunnel_name"
        return 0
    else
        echo "❌ $tunnel_name"
        return 1
    fi
}

# Main validation function
main() {
    log "=== COMPREHENSIVE SYSTEM VALIDATION STARTED ==="
    
    local all_healthy=true
    
    echo ""
    echo "=== PORT BINDINGS ==="
    
    # Check port bindings
    if ! check_port $GHOST_BRIDGE_PORT "Ghost Bridge"; then
        all_healthy=false
    fi
    
    if ! check_port $FLASK_DASHBOARD_PORT "Flask Dashboard"; then
        all_healthy=false
    fi
    
    if ! check_port $TELEMETRY_API_PORT "Telemetry API"; then
        all_healthy=false
    fi
    
    if ! check_port $TELEMETRY_ORCHESTRATOR_PORT "Telemetry Orchestrator"; then
        all_healthy=false
    fi
    
    # Expo Dev Server is optional in CI/ops context; warn-only
    if ! check_port $EXPO_DEV_PORT "Expo Dev Server"; then
        echo "(info) Expo Dev Server not running — optional in non-dev contexts"
    fi
    
    if ! check_port $MAIN_BACKEND_PORT "Main Backend API"; then
        all_healthy=false
    fi
    
    if ! check_port $GHOST_RELAY_PORT "Ghost Relay"; then
        all_healthy=false
    fi
    
    echo ""
    echo "=== LOCAL HEALTH ENDPOINTS ==="
    
    # Check local health endpoints
    if ! check_health "$GHOST_BRIDGE_HEALTH" "Ghost Bridge Health"; then
        all_healthy=false
    fi
    
    if ! check_health "$FLASK_DASHBOARD_HEALTH" "Flask Dashboard Health"; then
        all_healthy=false
    fi
    
    if ! check_health "$TELEMETRY_API_HEALTH" "Telemetry API Health"; then
        all_healthy=false
    fi
    
    if ! check_health "$EXPO_DEV_HEALTH" "Expo Dev Health"; then
        all_healthy=false
    fi
    
    echo ""
    echo "=== PM2 PROCESSES ==="
    
    # Check PM2 processes
    if ! check_pm2_process "ghost-bridge"; then
        all_healthy=false
    fi
    
    if ! check_pm2_process "ghost-relay"; then
        all_healthy=false
    fi
    
    if ! check_pm2_process "ghost-viewer"; then
        all_healthy=false
    fi
    
    if ! check_pm2_process "telemetry-api"; then
        all_healthy=false
    fi
    
    if ! check_pm2_process "telemetry-orchestrator"; then
        all_healthy=false
    fi
    
    if ! check_pm2_process "dual-monitor"; then
        all_healthy=false
    fi
    
    if ! check_pm2_process "enhanced-doc-daemon"; then
        all_healthy=false
    fi
    
    if ! check_pm2_process "alert-engine-daemon"; then
        all_healthy=false
    fi
    
    if ! check_pm2_process "metrics-aggregator-daemon"; then
        all_healthy=false
    fi
    
    if ! check_pm2_process "autonomous-decision-daemon"; then
        all_healthy=false
    fi
    
    if ! check_pm2_process "dashboard-uplink"; then
        all_healthy=false
    fi
    
    echo ""
    echo "=== TUNNEL HEALTH ==="
    
    # Check tunnel health
    if ! check_tunnel "$SLACK_URL" "Slack Tunnel"; then
        all_healthy=false
    fi
    
    if ! check_tunnel "$DASHBOARD_URL" "Dashboard Tunnel"; then
        all_healthy=false
    fi
    
    if ! check_tunnel "$EXPO_URL" "Expo Tunnel"; then
        all_healthy=false
    fi
    
    echo ""
    echo "=== CLOUDFLARE TUNNEL STATUS ==="
    
    # Check Cloudflare tunnel process
    if ps aux | grep "cloudflared.*16db2f43-4725-419a-a64b-5ceeb7a5d4c3" | grep -v grep >/dev/null; then
        echo "✅ Cloudflare Tunnel Process"
    else
        echo "❌ Cloudflare Tunnel Process"
        all_healthy=false
    fi
    
    echo ""
    echo "=== PYTHON PROCESSES ==="
    
    # Check Python processes
    # Prefer PM2 presence for flask-dashboard instead of raw python grep
    if check_pm2_process "flask-dashboard"; then
        echo "✅ Flask Dashboard Process"
    else
        echo "❌ Flask Dashboard Process"
        all_healthy=false
    fi
    
    # Prefer Python ghost runner on 5051; fall back to node ghost-runner
    if check_pm2_process "ghost-python" || check_pm2_process "ghost-runner"; then
        echo "✅ Ghost Runner Process"
    else
        echo "❌ Ghost Runner Process"
        all_healthy=false
    fi
    
    echo ""
    echo "=== FINAL STATUS ==="
    
    if [ "$all_healthy" = true ]; then
        echo "🎉 ALL SYSTEMS OPERATIONAL"
        log "=== VALIDATION COMPLETED: ALL SYSTEMS HEALTHY ==="
        return 0
    else
        echo "⚠️ SOME SYSTEMS UNHEALTHY - CHECK LOGS FOR DETAILS"
        log "=== VALIDATION COMPLETED: SOME SYSTEMS UNHEALTHY ==="
        return 1
    fi
}

# Run main function
main "$@"
