#!/bin/bash
# watchdog-runner.sh
# Auto-healing watchdog for ghost runner processes (cron-compatible)

# Configuration
PYTHON_PORT=5051
CHECK_INTERVAL=30
MAX_RESTARTS=5
LOG_FILE="logs/watchdogs/runner-watchdog.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure log directory exists
mkdir -p logs/watchdogs

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
    
    return 0
}

# Start Python ghost runner
start_python_runner() {
    log "🚀 Starting Python ghost runner on port $PYTHON_PORT..."
    cd /Users/sawyer/gitSync/gpt-cursor-runner
    python3 -m gpt_cursor_runner.main > logs/ghost-runner.log 2>&1 &
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

# Main watchdog function (for cron calls)
health() {
    log "🔍 Health check started"
    
    # Check Python ghost runner
    if ! check_process "python3.*gpt_cursor_runner" "$PYTHON_PORT"; then
        log "⚠️ Python ghost runner is down"
        
        # Try to restart
        if restart_process "python3.*gpt_cursor_runner" "$PYTHON_PORT" "1"; then
            log "✅ Python ghost runner restarted successfully"
        else
            log "❌ Python ghost runner restart failed - manual intervention required"
            # Send alert
            if [ -n "$SLACK_WEBHOOK_URL" ]; then
                curl -X POST -H "Content-Type: application/json" \
                     -d '{"text":"🚨 Ghost Runner Python process down - manual intervention required"}' \
                     "$SLACK_WEBHOOK_URL" 2>/dev/null || true
            fi
        fi
    else
        log "✅ Python ghost runner healthy"
    fi
    
    log "🔍 Health check completed"
}

# Main watchdog loop (for continuous monitoring)
monitor() {
    log "🛡️ Starting Ghost Runner Watchdog (continuous mode)"
    log "📊 Monitoring Python ($PYTHON_PORT) process"
    
    python_restarts=0
    
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
                if [ -n "$SLACK_WEBHOOK_URL" ]; then
                    curl -X POST -H "Content-Type: application/json" \
                         -d '{"text":"🚨 Ghost Runner Python process down - manual intervention required"}' \
                         "$SLACK_WEBHOOK_URL" 2>/dev/null || true
                fi
            fi
        else
            log "✅ Python ghost runner healthy"
            python_restarts=0  # Reset counter when healthy
        fi
        
        # Show status
        echo -e "${BLUE}📊 Status: Python(${python_restarts}/$MAX_RESTARTS)${NC}"
        
        # Sleep before next check
        sleep $CHECK_INTERVAL
    done
}

# Handle signals
trap 'log "🛑 Watchdog stopped by signal"; exit 0' SIGINT SIGTERM

# Parse command line arguments
case "${1:-health}" in
    "health")
        health
        ;;
    "monitor")
        monitor
        ;;
    "start")
        start_python_runner
        ;;
    *)
        echo "Usage: $0 {health|monitor|start}"
        echo "  health  - Run health check (for cron)"
        echo "  monitor - Run continuous monitoring"
        echo "  start   - Start the runner"
        exit 1
        ;;
esac 

HEALTH=$(curl -s https://gpt-cursor-runner.fly.dev/health | grep 'OK')
if [[ -z "$HEALTH" ]]; then
  echo "[FAIL] GHOST runner health check failed. Initiating cold restart."
  pkill -f ghost-bridge.js
  sleep 3
  nohup node scripts/ghost-bridge.js &
else
  echo "[PASS] GHOST runner OK."
fi 
