#!/bin/bash

# Local Runner Daemon - Background Health Monitoring
# Monitors localhost:5051 instead of tunnel

set -e

# Configuration
RUNNER_URL="http://localhost:5051"
LOG_DIR="./logs"
PID_FILE="./logs/local-daemon.pid"
HEARTBEAT_LOG="./logs/daemon-heartbeat.log"
CHECK_INTERVAL=30
MAX_LOG_SIZE="10M"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_DIR/daemon.log"
}

# Heartbeat logging
log_heartbeat() {
    local status=$1
    local message=$2
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    echo "[$timestamp] [$status] $message [rerouted to localhost]" >> "$HEARTBEAT_LOG"
}

# Check if daemon is already running
check_pid() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            return 0  # Running
        else
            log "WARN" "Stale PID file found, removing"
            rm -f "$PID_FILE"
        fi
    fi
    return 1  # Not running
}

# Health check function
check_runner_health() {
    local response
    local status_code
    
    # Try to connect to localhost:5051
    if command -v curl >/dev/null 2>&1; then
        response=$(curl -s -w "%{http_code}" -o /tmp/runner_response "$RUNNER_URL/health" 2>/dev/null || echo "000")
        status_code="${response: -3}"
        
        if [ "$status_code" = "200" ]; then
            log "INFO" "✅ Runner healthy (localhost:5051)"
            log_heartbeat "HEALTHY" "Runner responding on localhost:5051"
            return 0
        else
            log "WARN" "⚠️  Runner unhealthy (status: $status_code)"
            log_heartbeat "UNHEALTHY" "Runner status: $status_code"
            return 1
        fi
    else
        # Fallback: try netcat if curl not available
        if command -v nc >/dev/null 2>&1; then
            if nc -z localhost 5051 2>/dev/null; then
                log "INFO" "✅ Runner port accessible (localhost:5051)"
                log_heartbeat "HEALTHY" "Runner port accessible"
                return 0
            else
                log "WARN" "⚠️  Runner port not accessible"
                log_heartbeat "UNHEALTHY" "Runner port not accessible"
                return 1
            fi
        else
            log "ERROR" "❌ No curl or netcat available for health checks"
            return 1
        fi
    fi
}

# Start the local daemon
start_daemon() {
    log "INFO" "🚀 Starting local runner daemon for $RUNNER_URL"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Check if already running
    if check_pid; then
        log "WARN" "Daemon already running (PID: $(cat $PID_FILE))"
        return 1
    fi
    
    # Start background health monitoring
    (
        log "INFO" "📡 Starting health monitoring for localhost:5051"
        
        while true; do
            # Rotate logs if they get too large
            if [ -f "$LOG_DIR/daemon.log" ] && [ $(stat -f%z "$LOG_DIR/daemon.log" 2>/dev/null || echo 0) -gt $(numfmt --from=iec $MAX_LOG_SIZE) ]; then
                mv "$LOG_DIR/daemon.log" "$LOG_DIR/daemon.log.$(date +%Y%m%d_%H%M%S)"
                log "INFO" "Rotated daemon log file"
            fi
            
            # Perform health check
            if check_runner_health; then
                # Runner is healthy, continue monitoring
                sleep $CHECK_INTERVAL
            else
                # Runner is unhealthy, log the issue
                log "ERROR" "🚨 Runner health check failed"
                sleep $CHECK_INTERVAL
            fi
        done
    ) &
    
    local daemon_pid=$!
    echo $daemon_pid > "$PID_FILE"
    log "INFO" "✅ Local daemon started with PID: $daemon_pid"
    log_heartbeat "STARTED" "Local daemon started monitoring localhost:5051"
    
    return 0
}

# Stop the daemon
stop_daemon() {
    log "INFO" "🛑 Stopping local runner daemon"
    
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            log "INFO" "✅ Daemon stopped (PID: $pid)"
            log_heartbeat "STOPPED" "Local daemon stopped"
        else
            log "WARN" "Daemon not running (PID: $pid)"
        fi
        rm -f "$PID_FILE"
    else
        log "WARN" "No PID file found"
    fi
}

# Get daemon status
status() {
    if check_pid; then
        local pid=$(cat "$PID_FILE")
        log "INFO" "✅ Local daemon running (PID: $pid)"
        
        # Perform health check
        if check_runner_health; then
            log "INFO" "✅ Runner is healthy"
        else
            log "WARN" "⚠️  Runner health check failed"
        fi
        
        # Show recent heartbeat logs
        if [ -f "$HEARTBEAT_LOG" ]; then
            log "INFO" "📋 Recent heartbeat entries:"
            tail -5 "$HEARTBEAT_LOG" | while IFS= read -r line; do
                echo "  $line"
            done
        fi
        
        return 0
    else
        log "WARN" "❌ Local daemon not running"
        return 1
    fi
}

# Test runner connection
test_connection() {
    log "INFO" "🧪 Testing connection to $RUNNER_URL"
    if check_runner_health; then
        log "SUCCESS" "✅ Connection test passed"
        return 0
    else
        log "ERROR" "❌ Connection test failed"
        return 1
    fi
}

# Main command handling
case "${1:-start}" in
    start)
        start_daemon
        ;;
    stop)
        stop_daemon
        ;;
    restart)
        stop_daemon
        sleep 2
        start_daemon
        ;;
    status)
        status
        ;;
    test)
        test_connection
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|test}"
        echo "  start   - Start the local daemon"
        echo "  stop    - Stop the local daemon"
        echo "  restart - Restart the local daemon"
        echo "  status  - Show daemon status and health"
        echo "  test    - Test connection to localhost:5051"
        exit 1
        ;;
esac 