#!/bin/bash

# Ghost Bridge Watchdog
# Ensures ghost-bridge is always running and healthy

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
PID_DIR="$PROJECT_ROOT/pids"
BRIDGE_LOG="$LOG_DIR/ghost-bridge-watchdog.log"
BRIDGE_PID_FILE="$PID_DIR/ghost-bridge.pid"
HEARTBEAT_DIR="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_heartbeat"

# Ensure directories exist
mkdir -p "$LOG_DIR" "$PID_DIR" "$HEARTBEAT_DIR"

# Logging function
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "[$timestamp] [$level] $message" | tee -a "$BRIDGE_LOG"
}

# Check if process is running
check_bridge_process() {
    if [ -f "$BRIDGE_PID_FILE" ]; then
        local pid=$(cat "$BRIDGE_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    
    # Also check by process name
    if pgrep -f "ghost-bridge-simple.js" > /dev/null 2>&1; then
        return 0
    fi
    
    return 1
}

# Start bridge process
start_bridge() {
    log "INFO" "Starting ghost-bridge..."
    
    # Kill any existing processes
    pkill -f "ghost-bridge-simple.js" 2>/dev/null || true
    sleep 2
    
    # Start bridge
    cd "$PROJECT_ROOT"
    nohup node scripts/ghost-bridge-simple.js > "$LOG_DIR/ghost-bridge.log" 2>&1 &
    local bridge_pid=$!
    
    # Save PID
    echo "$bridge_pid" > "$BRIDGE_PID_FILE"
    
    # Wait for startup
    sleep 3
    
    if check_bridge_process; then
        log "SUCCESS" "Ghost bridge started successfully (PID: $bridge_pid)"
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - Ghost bridge started (PID: $bridge_pid)" >> "$HEARTBEAT_DIR/.last-md-write.log"
        return 0
    else
        log "ERROR" "Failed to start ghost bridge"
        return 1
    fi
}

# Restart bridge process
restart_bridge() {
    log "WARN" "Restarting ghost bridge..."
    
    # Kill existing process
    if [ -f "$BRIDGE_PID_FILE" ]; then
        local pid=$(cat "$BRIDGE_PID_FILE")
        kill "$pid" 2>/dev/null || true
        rm -f "$BRIDGE_PID_FILE"
    fi
    
    pkill -f "ghost-bridge-simple.js" 2>/dev/null || true
    sleep 3
    
    # Start new process
    start_bridge
}

# Health check
health_check() {
    log "INFO" "Performing bridge health check..."
    
    # Check if process is running
    if ! check_bridge_process; then
        log "ERROR" "Bridge process not running"
        return 1
    fi
    
    # Check log file for errors
    if [ -f "$LOG_DIR/ghost-bridge.log" ]; then
        local last_error=$(tail -n 50 "$LOG_DIR/ghost-bridge.log" | grep -i "error\|exception\|fatal" | tail -n 1)
        if [ -n "$last_error" ]; then
            log "WARN" "Recent error in bridge log: $last_error"
        fi
    fi
    
    # Check memory usage
    if [ -f "$BRIDGE_PID_FILE" ]; then
        local pid=$(cat "$BRIDGE_PID_FILE")
        local memory_usage=$(ps -o rss= -p "$pid" 2>/dev/null | awk '{print $1/1024}')
        if [ -n "$memory_usage" ] && [ "$memory_usage" -gt 100 ]; then
            log "WARN" "High memory usage: ${memory_usage}MB"
        fi
    fi
    
    log "SUCCESS" "Bridge health check passed"
    return 0
}

# Update heartbeat
update_heartbeat() {
    local status="$1"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local pid=$(cat "$BRIDGE_PID_FILE" 2>/dev/null || echo "unknown")
    
    cat > "$HEARTBEAT_DIR/ghost-bridge-status.json" << EOF
{
  "service": "ghost-bridge",
  "status": "$status",
  "timestamp": "$timestamp",
  "pid": "$pid",
  "log_file": "$LOG_DIR/ghost-bridge.log",
  "watchdog_log": "$BRIDGE_LOG"
}
EOF
}

# Main monitoring loop
monitor_loop() {
    log "INFO" "Starting ghost bridge watchdog..."
    
    while true; do
        # Check if bridge is running
        if ! check_bridge_process; then
            log "ERROR" "Bridge not running, starting..."
            if start_bridge; then
                update_heartbeat "RESTARTED"
            else
                update_heartbeat "FAILED"
                log "ERROR" "Failed to start bridge, will retry in 30 seconds"
                sleep 30
                continue
            fi
        else
            # Perform health check
            if health_check; then
                update_heartbeat "HEALTHY"
            else
                log "WARN" "Health check failed, restarting bridge..."
                restart_bridge
                update_heartbeat "RESTARTED"
            fi
        fi
        
        # Wait before next check
        sleep 30
    done
}

# Handle signals
cleanup() {
    log "INFO" "Shutting down ghost bridge watchdog..."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Main execution
main() {
    log "INFO" "=== Ghost Bridge Watchdog Starting ==="
    
    # Check if already running
    if pgrep -f "ghost-bridge-watchdog.sh" | grep -v $$ > /dev/null 2>&1; then
        log "WARN" "Another watchdog instance is running"
        exit 1
    fi
    
    # Ensure bridge is running initially
    if ! check_bridge_process; then
        start_bridge
    fi
    
    # Start monitoring loop
    monitor_loop
}

# Run main function
main "$@" 