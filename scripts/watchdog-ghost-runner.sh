#!/bin/bash
# watchdog-ghost-runner.sh
# Auto-healing watchdog for ghost runner processes

# Configuration
PYTHON_PORT=5051
NODE_PORT=5555
CHECK_INTERVAL=30
MAX_RESTARTS=5
LOG_FILE="logs/watchdog-ghost-runner.log"

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

# Check if process is running
check_process() {
    local process_name="$1"
    local port="$2"
    
    # Check if process is running
    if ! ps aux | grep -E "$process_name" | grep -v grep > /dev/null 2>&1; then
        return 1
    fi
    
    # Check if port is listening
    if ! lsof -i:$port > /dev/null 2>&1; then
        return 1
    fi
    
    # Check if health endpoint responds
    if ! curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
        return 1
    fi
    
    return 0
}

# Start Python ghost runner
start_python_runner() {
    # Defer to PM2-managed ghost-python if available; avoid double-spawn
    if command -v pm2 >/dev/null 2>&1; then
        if pm2 jlist 2>/dev/null | grep -q '"name":\s*"ghost-python"'; then
            log "🚀 Dispatching PM2 start for ghost-python"
# MIGRATED: { timeout 30s pm2 start /Users/sawyer/gitSync/gpt-cursor-runner/config/ecosystem.config.js --only ghost-python & } >/dev/null 2>&1 & disown || true
node scripts/nb.js --ttl 30s --label pm2 --log validations/logs/pm2.log --status validations/status -- pm2 start /Users/sawyer/gitSync/gpt-cursor-runner/config/ecosystem.config.js --only ghost-python
            sleep 5
            return
        fi
    fi
    log "🚀 Starting Python ghost runner on port $PYTHON_PORT (direct)..."
    cd /Users/sawyer/gitSync/gpt-cursor-runner
    python3 -m gpt_cursor_runner.main --daemon --port $PYTHON_PORT > logs/python-runner.log 2>&1 &
    sleep 5
}

# Start Node.js server
start_node_server() {
    log "🚀 Starting Node.js server on port $NODE_PORT..."
    cd /Users/sawyer/gitSync/gpt-cursor-runner
    node server/index.js --daemon --port $NODE_PORT > logs/node-server.log 2>&1 &
    sleep 5
}

# Restart process
restart_process() {
    local process_name="$1"
    local port="$2"
    local restart_count="$3"
    
    log "🔄 Restarting $process_name (attempt $restart_count/$MAX_RESTARTS)..."
    
    # Kill existing process
    pkill -f "$process_name" 2>/dev/null || true
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    
    # Wait for process to fully stop
    sleep 3
    
    # Start new process
    if [[ "$process_name" == *"python"* ]]; then
        start_python_runner
    elif [[ "$process_name" == *"node"* ]]; then
        start_node_server
    fi
    
    # Wait for process to start
    sleep 5
    
    # Check if restart was successful
    if check_process "$process_name" "$port"; then
        log "✅ $process_name restarted successfully"
        return 0
    else
        log "❌ $process_name restart failed"
        return 1
    fi
}

# Main watchdog loop
main() {
    log "🛡️ Starting Ghost Runner Watchdog"
    log "📊 Monitoring Python ($PYTHON_PORT) and Node.js ($NODE_PORT) processes"
    
    python_restarts=0
    node_restarts=0
    
    while true; do
        # Check Python ghost runner
    if ! check_process "python3.*gpt_cursor_runner" "$PYTHON_PORT"; then
            log "⚠️ Python ghost runner is down"
            if [ $python_restarts -lt $MAX_RESTARTS ]; then
                ((python_restarts++))
                if restart_process "python3.*gpt_cursor_runner" "$PYTHON_PORT" "$python_restarts"; then
                    python_restarts=0  # Reset counter on successful restart
                fi
            else
                log "🚨 Python ghost runner exceeded max restarts. Manual intervention required."
                # Send alert
                if command -v curl >/dev/null 2>&1; then
                    curl -X POST -H "Content-Type: application/json" \
                         -d '{"text":"🚨 Ghost Runner Python process down - manual intervention required"}' \
                         "$SLACK_WEBHOOK_URL" 2>/dev/null || true
                fi
            fi
        else
            log "✅ Python ghost runner healthy"
            python_restarts=0  # Reset counter when healthy
        fi
        
        # Check Node.js server
        if ! check_process "node.*server/index.js" "$NODE_PORT"; then
            log "⚠️ Node.js server is down"
            if [ $node_restarts -lt $MAX_RESTARTS ]; then
                ((node_restarts++))
                if restart_process "node.*server/index.js" "$NODE_PORT" "$node_restarts"; then
                    node_restarts=0  # Reset counter on successful restart
                fi
            else
                log "🚨 Node.js server exceeded max restarts. Manual intervention required."
                # Send alert
                if command -v curl >/dev/null 2>&1; then
                    curl -X POST -H "Content-Type: application/json" \
                         -d '{"text":"🚨 Ghost Runner Node.js process down - manual intervention required"}' \
                         "$SLACK_WEBHOOK_URL" 2>/dev/null || true
                fi
            fi
        else
            log "✅ Node.js server healthy"
            node_restarts=0  # Reset counter when healthy
        fi
        
        # Show status
        echo -e "${BLUE}📊 Status: Python(${python_restarts}/$MAX_RESTARTS) Node.js(${node_restarts}/$MAX_RESTARTS)${NC}"
        
        # Sleep before next check
        sleep $CHECK_INTERVAL
    done
}

# Handle signals
trap 'log "🛑 Watchdog stopped by signal"; exit 0' SIGINT SIGTERM

# Start watchdog
main 
