#!/bin/bash
# Enhanced Document Daemon Watchdog
# Monitors and restarts the enhanced document daemon

LOG_FILE="/Users/sawyer/gitSync/gpt-cursor-runner/logs/enhanced-doc-daemon-watchdog.log"
DAEMON_SCRIPT="/Users/sawyer/gitSync/gpt-cursor-runner/scripts/daemons/enhanced-doc-daemon.js"
PID_FILE="/Users/sawyer/gitSync/gpt-cursor-runner/pids/enhanced-doc-daemon.pid"
CHECK_INTERVAL=60  # Check every 60 seconds
MAX_RESTARTS=5
RESTART_COOLDOWN=300  # 5 minutes

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if daemon is running
is_daemon_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            # PID file exists but process is dead
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Start the daemon
start_daemon() {
    log "Starting Enhanced Document Daemon..."
    
    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Start daemon in background
    cd /Users/sawyer/gitSync/gpt-cursor-runner
    { nohup node "$DAEMON_SCRIPT" > /dev/null 2>&1 & } >/dev/null 2>&1 & disown
    local pid="$(pgrep -f 'enhanced-doc-daemon.js' | head -1)"
    
    # Save PID
    mkdir -p "$(dirname "$PID_FILE")"
    echo "$pid" > "$PID_FILE"
    
    log "Enhanced Document Daemon started with PID: $pid"
    return 0
}

# Stop the daemon
stop_daemon() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            log "Stopping Enhanced Document Daemon (PID: $pid)..."
            { kill "$pid" 2>/dev/null & } >/dev/null 2>&1 & disown || true
            sleep 2
            if ps -p "$pid" > /dev/null 2>&1; then
                log "Force killing Enhanced Document Daemon..."
                { kill -9 "$pid" 2>/dev/null & } >/dev/null 2>&1 & disown || true
            fi
        fi
        rm -f "$PID_FILE"
    fi
}

# Check daemon health
check_daemon_health() {
    if ! is_daemon_running; then
        log "❌ Enhanced Document Daemon is not running"
        return 1
    fi
    
    local pid=$(cat "$PID_FILE")
    
    # Check if process is responsive (not zombie)
    local process_state=$(ps -o state= -p "$pid" 2>/dev/null)
    if [ "$process_state" = "Z" ]; then
        log "❌ Enhanced Document Daemon is zombie (PID: $pid)"
        return 1
    fi
    
    # Check log file for recent activity
    if [ -f "$LOG_FILE" ]; then
        local last_log_time=$(stat -f "%m" "$LOG_FILE" 2>/dev/null || echo "0")
        local current_time=$(date +%s)
        local time_diff=$((current_time - last_log_time))
        
        # If no log activity in last 5 minutes, consider it unhealthy
        if [ $time_diff -gt 300 ]; then
            log "⚠️ Enhanced Document Daemon may be stuck (no log activity for ${time_diff}s)"
            return 1
        fi
    fi
    
    log "✅ Enhanced Document Daemon is healthy (PID: $pid)"
    return 0
}

# Main watchdog loop
main() {
    log "Enhanced Document Daemon Watchdog starting..."
    
    # Initialize restart counter
    local restart_count=0
    local last_restart_time=0
    
    while true; do
        if ! check_daemon_health; then
            local current_time=$(date +%s)
            
            # Check restart limits
            if [ $restart_count -ge $MAX_RESTARTS ]; then
                local time_since_last_restart=$((current_time - last_restart_time))
                if [ $time_since_last_restart -lt $RESTART_COOLDOWN ]; then
                    log "⚠️ Maximum restarts reached. Waiting for cooldown..."
                    sleep $CHECK_INTERVAL
                    continue
                else
                    # Reset restart counter after cooldown
                    restart_count=0
                fi
            fi
            
            # Stop existing daemon if running
            stop_daemon
            
            # Start new daemon
            if start_daemon; then
                restart_count=$((restart_count + 1))
                last_restart_time=$current_time
                log "🔄 Enhanced Document Daemon restarted (attempt $restart_count/$MAX_RESTARTS)"
            else
                log "❌ Failed to start Enhanced Document Daemon"
            fi
        else
            # Daemon is healthy, reset restart counter
            restart_count=0
        fi
        
        sleep $CHECK_INTERVAL
    done
}

# Handle shutdown
cleanup() {
    log "Enhanced Document Daemon Watchdog shutting down..."
    stop_daemon
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start the watchdog
main 
