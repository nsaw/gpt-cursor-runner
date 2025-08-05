#!/bin/bash
set -e

# Ghost Unified Daemon Startup Script
# This script starts the unified daemon that monitors all ghost relay components

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
LOG_DIR="/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs"
PID_FILE="/tmp/ghost-unified-daemon.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if daemon is already running
check_daemon_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            log "Ghost unified daemon is already running (PID: $pid)"
            return 0
        else
            log "Stale PID file found, removing..."
            rm -f "$PID_FILE"
        fi
    fi
    return 1
}

# Kill existing daemon
kill_daemon() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            log "Stopping existing daemon (PID: $pid)..."
            kill "$pid" 2>/dev/null || true
            sleep 2
            if ps -p "$pid" > /dev/null 2>&1; then
                log "Force killing daemon..."
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
        rm -f "$PID_FILE"
    fi
}

# Ensure directories exist
ensure_directories() {
    log "Ensuring required directories exist..."
    
    mkdir -p "$LOG_DIR"
    mkdir -p "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs"
    mkdir -p "/Users/sawyer/gitSync/.cursor-cache/MAIN/.logs"
    mkdir -p "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries"
    mkdir -p "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries"
    mkdir -p "/Users/sawyer/gitSync/.cursor-cache/ROOT/summaries/.heartbeat"
    
    success "Directories created/verified"
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        error "PM2 is not installed"
        exit 1
    fi
    
    # Check required npm packages
    if [ ! -f "$PROJECT_ROOT/node_modules/axios/package.json" ]; then
        warning "axios package not found, installing..."
        cd "$PROJECT_ROOT" && npm install axios
    fi
    
    success "Dependencies verified"
}

# Start ghost relay components
start_ghost_components() {
    log "Starting ghost relay components..."
    
    cd "$PROJECT_ROOT"
    
    # Start ghost relay via PM2 (non-blocking)
    if ! pm2 describe ghost-relay > /dev/null 2>&1; then
        log "Starting ghost-relay..."
        { pm2 start "$PROJECT_ROOT/ecosystem.config.js" --only ghost-relay & } >/dev/null 2>&1 & disown
    fi
    
    # Start ghost viewer via PM2 (non-blocking)
    if ! pm2 describe ghost-viewer > /dev/null 2>&1; then
        log "Starting ghost-viewer..."
        { pm2 start "$PROJECT_ROOT/ecosystem.config.js" --only ghost-viewer & } >/dev/null 2>&1 & disown
    fi
    
    # Start ghost bridge via PM2 (non-blocking)
    if ! pm2 describe ghost-bridge > /dev/null 2>&1; then
        log "Starting ghost-bridge..."
        { pm2 start "$PROJECT_ROOT/ecosystem.config.js" --only ghost-bridge & } >/dev/null 2>&1 & disown
    fi
    
    success "Ghost components started"
}

# Start unified daemon
start_unified_daemon() {
    log "Starting unified daemon..."
    
    cd "$PROJECT_ROOT"
    
    # Set environment variables
    export NODE_ENV=production
    export GHOST_RELAY_URL=http://localhost:3001
    export GHOST_VIEWER_URL=http://localhost:7474
    
    # Start daemon in background
    nohup node scripts/ghost/ghost-unified-daemon.js > "$LOG_DIR/ghost-unified-daemon.log" 2>&1 &
    local daemon_pid=$!
    
    # Save PID
    echo "$daemon_pid" > "$PID_FILE"
    
    # Wait a moment and check if it started successfully
    sleep 3
    if ps -p "$daemon_pid" > /dev/null 2>&1; then
        success "Unified daemon started successfully (PID: $daemon_pid)"
        log "Logs: $LOG_DIR/ghost-unified-daemon.log"
        log "PID file: $PID_FILE"
    else
        error "Failed to start unified daemon"
        rm -f "$PID_FILE"
        exit 1
    fi
}

# Health check
health_check() {
    log "Performing health check..."
    
    local checks_passed=0
    local total_checks=4
    
    # Check ghost relay
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        success "Ghost relay: OK"
        ((checks_passed++))
    else
        error "Ghost relay: FAILED"
    fi
    
    # Check ghost viewer
    if curl -s http://localhost:7474/ghost > /dev/null 2>&1; then
        success "Ghost viewer: OK"
        ((checks_passed++))
    else
        error "Ghost viewer: FAILED"
    fi
    
    # Check ghost bridge
    if curl -s http://localhost:3000/ > /dev/null 2>&1; then
        success "Ghost bridge: OK"
        ((checks_passed++))
    else
        error "Ghost bridge: FAILED"
    fi
    
    # Check Cloudflare tunnel
    if curl -s --resolve webhook-thoughtmarks.THOUGHTMARKS.app:443:104.21.80.1 https://webhook-thoughtmarks.THOUGHTMARKS.app/ghost > /dev/null 2>&1; then
        success "Cloudflare tunnel: OK"
        ((checks_passed++))
    else
        warning "Cloudflare tunnel: FAILED (may be DNS propagation)"
    fi
    
    if [ $checks_passed -eq $total_checks ]; then
        success "All health checks passed ($checks_passed/$total_checks)"
    else
        warning "Some health checks failed ($checks_passed/$total_checks)"
    fi
}

# Main execution
main() {
    log "=== Ghost Unified Daemon Startup ==="
    
    # Check if already running
    if check_daemon_running; then
        log "Daemon is already running. Use --restart to restart."
        exit 0
    fi
    
    # Handle restart flag
    if [ "$1" = "--restart" ]; then
        log "Restarting daemon..."
        kill_daemon
    fi
    
    # Ensure directories
    ensure_directories
    
    # Check dependencies
    check_dependencies
    
    # Start ghost components
    start_ghost_components
    
    # Start unified daemon
    start_unified_daemon
    
    # Wait a moment for startup
    sleep 5
    
    # Health check
    health_check
    
    log "=== Startup Complete ==="
    log "Unified daemon is monitoring all ghost relay components"
    log "Use 'pm2 logs ghost-unified-daemon' to view logs"
    log "Use 'pm2 status' to view all processes"
}

# Handle command line arguments
case "${1:-}" in
    --restart)
        main --restart
        ;;
    --stop)
        kill_daemon
        success "Daemon stopped"
        ;;
    --status)
        if check_daemon_running; then
            success "Daemon is running"
        else
            error "Daemon is not running"
            exit 1
        fi
        ;;
    --help|-h)
        echo "Usage: $0 [OPTION]"
        echo ""
        echo "Options:"
        echo "  --restart    Restart the daemon"
        echo "  --stop       Stop the daemon"
        echo "  --status     Check daemon status"
        echo "  --help, -h   Show this help message"
        echo ""
        echo "Default: Start the daemon"
        ;;
    *)
        main
        ;;
esac 