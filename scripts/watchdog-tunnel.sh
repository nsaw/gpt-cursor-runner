#!/bin/bash
# watchdog-tunnel.sh
# Auto-healing watchdog for ngrok tunnels

# Configuration
PYTHON_PORT=5051
NODE_PORT=5555
NGROK_PORT=4040
CHECK_INTERVAL=60
MAX_RESTARTS=3
LOG_FILE="logs/watchdog-tunnel.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure log directory exists
mkdir -p logs

# Log function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Check if ngrok tunnel is working
check_tunnel() {
    local port="$1"
    local tunnel_name="$2"
    
    # Check if ngrok is running
    if ! ps aux | grep -E "ngrok.*http.*$port" | grep -v grep > /dev/null 2>&1; then
        return 1
    fi
    
    # Check if tunnel API is accessible
    if ! curl -s "http://localhost:$NGROK_PORT/api/tunnels" > /dev/null 2>&1; then
        return 1
    fi
    
    # Check if tunnel URL is valid
    local tunnel_url=$(curl -s "http://localhost:$NGROK_PORT/api/tunnels" | jq -r ".tunnels[] | select(.config.addr == \"localhost:$port\") | .public_url" 2>/dev/null)
    if [ -z "$tunnel_url" ] || [ "$tunnel_url" = "null" ]; then
        return 1
    fi
    
    # Test tunnel URL
    if ! curl -s "$tunnel_url/health" > /dev/null 2>&1; then
        return 1
    fi
    
    return 0
}

# Start ngrok tunnel
start_tunnel() {
    local port="$1"
    local tunnel_name="$2"
    
    log "🌐 Starting ngrok tunnel for $tunnel_name on port $port..."
    
    # Kill existing tunnel for this port
    pkill -f "ngrok.*http.*$port" 2>/dev/null || true
    
    # Start new tunnel
    ngrok http $port --log=stdout > "logs/ngrok-$tunnel_name.log" 2>&1 &
    
    # Wait for tunnel to start
    sleep 10
    
    # Get tunnel URL
    local tunnel_url=$(curl -s "http://localhost:$NGROK_PORT/api/tunnels" | jq -r ".tunnels[] | select(.config.addr == \"localhost:$port\") | .public_url" 2>/dev/null)
    
    if [ -n "$tunnel_url" ] && [ "$tunnel_url" != "null" ]; then
        log "✅ $tunnel_name tunnel started: $tunnel_url"
        return 0
    else
        log "❌ $tunnel_name tunnel failed to start"
        return 1
    fi
}

# Restart tunnel
restart_tunnel() {
    local port="$1"
    local tunnel_name="$2"
    local restart_count="$3"
    
    log "🔄 Restarting $tunnel_name tunnel (attempt $restart_count/$MAX_RESTARTS)..."
    
    if start_tunnel "$port" "$tunnel_name"; then
        log "✅ $tunnel_name tunnel restarted successfully"
        return 0
    else
        log "❌ $tunnel_name tunnel restart failed"
        return 1
    fi
}

# Main watchdog loop
main() {
    log "🛡️ Starting Tunnel Watchdog"
    log "📊 Monitoring ngrok tunnels for Python ($PYTHON_PORT) and Node.js ($NODE_PORT)"
    
    python_tunnel_restarts=0
    node_tunnel_restarts=0
    
    while true; do
        # Check Python tunnel
        if ! check_tunnel "$PYTHON_PORT" "python"; then
            log "⚠️ Python tunnel is down"
            if [ $python_tunnel_restarts -lt $MAX_RESTARTS ]; then
                ((python_tunnel_restarts++))
                if restart_tunnel "$PYTHON_PORT" "python" "$python_tunnel_restarts"; then
                    python_tunnel_restarts=0  # Reset counter on successful restart
                fi
            else
                log "🚨 Python tunnel exceeded max restarts. Manual intervention required."
                # Send alert
                if command -v curl >/dev/null 2>&1; then
                    curl -X POST -H "Content-Type: application/json" \
                         -d '{"text":"🚨 Python tunnel down - manual intervention required"}' \
                         "$SLACK_WEBHOOK_URL" 2>/dev/null || true
                fi
            fi
        else
            log "✅ Python tunnel healthy"
            python_tunnel_restarts=0  # Reset counter when healthy
        fi
        
        # Check Node.js tunnel
        if ! check_tunnel "$NODE_PORT" "node"; then
            log "⚠️ Node.js tunnel is down"
            if [ $node_tunnel_restarts -lt $MAX_RESTARTS ]; then
                ((node_tunnel_restarts++))
                if restart_tunnel "$NODE_PORT" "node" "$node_tunnel_restarts"; then
                    node_tunnel_restarts=0  # Reset counter on successful restart
                fi
            else
                log "🚨 Node.js tunnel exceeded max restarts. Manual intervention required."
                # Send alert
                if command -v curl >/dev/null 2>&1; then
                    curl -X POST -H "Content-Type: application/json" \
                         -d '{"text":"🚨 Node.js tunnel down - manual intervention required"}' \
                         "$SLACK_WEBHOOK_URL" 2>/dev/null || true
                fi
            fi
        else
            log "✅ Node.js tunnel healthy"
            node_tunnel_restarts=0  # Reset counter when healthy
        fi
        
        # Show tunnel URLs
        python_url=$(curl -s "http://localhost:$NGROK_PORT/api/tunnels" | jq -r ".tunnels[] | select(.config.addr == \"localhost:$PYTHON_PORT\") | .public_url" 2>/dev/null)
        node_url=$(curl -s "http://localhost:$NGROK_PORT/api/tunnels" | jq -r ".tunnels[] | select(.config.addr == \"localhost:$NODE_PORT\") | .public_url" 2>/dev/null)
        
        if [ -n "$python_url" ] && [ "$python_url" != "null" ]; then
            echo -e "${GREEN}📡 Python Tunnel: $python_url${NC}"
        fi
        
        if [ -n "$node_url" ] && [ "$node_url" != "null" ]; then
            echo -e "${GREEN}🖥️ Node.js Tunnel: $node_url${NC}"
        fi
        
        # Show status
        echo -e "${BLUE}📊 Tunnel Status: Python(${python_tunnel_restarts}/$MAX_RESTARTS) Node.js(${node_tunnel_restarts}/$MAX_RESTARTS)${NC}"
        
        # Sleep before next check
        sleep $CHECK_INTERVAL
    done
}

# Handle signals
trap 'log "🛑 Tunnel watchdog stopped by signal"; exit 0' SIGINT SIGTERM

# Start watchdog
main 