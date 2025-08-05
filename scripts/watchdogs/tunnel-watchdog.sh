#!/bin/bash
set -euo pipefail

# Tunnel Watchdog - Monitors and restarts Cloudflare tunnels
# This ensures external access to the system remains available

PROJECT_ROOT="/Users/sawyer/gitSync/gpt-cursor-runner"
TARGET_PROCESS="cloudflared"
TARGET_SCRIPT="config/tunnel-config.yml"
TARGET_LOG="$PROJECT_ROOT/logs/tunnel-watchdog.log"
PID_FILE="$PROJECT_ROOT/pids/tunnel-watchdog.pid"
TUNNEL_NAME="gpt-cursor-runner"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$TARGET_LOG"
}

# Function to check if tunnel is running
is_running() {
    pgrep -f "cloudflared.*tunnel.*run.*$TUNNEL_NAME" >/dev/null 2>&1
}

# Function to check if tunnel is healthy
is_healthy() {
    # Check if tunnel is responding externally
    if curl -s --max-time 10 "https://gpt-cursor-runner.thoughtmarks.app/api/status" >/dev/null 2>&1; then
        return 0
    fi
    
    # Check if tunnel process is running and has recent activity
    if [ -f "$PROJECT_ROOT/logs/cloudflared-tunnel.log" ]; then
        local recent_activity=$(tail -n 50 "$PROJECT_ROOT/logs/cloudflared-tunnel.log" 2>/dev/null | grep -c "Connected" 2>/dev/null || echo "0")
        if [ -n "$recent_activity" ] && [ "$recent_activity" -gt 0 ] 2>/dev/null; then
            return 0
        fi
    fi
    
    return 1
}

# Function to start tunnel
start_tunnel() {
    log "🚀 Starting Cloudflare tunnel..."
    
    # Kill any existing tunnel processes
    pkill -f "cloudflared.*tunnel" 2>/dev/null || true
    sleep 2
    
    # Start the tunnel with proper wrapping and disown
    cd "$PROJECT_ROOT"
    { nohup cloudflared tunnel --config "$TARGET_SCRIPT" run "$TUNNEL_NAME" >> logs/cloudflared-tunnel.log 2>&1 & } >/dev/null 2>&1 & disown
    
    # Wait for tunnel to establish
    sleep 10
    
    # Check if tunnel started successfully
    if is_running; then
        log "✅ Cloudflare tunnel started successfully"
        return 0
    else
        log "❌ Cloudflare tunnel failed to start"
        return 1
    fi
}

# Function to stop tunnel
stop_tunnel() {
    log "🛑 Stopping Cloudflare tunnel..."
    pkill -f "cloudflared.*tunnel.*run.*$TUNNEL_NAME" 2>/dev/null || true
    sleep 3
}

# Main watchdog loop
main() {
    log "🚀 Tunnel Watchdog starting..."
    
    # Write PID file
    echo $$ > "$PID_FILE"
    
    # Initial start
    if ! is_running; then
        start_tunnel
    else
        log "✅ Cloudflare tunnel already running"
    fi
    
    # Main monitoring loop
    while true; do
        if ! is_running; then
            log "⚠️ Cloudflare tunnel not running, restarting..."
            stop_tunnel
            start_tunnel
            
            # Wait longer after restart
            sleep 15
        elif ! is_healthy; then
            log "⚠️ Cloudflare tunnel not healthy (no external access), restarting..."
            stop_tunnel
            start_tunnel
            
            # Wait longer after restart
            sleep 15
        else
            log "✅ Cloudflare tunnel healthy"
        fi
        
        # Check every 60 seconds
        sleep 60
    done
}

# Handle script termination
cleanup() {
    log "🛑 Tunnel Watchdog stopping..."
    rm -f "$PID_FILE"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start the watchdog
main "$@" 