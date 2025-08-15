#!/bin/bash
set -euo pipefail

# Fly.io Watchdog - Monitors and restarts Fly.io deployments
# This ensures the primary deployment remains available

PROJECT_ROOT="/Users/sawyer/gitSync/gpt-cursor-runner"
TARGET_LOG="$PROJECT_ROOT/logs/fly-watchdog.log"
PID_FILE="$PROJECT_ROOT/pids/fly-watchdog.pid"
FLY_APP="gpt-cursor-runner"
FLY_HEALTH_URL="https://gpt-cursor-runner.fly.dev/health"
FLY_WEBHOOK_URL="https://gpt-cursor-runner.fly.dev/webhook"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$TARGET_LOG"
}

# Resolve timeout binary
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

nb() {
    local cmd_str="$1"
    local t=${2:-60}
    if [ -n "$TIMEOUT_BIN" ]; then
        { $TIMEOUT_BIN ${t}s bash -lc "$cmd_str" & } >/dev/null 2>&1 & disown || true
    else
        { bash -lc "$cmd_str" & } >/dev/null 2>&1 & disown || true
    fi
}

# Function to check if Fly CLI is available
is_fly_available() {
    command -v fly &> /dev/null
}

# Function to check if Fly is authenticated
is_fly_authenticated() {
    fly auth whoami &> /dev/null 2>&1
}

# Function to check if Fly app is running
is_fly_running() {
    # Check if app exists and has running instances
    if fly apps list 2>/dev/null | grep -q "$FLY_APP"; then
        # Check if app has running instances
        local instances=$(fly status --app "$FLY_APP" 2>/dev/null | grep -c "running" || echo "0")
        if [ "$instances" -gt 0 ]; then
            return 0
        fi
    fi
    return 1
}

# Function to check if Fly app is healthy
is_fly_healthy() {
    # Check health endpoint
    if curl -s --max-time 30 "$FLY_HEALTH_URL" | grep -q "ok"; then
        return 0
    fi
    
    # Check webhook endpoint
    if curl -s --max-time 30 "$FLY_WEBHOOK_URL" >/dev/null 2>&1; then
        return 0
    fi
    
    return 1
}

# Function to start Fly deployment
start_fly() {
    log "🚀 Dispatching Fly.io deployment (non-blocking)..."
    cd "$PROJECT_ROOT"
    nb "fly deploy --remote-only >> logs/fly-deploy.log 2>&1" 300
    log "📤 fly deploy dispatched; watchdog will verify health on next cycles"
    # Give some time before first health check snapshot
    sleep 20
    if is_fly_running; then
        log "✅ Fly.io deployment appears running"
        return 0
    fi
    log "⚠️ Fly.io deployment not yet running"
    return 1
}

# Function to restart Fly deployment
restart_fly() {
    log "🔄 Dispatching Fly.io restart (non-blocking)..."
    nb "fly apps restart '$FLY_APP' >> logs/fly-restart.log 2>&1" 120
    log "📤 fly restart dispatched; watchdog will verify health"
    sleep 20
    if is_fly_healthy; then
        log "✅ Fly.io health OK after restart snapshot"
        return 0
    fi
    log "⚠️ Fly.io still not healthy after restart snapshot"
    return 1
}

# Main watchdog loop
main() {
    log "🚀 Fly.io Watchdog starting..."
    
    # Write PID file
    echo $$ > "$PID_FILE"
    
    # Check if Fly CLI is available
    if ! is_fly_available; then
        log "❌ Fly CLI not available, exiting"
        exit 1
    fi
    
    # Check if Fly is authenticated
    if ! is_fly_authenticated; then
        log "❌ Fly.io not authenticated, exiting"
        exit 1
    fi
    
    # Initial start
    if ! is_fly_running; then
        start_fly
    else
        log "✅ Fly.io app already running"
    fi
    
    # Main monitoring loop
    while true; do
        if ! is_fly_running; then
            log "⚠️ Fly.io app not running, starting deployment..."
            start_fly
            
            # Wait longer after restart
            sleep 30
        elif ! is_fly_healthy; then
            log "⚠️ Fly.io app not healthy, restarting..."
            restart_fly
            
            # Wait longer after restart
            sleep 30
        else
            log "✅ Fly.io app healthy"
        fi
        
        # Check every 120 seconds (2 minutes)
        sleep 120
    done
}

# Handle script termination
cleanup() {
    log "🛑 Fly.io Watchdog stopping..."
    rm -f "$PID_FILE"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start the watchdog
main "$@" 
