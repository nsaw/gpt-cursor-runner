#!/bin/bash

# Webhook-Thoughtmarks Tunnel Daemon
# Keeps the cloudflared tunnel for webhook-thoughtmarks.thoughtmarks.app alive

set -e

# Configuration
TUNNEL_ID="9401ee23-3a46-409b-b0e7-b035371afe32"
TUNNEL_NAME="webhook-thoughtmarks"
CONFIG_FILE="/Users/sawyer/gitSync/gpt-cursor-runner/config/webhook-tunnel-config.yml"
LOG_FILE="/Users/sawyer/gitSync/gpt-cursor-runner/logs/webhook-tunnel-daemon.log"
PID_FILE="/Users/sawyer/gitSync/gpt-cursor-runner/pids/webhook-tunnel-daemon.pid"
HEALTH_CHECK_URL="https://webhook-thoughtmarks.thoughtmarks.app/health"
LOCAL_HEALTH_URL="http://localhost:5432/health"
CHECK_INTERVAL=30
MAX_RESTARTS=5
RESTART_COOLDOWN=60

# Colors for logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Create necessary directories
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$PID_FILE")"

# Function to check if tunnel is running
check_tunnel_running() {
    if cloudflared tunnel list | grep -q "$TUNNEL_ID.*[0-9]xpdx[0-9]*, [0-9]*xsea[0-9]*"; then
        return 0
    else
        return 1
    fi
}

# Function to check tunnel health
check_tunnel_health() {
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" 2>/dev/null || echo "000")
    if [[ "$response" == "200" ]]; then
        return 0
    else
        return 1
    fi
}

# Function to check local service health
check_local_service_health() {
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "$LOCAL_HEALTH_URL" 2>/dev/null || echo "000")
    if [[ "$response" == "200" ]]; then
        return 0
    else
        return 1
    fi
}

# Function to start tunnel
start_tunnel() {
    log "Starting webhook-thoughtmarks tunnel..."
    
    # Kill any existing tunnel processes
    pkill -f "cloudflared.*$TUNNEL_ID" 2>/dev/null || true
    sleep 2
    
    # Start tunnel in background
    {
        cloudflared tunnel --config "$CONFIG_FILE" run "$TUNNEL_ID" 2>&1
    } >/dev/null 2>&1 &
    
    local tunnel_pid=$!
    echo "$tunnel_pid" > "$PID_FILE"
    
    # Wait for tunnel to start
    sleep 10
    
    if check_tunnel_running; then
        success "Tunnel started successfully (PID: $tunnel_pid)"
        return 0
    else
        error "Failed to start tunnel"
        return 1
    fi
}

# Function to restart tunnel
restart_tunnel() {
    warn "Restarting webhook-thoughtmarks tunnel..."
    start_tunnel
}

# Main daemon loop
main() {
    log "Starting webhook-thoughtmarks tunnel daemon..."
    log "Tunnel ID: $TUNNEL_ID"
    log "Config: $CONFIG_FILE"
    log "Health check: $HEALTH_CHECK_URL"
    log "Check interval: ${CHECK_INTERVAL}s"
    
    local restart_count=0
    local last_restart=0
    
    while true; do
        # Check if tunnel is running
        if ! check_tunnel_running; then
            error "Tunnel not running, attempting restart..."
            
            # Check restart limits
            local current_time=$(date +%s)
            if [[ $((current_time - last_restart)) -lt $RESTART_COOLDOWN ]]; then
                warn "Restart cooldown active, waiting..."
                sleep $RESTART_COOLDOWN
                continue
            fi
            
            if [[ $restart_count -ge $MAX_RESTARTS ]]; then
                error "Max restarts reached ($MAX_RESTARTS), waiting for cooldown..."
                restart_count=0
                sleep 300  # 5 minute cooldown
                continue
            fi
            
            if restart_tunnel; then
                success "Tunnel restarted successfully"
                restart_count=0
            else
                error "Tunnel restart failed"
                ((restart_count++))
            fi
            
            last_restart=$current_time
        else
            # Check tunnel health
            if check_tunnel_health; then
                log "Tunnel healthy - responding on $HEALTH_CHECK_URL"
                restart_count=0  # Reset restart count on success
            else
                warn "Tunnel running but health check failed"
            fi
            
            # Check local service health
            if check_local_service_health; then
                log "Local service healthy - responding on $LOCAL_HEALTH_URL"
            else
                warn "Local service not responding on $LOCAL_HEALTH_URL"
            fi
        fi
        
        sleep $CHECK_INTERVAL
    done
}

# Signal handlers
cleanup() {
    log "Shutting down webhook-thoughtmarks tunnel daemon..."
    if [[ -f "$PID_FILE" ]]; then
        local tunnel_pid=$(cat "$PID_FILE")
        kill "$tunnel_pid" 2>/dev/null || true
        rm -f "$PID_FILE"
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if daemon is already running
if [[ -f "$PID_FILE" ]]; then
    local existing_pid=$(cat "$PID_FILE")
    if ps -p "$existing_pid" > /dev/null 2>&1; then
        error "Daemon already running with PID $existing_pid"
        exit 1
    else
        warn "Stale PID file found, removing..."
        rm -f "$PID_FILE"
    fi
fi

# Start the daemon
main 