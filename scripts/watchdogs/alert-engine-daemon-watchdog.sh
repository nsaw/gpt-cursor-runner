#!/bin/bash
# Alert Engine Daemon Watchdog
# Monitors and restarts the alert engine daemon if needed

# Unified path structure
CYOPS_CACHE="/Users/sawyer/gitSync/.cursor-cache/CYOPS"
MAIN_CACHE="/Users/sawyer/gitSync/.cursor-cache/MAIN"
LOG_DIR="$CYOPS_CACHE/logs"
PID_DIR="$CYOPS_CACHE/pids"

# Ensure directories exist
mkdir -p "$LOG_DIR" "$PID_DIR"

# Configuration
DAEMON_NAME="alert-engine-daemon"
PID_FILE="$PID_DIR/${DAEMON_NAME}.pid"
LOG_FILE="$LOG_DIR/${DAEMON_NAME}-watchdog.log"
DAEMON_SCRIPT="scripts/daemons/${DAEMON_NAME}.js"
MAX_RESTARTS=5
RESTART_DELAY=30
CHECK_INTERVAL=60

# Logging function
log() {
    local message="$1"
    local level="${2:-info}"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Check if daemon is running
is_daemon_running() {
    if [ ! -f "$PID_FILE" ]; then
        return 1
    fi
    
    local pid=$(cat "$PID_FILE" 2>/dev/null)
    if [ -z "$pid" ]; then
        return 1
    fi
    
    if kill -0 "$pid" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Start the daemon
start_daemon() {
    log "Starting $DAEMON_NAME..."
    
    # Kill any existing processes
    if [ -f "$PID_FILE" ]; then
        local old_pid=$(cat "$PID_FILE")
        if kill -0 "$old_pid" 2>/dev/null; then
            log "Killing existing process $old_pid"
            kill -TERM "$old_pid" 2>/dev/null
            sleep 2
            kill -KILL "$old_pid" 2>/dev/null
        fi
        rm -f "$PID_FILE"
    fi
    
    # Start the daemon
    cd /Users/sawyer/gitSync/gpt-cursor-runner
    node "$DAEMON_SCRIPT" > "$LOG_DIR/${DAEMON_NAME}.log" 2>&1 &
    local new_pid=$!
    
    # Wait a moment and check if it started successfully
    sleep 3
    if kill -0 "$new_pid" 2>/dev/null; then
        log "$DAEMON_NAME started successfully with PID $new_pid"
        return 0
    else
        log "$DAEMON_NAME failed to start" "error"
        return 1
    fi
}

# Stop the daemon
stop_daemon() {
    log "Stopping $DAEMON_NAME..."
    
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid" 2>/dev/null
            sleep 2
            kill -KILL "$pid" 2>/dev/null
        fi
        rm -f "$PID_FILE"
    fi
    
    log "$DAEMON_NAME stopped"
}

# Main monitoring loop
monitor() {
    local restart_count=0
    
    log "Starting $DAEMON_NAME watchdog"
    
    while true; do
        if ! is_daemon_running; then
            log "$DAEMON_NAME is not running"
            
            if [ $restart_count -lt $MAX_RESTARTS ]; then
                restart_count=$((restart_count + 1))
                log "Attempting restart $restart_count/$MAX_RESTARTS"
                
                if start_daemon; then
                    log "$DAEMON_NAME restarted successfully"
                    restart_count=0
                else
                    log "Failed to restart $DAEMON_NAME" "error"
                    sleep $RESTART_DELAY
                fi
            else
                log "Max restart attempts reached for $DAEMON_NAME" "error"
                log "Stopping watchdog" "error"
                break
            fi
        else
            # Daemon is running, reset restart count
            restart_count=0
            log "$DAEMON_NAME is running normally"
        fi
        
        sleep $CHECK_INTERVAL
    done
}

# Handle signals
cleanup() {
    log "Watchdog shutting down..."
    stop_daemon
    exit 0
}

trap cleanup SIGINT SIGTERM

# Check if daemon script exists
if [ ! -f "$DAEMON_SCRIPT" ]; then
    log "Daemon script not found: $DAEMON_SCRIPT" "error"
    exit 1
fi

# Start monitoring
monitor 