#!/bin/bash
set -euo pipefail

# Enhanced Flask Watchdog - Monitors and restarts Flask applications with graceful recovery
# This ensures the Flask webhook and API endpoints remain available with jam-proof fallback

PROJECT_ROOT="/Users/sawyer/gitSync/gpt-cursor-runner"
TARGET_PROCESS="python.*dashboard/app.py"
TARGET_SCRIPT="dashboard/app.py"
TARGET_LOG="$PROJECT_ROOT/logs/flask-watchdog.log"
PID_FILE="$PROJECT_ROOT/pids/flask-watchdog.pid"
FLASK_PORT=8787
FLASK_HEALTH_URL="http://localhost:$FLASK_PORT/api/health"
FLASK_WEBHOOK_URL="http://localhost:$FLASK_PORT/webhook"

# Graceful recovery configuration
MAX_RESTARTS=3
RESTART_WINDOW=300  # 5 minutes
RESTART_COUNT_FILE="/tmp/flask-restart-count"
RESTART_TIME_FILE="/tmp/flask-restart-time"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$TARGET_LOG"
}

# Resolve timeout binary (prefer coreutils gtimeout on macOS if available)
resolve_timeout_bin() {
    if command -v timeout >/dev/null 2>&1; then
        echo "timeout"
    elif command -v gtimeout >/dev/null 2>&1; then
        echo "gtimeout"
    else
        echo ""
    fi
}
TIMEOUT_BIN="$(resolve_timeout_bin)"

# Non-blocking command runner with optional timeout and disown
nb() {
    local cmd_str="$1"
    local t=${2:-30}
    if [ -n "$TIMEOUT_BIN" ]; then
        { $TIMEOUT_BIN ${t}s bash -lc "$cmd_str" & } >/dev/null 2>&1 & disown || true
    else
        { bash -lc "$cmd_str" & } >/dev/null 2>&1 & disown || true
    fi
}

# PM2 describe check using mandated non-blocking pattern with temp status
pm2_service_exists() {
    local svc="$1"
    local t=${2:-15}
    local tmp_file="/tmp/pm2_${svc// /_}_exists_$$.status"
    rm -f "$tmp_file" 2>/dev/null || true
    (
      if pm2 describe "$svc" >/dev/null 2>&1; then
        echo OK > "$tmp_file"
      else
        echo FAIL > "$tmp_file"
      fi
    ) &
    local PID=$!
    sleep "$t"
    disown $PID 2>/dev/null || true
    local result="$(cat "$tmp_file" 2>/dev/null || echo FAIL)"
    rm -f "$tmp_file" 2>/dev/null || true
    [ "$result" = "OK" ]
}

# Function to check if Flask is running
is_running() {
    pgrep -f "$TARGET_PROCESS" >/dev/null 2>&1
}

# Initialize restart tracking
init_restart_tracking() {
    echo "0" > "$RESTART_COUNT_FILE"
    date +%s > "$RESTART_TIME_FILE"
}

# Check restart limits
check_restart_limits() {
    local current_time
    local last_restart_time
    local restart_count
    
    current_time=$(date +%s)
    last_restart_time=$(cat "$RESTART_TIME_FILE" 2>/dev/null || echo "0")
    restart_count=$(cat "$RESTART_COUNT_FILE" 2>/dev/null || echo "0")
    
    # Reset counter if outside window
    if [ $((current_time - last_restart_time)) -gt $RESTART_WINDOW ]; then
        echo "0" > "$RESTART_COUNT_FILE"
        restart_count=0
    fi
    
    if [ "$restart_count" -ge $MAX_RESTARTS ]; then
        log "🚨 MAX RESTARTS REACHED for Flask service"
        log "⏸️ Entering cooldown period - no more restarts for $RESTART_WINDOW seconds"
        return 1
    fi
    
    return 0
}

# Increment restart counter
increment_restart_counter() {
    local current_count
    local new_count
    
    current_count=$(cat "$RESTART_COUNT_FILE" 2>/dev/null || echo "0")
    new_count=$((current_count + 1))
    echo "$new_count" > "$RESTART_COUNT_FILE"
    date +%s > "$RESTART_TIME_FILE"
    log "🔄 Restart count: $new_count/$MAX_RESTARTS"
}

# Safe health check with timeout and non-blocking pattern
safe_health_check() {
    (
      if curl --silent --max-time 10 "$FLASK_HEALTH_URL" 2>/dev/null | grep -q "ok"; then
          echo "pass" > /tmp/flask_health_$$
      else
          echo "fail" > /tmp/flask_health_$$
      fi
    ) &
    local PID=$!
    sleep 10
    disown $PID 2>/dev/null || true
    local res="$(cat /tmp/flask_health_$$ 2>/dev/null || echo fail)"
    rm -f /tmp/flask_health_$$ 2>/dev/null || true
    if [ "$res" = "pass" ]; then
        return 0
    fi
    log "⏰ Flask health check timed out or failed"
    return 1
}

