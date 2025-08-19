#!/bin/bash
# watchdog-braun.sh
# Auto-healing watchdog for BRAUN daemon (cron-compatible)

# Configuration
BRAUN_SCRIPT="braun_daemon.py"
CHECK_INTERVAL=60
MAX_RESTARTS=5
LOG_FILE="logs/watchdogs/braun-watchdog.log"

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

# Check if BRAUN daemon is running
check_braun_daemon() {
    if ps aux | grep -E "python.*braun_daemon" | grep -v grep > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Start BRAUN daemon
start_braun_daemon() {
    log "🚀 Starting BRAUN daemon..."
    cd /Users/sawyer/gitSync/gpt-cursor-runner
    python3 braun_daemon.py > logs/braun-daemon.log 2>&1 &
    sleep 5
}

# Restart BRAUN daemon
restart_braun_daemon() {
    local restart_count="$1"
    
    log "🔄 Restarting BRAUN daemon (attempt $restart_count/$MAX_RESTARTS)..."
    
    # Kill existing BRAUN processes
    pkill -f "python.*braun_daemon" 2>/dev/null || true
    
    # Wait for process to fully stop
    sleep 3
    
    # Start new process
    start_braun_daemon
    
    # Wait for process to start
    sleep 5
    
    # Check if restart was successful
    if check_braun_daemon; then
        log "✅ BRAUN daemon restarted successfully"
        return 0
    else
        log "❌ BRAUN daemon restart failed"
        return 1
    fi
}

# Main watchdog function (for cron calls)
health() {
    log "🔍 BRAUN health check started"
    
    # Check BRAUN daemon
    if ! check_braun_daemon; then
        log "⚠️ BRAUN daemon is down"
        
        # Try to restart
        if restart_braun_daemon "1"; then
            log "✅ BRAUN daemon restarted successfully"
        else
            log "❌ BRAUN daemon restart failed - manual intervention required"
            # Send alert
            if [ -n "$SLACK_WEBHOOK_URL" ]; then
                curl -X POST -H "Content-Type: application/json" \
                     -d '{"text":"🚨 BRAUN Daemon down - manual intervention required"}' \
                     "$SLACK_WEBHOOK_URL" 2>/dev/null || true
            fi
        fi
    else
        log "✅ BRAUN daemon healthy"
    fi
    
    log "🔍 BRAUN health check completed"
}

# Main watchdog loop (for continuous monitoring)
monitor() {
    log "🛡️ Starting BRAUN Watchdog (continuous mode)"
    log "📊 Monitoring BRAUN daemon process"
    
    braun_restarts=0
    
    while true; do
        # Check BRAUN daemon
        if ! check_braun_daemon; then
            log "⚠️ BRAUN daemon is down"
            if [ $braun_restarts -lt $MAX_RESTARTS ]; then
                ((braun_restarts++))
                if restart_braun_daemon "$braun_restarts"; then
                    braun_restarts=0  # Reset counter on successful restart
                fi
            else
                log "🚨 BRAUN daemon exceeded max restarts. Manual intervention required."
                # Send alert
                if [ -n "$SLACK_WEBHOOK_URL" ]; then
                    curl -X POST -H "Content-Type: application/json" \
                         -d '{"text":"🚨 BRAUN Daemon down - manual intervention required"}' \
                         "$SLACK_WEBHOOK_URL" 2>/dev/null || true
                fi
            fi
        else
            log "✅ BRAUN daemon healthy"
            braun_restarts=0  # Reset counter when healthy
        fi
        
        # Show status
        echo -e "${BLUE}📊 Status: BRAUN(${braun_restarts}/$MAX_RESTARTS)${NC}"
        
        # Sleep before next check
        sleep $CHECK_INTERVAL
    done
}

# Handle signals
trap 'log "🛑 BRAUN Watchdog stopped by signal"; exit 0' SIGINT SIGTERM

# Parse command line arguments
case "${1:-health}" in
    "health")
        health
        ;;
    "monitor")
        monitor
        ;;
    "start")
        start_braun_daemon
        ;;
    *)
        echo "Usage: $0 {health|monitor|start}"
        echo "  health  - Run health check (for cron)"
        echo "  monitor - Run continuous monitoring"
        echo "  start   - Start the BRAUN daemon"
        exit 1
        ;;
esac 
