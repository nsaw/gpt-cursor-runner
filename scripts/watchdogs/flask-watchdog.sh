#!/bin/bash
set -euo pipefail

# Flask Watchdog - Monitors and restarts Flask applications
# This ensures the Flask webhook and API endpoints remain available

PROJECT_ROOT="/Users/sawyer/gitSync/gpt-cursor-runner"
TARGET_PROCESS="python.*dashboard/app.py"
TARGET_SCRIPT="dashboard/app.py"
TARGET_LOG="$PROJECT_ROOT/logs/flask-watchdog.log"
PID_FILE="$PROJECT_ROOT/pids/flask-watchdog.pid"
FLASK_PORT=5555
FLASK_HEALTH_URL="http://localhost:$FLASK_PORT/health"
FLASK_WEBHOOK_URL="http://localhost:$FLASK_PORT/webhook"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$TARGET_LOG"
}

# Function to check if Flask is running
is_running() {
    pgrep -f "$TARGET_PROCESS" >/dev/null 2>&1
}

# Function to check if Flask is healthy
is_healthy() {
    # Check if Flask is responding on health endpoint
    if curl -s --max-time 10 "$FLASK_HEALTH_URL" | grep -q "ok"; then
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

# Function to start Flask
start_flask() {
    log "🚀 Starting Flask application..."
    
    # Kill any existing Flask processes
    pkill -f "$TARGET_PROCESS" 2>/dev/null || true
    sleep 2
    
    # Check if port is available
    if lsof -ti:$FLASK_PORT >/dev/null 2>&1; then
        log "⚠️ Port $FLASK_PORT is in use, killing existing processes..."
        lsof -ti:$FLASK_PORT | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    # Start Flask with proper wrapping and disown
    cd "$PROJECT_ROOT"
    { nohup python3 "$TARGET_SCRIPT" >> logs/dashboard.log 2>&1 & } >/dev/null 2>&1 & disown
    
    # Wait for Flask to start
    sleep 10
    
    # Check if Flask started successfully
    if is_running; then
        log "✅ Flask application started successfully"
        return 0
    else
        log "❌ Flask application failed to start"
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

# Main watchdog loop
main() {
    log "🚀 Flask Watchdog starting..."
    
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
    
    # Main monitoring loop
    while true; do
        if ! is_running; then
            log "⚠️ Flask application not running, restarting..."
            stop_flask
            start_flask
            
            # Wait longer after restart
            sleep 15
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