# Function to check if Flask is healthy
is_healthy() {
    # Use safe health check
    if safe_health_check; then
        return 0
    fi
    
    # Check if Flask is responding on webhook endpoint
    if curl -s --max-time 10 "$FLASK_WEBHOOK_URL" >/dev/null 2>&1; then
        return 0
    fi
    
    # Check if Flask process is running and has recent activity
    if [ -f "$PROJECT_ROOT/logs/dashboard.log" ]; then
        local recent_activity=$(tail -n 50 "$PROJECT_ROOT/logs/dashboard.log" 2>/dev/null | grep -c "Running" 2>/dev/null || echo "0")
        if [ -n "$recent_activity" ] && [ "$recent_activity" -gt 0 ] 2>/dev/null; then
            return 0
        fi
    fi
    
    return 1
}

# Function to start Flask with graceful recovery
start_flask() {
    log "🚀 Starting Flask application with graceful recovery..."
    
    # Check restart limits before attempting recovery
    if ! check_restart_limits; then
        log "⏸️ Skipping Flask recovery due to restart limits"
        return 1
    fi
    
    # First, try to stop Flask gracefully via PM2 if it's managed by PM2
    if pm2_service_exists "flask-dashboard" 15; then
        log "🔄 Stopping Flask via PM2..."
        { ${TIMEOUT_BIN:-timeout} 15s pm2 stop flask-dashboard --silent & } >/dev/null 2>&1 & disown || true
        { ${TIMEOUT_BIN:-timeout} 15s pm2 delete flask-dashboard --silent & } >/dev/null 2>&1 & disown || true
        sleep 3
    fi
    
    # Kill any existing Flask processes
    { pkill -f "$TARGET_PROCESS" & } >/dev/null 2>&1 & disown || true
    sleep 2
    
    # Check if port is available and free it non-destructively
    if lsof -ti:$FLASK_PORT >/dev/null 2>&1; then
        log "⚠️ Port $FLASK_PORT is in use, attempting graceful cleanup..."
        
        # Try graceful shutdown first
        { lsof -ti:$FLASK_PORT | xargs kill -TERM 2>/dev/null & } >/dev/null 2>&1 & disown || true
        sleep 5
        
        # Check if processes are still running
        local remaining_pids=$(lsof -ti:$FLASK_PORT 2>/dev/null)
        if [ -n "$remaining_pids" ]; then
            log "⚠️ Graceful shutdown failed, forcing kill"
            { echo "$remaining_pids" | xargs kill -KILL 2>/dev/null & } >/dev/null 2>&1 & disown || true
            sleep 2
        fi
    fi
    
    # Start Flask with proper wrapping and disown
    cd "$PROJECT_ROOT"
    { nohup python3 "$TARGET_SCRIPT" >> logs/dashboard.log 2>&1 & } >/dev/null 2>&1 & disown
    
    # Wait for Flask to start
    sleep 10
    
    # Check if Flask started successfully
    if is_running && is_healthy; then
        log "✅ Flask application started successfully"
        return 0
    else
        log "❌ Flask application failed to start"
        increment_restart_counter
        return 1
    fi
}

# Function to stop Flask
stop_flask() {
    log "🛑 Stopping Flask application..."
    pkill -f "$TARGET_PROCESS" 2>/dev/null || true
    sleep 3
}

# Function to check Flask dependencies
check_dependencies() {
    # Check if Python is available
    if ! command -v python3 &> /dev/null; then
        log "❌ Python3 not found"
        return 1
    fi
    
    # Check if required Python packages are installed
    if ! python3 -c "import flask" 2>/dev/null; then
        log "⚠️ Flask not installed, installing dependencies..."
        pip3 install -r dashboard/requirements.txt >> logs/flask-deps.log 2>&1
    fi
    
    return 0
}

# Main watchdog loop with graceful recovery
main() {
    log "🚀 Enhanced Flask Watchdog starting with graceful recovery..."
    
    # Initialize restart tracking
    init_restart_tracking
    
    # Write PID file
    echo $$ > "$PID_FILE"
    
    # Check dependencies
    if ! check_dependencies; then
        log "❌ Dependencies check failed, exiting"
        exit 1
    fi
    
    # Initial start
    if ! is_running; then
        start_flask
    else
        log "✅ Flask application already running"
    fi
    
    # Main monitoring loop with graceful recovery
    while true; do
        if ! is_running || ! is_healthy; then
            log "⚠️ Flask application unhealthy, attempting graceful recovery..."
            
            # Check restart limits before attempting recovery
            if check_restart_limits; then
                stop_flask
                start_flask
                
                # Wait longer after restart
                sleep 15
            else
                log "⏸️ Skipping recovery due to restart limits, waiting for cooldown..."
                sleep 60
            fi
        elif ! is_healthy; then
            log "⚠️ Flask application not healthy, restarting..."
            stop_flask
            start_flask
            
            # Wait longer after restart
            sleep 15
        else
            log "✅ Flask application healthy"
        fi
        
        # Check every 60 seconds
        sleep 60
    done
}

# Handle script termination
cleanup() {
    log "🛑 Flask Watchdog stopping..."
    rm -f "$PID_FILE"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start the watchdog
main "$@" 
