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
    log "🚀 Starting Fly.io deployment..."
    
    # Deploy the app
    cd "$PROJECT_ROOT"
    if fly deploy --remote-only >> logs/fly-deploy.log 2>&1; then
        log "✅ Fly.io deployment initiated"
        
        # Wait for deployment to complete
        sleep 30
        
        # Check if deployment was successful
        if is_fly_running; then
            log "✅ Fly.io deployment successful"
            return 0
        else
            log "❌ Fly.io deployment failed"
            return 1
        fi
    else
        log "❌ Fly.io deployment command failed"
        return 1
    fi
}

# Function to restart Fly deployment
restart_fly() {
    log "🔄 Restarting Fly.io deployment..."
    
    # Restart the app
    if fly apps restart "$FLY_APP" >> logs/fly-restart.log 2>&1; then
        log "✅ Fly.io restart initiated"
        
        # Wait for restart to complete
        sleep 20
        
        # Check if restart was successful
        if is_fly_healthy; then
            log "✅ Fly.io restart successful"
            return 0
        else
            log "❌ Fly.io restart failed"
            return 1
        fi
    else
        log "❌ Fly.io restart command failed"
        return 1
    fi
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