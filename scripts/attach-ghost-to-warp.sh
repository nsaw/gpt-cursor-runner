#!/bin/bash

# =============================================================================
# ATTACH ***REMOVED*** TO WARP TUNNEL SCRIPT
# =============================================================================
# Attaches Ghost runners, daemons, and watchdogs to the new WARP tunnel
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/sawyer/gitSync/gpt-cursor-runner"
TM_MOBILE_ROOT="/Users/sawyer/gitSync/tm-mobile-cursor"
CLOUDFLARED_DIR="/Users/sawyer/.cloudflared"
RUNNER_TUNNEL_ID="f1545c78-1a94-408f-ba6b-9c4223b4c2bf"
***REMOVED***_TUNNEL_ID="c9a7bf54-dab4-4c9f-a05d-2022f081f4e0"
RUNNER_HOSTNAME="runner.thoughtmarks.app"
***REMOVED***_HOSTNAME="ghost.thoughtmarks.app"
RUNNER_PORT=5555
***REMOVED***_PORT=5556

# Function to log messages
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Function to check if cloudflared is running
check_cloudflared() {
    if pgrep -f cloudflared > /dev/null; then
        log_info "✅ Cloudflared is running"
        return 0
    else
        log_warn "⚠️ Cloudflared is not running"
        return 1
    fi
}

# Function to start cloudflared tunnels
start_cloudflared_tunnels() {
    log_info "Starting cloudflared tunnels..."
    
    # Kill any existing cloudflared processes
    pkill -f cloudflared 2>/dev/null || true
    
    # Start runner tunnel
    log_info "Starting runner tunnel ($RUNNER_HOSTNAME)..."
    cloudflared tunnel run $RUNNER_TUNNEL_ID &
    RUNNER_PID=$!
    echo $RUNNER_PID > /tmp/cloudflared-runner.pid
    
    # Start ghost tunnel
    log_info "Starting ghost tunnel ($***REMOVED***_HOSTNAME)..."
    cloudflared tunnel --config $CLOUDFLARED_DIR/ghost-config.yml run $***REMOVED***_TUNNEL_ID &
    ***REMOVED***_PID=$!
    echo $***REMOVED***_PID > /tmp/cloudflared-ghost.pid
    
    log_info "✅ Tunnels started (Runner PID: $RUNNER_PID, Ghost PID: $***REMOVED***_PID)"
}

# Function to start Ghost runner processes
start_ghost_runners() {
    log_info "Starting Ghost runner processes..."
    
    # Start main Ghost runner
    log_info "Starting main Ghost runner on port $***REMOVED***_PORT..."
    cd $PROJECT_ROOT
    python3 -m gpt_cursor_runner.main --port $***REMOVED***_PORT &
    ***REMOVED***_RUNNER_PID=$!
    echo $***REMOVED***_RUNNER_PID > /tmp/ghost-runner.pid
    
    # Start enhanced Ghost runner
    log_info "Starting enhanced Ghost runner..."
    cd $TM_MOBILE_ROOT
    ./scripts/enhanced-ghost-runner.sh &
    ENHANCED_***REMOVED***_PID=$!
    echo $ENHANCED_***REMOVED***_PID > /tmp/enhanced-ghost.pid
    
    log_info "✅ Ghost runners started (Main PID: $***REMOVED***_RUNNER_PID, Enhanced PID: $ENHANCED_***REMOVED***_PID)"
}

# Function to start Ghost daemons and watchdogs
start_ghost_daemons() {
    log_info "Starting Ghost daemons and watchdogs..."
    
    # Start Ghost bridge
    log_info "Starting Ghost bridge..."
    cd $TM_MOBILE_ROOT
    node scripts/ghost-bridge.js &
    ***REMOVED***_BRIDGE_PID=$!
    echo $***REMOVED***_BRIDGE_PID > /tmp/ghost-bridge.pid
    
    # Start watchdog for Ghost runner
    log_info "Starting Ghost runner watchdog..."
    ./scripts/watchdog-runner.sh &
    ***REMOVED***_WATCHDOG_PID=$!
    echo $***REMOVED***_WATCHDOG_PID > /tmp/ghost-watchdog.pid
    
    # Start tunnel watchdog
    log_info "Starting tunnel watchdog..."
    ./scripts/watchdog-tunnel.sh &
    TUNNEL_WATCHDOG_PID=$!
    echo $TUNNEL_WATCHDOG_PID > /tmp/tunnel-watchdog.pid
    
    log_info "✅ Ghost daemons started (Bridge PID: $***REMOVED***_BRIDGE_PID, Watchdog PID: $***REMOVED***_WATCHDOG_PID, Tunnel Watchdog PID: $TUNNEL_WATCHDOG_PID)"
}

# Function to update configuration files
update_configs() {
    log_info "Updating configuration files..."
    
    # Update fly.toml to use new tunnel
    if [ -f "$PROJECT_ROOT/fly.toml" ]; then
        log_info "Updating fly.toml..."
        sed -i '' "s|PUBLIC_RUNNER_URL = 'https://runner.thoughtmarks.app'|g" "$PROJECT_ROOT/fly.toml"
        log_info "✅ Updated fly.toml"
    fi
    
    # Update server configuration
    if [ -f "$PROJECT_ROOT/server/utils/runnerController.js" ]; then
        log_info "Updating runner controller..."
        sed -i '' "s|localhost:5555|localhost:$***REMOVED***_PORT|g" "$PROJECT_ROOT/server/utils/runnerController.js"
        log_info "✅ Updated runner controller"
    fi
    
    # Update Slack handlers
    if [ -f "$PROJECT_ROOT/server/handlers/handleStatusRunner.js" ]; then
        log_info "Updating status runner handler..."
        sed -i '' "s|localhost:5555|localhost:$***REMOVED***_PORT|g" "$PROJECT_ROOT/server/handlers/handleStatusRunner.js"
        log_info "✅ Updated status runner handler"
    fi
    
    # Update tunnel watchdog
    if [ -f "$PROJECT_ROOT/runner/tunnel-watchdog.sh" ]; then
        log_info "Updating tunnel watchdog..."
        sed -i '' "s|RUNNER_PORT=5555|RUNNER_PORT=$***REMOVED***_PORT|g" "$PROJECT_ROOT/runner/tunnel-watchdog.sh"
        sed -i '' "s|CHECK_URL=\"http://localhost:\$RUNNER_PORT/health\"|CHECK_URL=\"http://localhost:$***REMOVED***_PORT/health\"|g" "$PROJECT_ROOT/runner/tunnel-watchdog.sh"
        log_info "✅ Updated tunnel watchdog"
    fi
}

# Function to test connectivity
test_connectivity() {
    log_info "Testing connectivity..."
    
    # Test runner tunnel
    log_info "Testing runner tunnel ($RUNNER_HOSTNAME)..."
    if curl -s --connect-timeout 10 "https://$RUNNER_HOSTNAME" > /dev/null; then
        log_info "✅ Runner tunnel is accessible"
    else
        log_warn "⚠️ Runner tunnel is not accessible"
    fi
    
    # Test ghost tunnel
    log_info "Testing ghost tunnel ($***REMOVED***_HOSTNAME)..."
    if curl -s --connect-timeout 10 "https://$***REMOVED***_HOSTNAME" > /dev/null; then
        log_info "✅ Ghost tunnel is accessible"
    else
        log_warn "⚠️ Ghost tunnel is not accessible (DNS may not be configured yet)"
    fi
    
    # Test local services
    log_info "Testing local services..."
    if curl -s --connect-timeout 5 "http://localhost:$RUNNER_PORT/health" > /dev/null; then
        log_info "✅ Runner service is running on port $RUNNER_PORT"
    else
        log_warn "⚠️ Runner service is not running on port $RUNNER_PORT"
    fi
    
    if curl -s --connect-timeout 5 "http://localhost:$***REMOVED***_PORT/health" > /dev/null; then
        log_info "✅ Ghost service is running on port $***REMOVED***_PORT"
    else
        log_warn "⚠️ Ghost service is not running on port $***REMOVED***_PORT"
    fi
}

# Function to show status
show_status() {
    log_info "Current status:"
    
    echo ""
    echo "🔗 Tunnels:"
    if [ -f "/tmp/cloudflared-runner.pid" ]; then
        echo "  ✅ Runner tunnel (PID: $(cat /tmp/cloudflared-runner.pid))"
    else
        echo "  ❌ Runner tunnel (not running)"
    fi
    
    if [ -f "/tmp/cloudflared-ghost.pid" ]; then
        echo "  ✅ Ghost tunnel (PID: $(cat /tmp/cloudflared-ghost.pid))"
    else
        echo "  ❌ Ghost tunnel (not running)"
    fi
    
    echo ""
    echo "👻 Ghost Runners:"
    if [ -f "/tmp/ghost-runner.pid" ]; then
        echo "  ✅ Main Ghost runner (PID: $(cat /tmp/ghost-runner.pid))"
    else
        echo "  ❌ Main Ghost runner (not running)"
    fi
    
    if [ -f "/tmp/enhanced-ghost.pid" ]; then
        echo "  ✅ Enhanced Ghost runner (PID: $(cat /tmp/enhanced-ghost.pid))"
    else
        echo "  ❌ Enhanced Ghost runner (not running)"
    fi
    
    echo ""
    echo "🛡️ Daemons:"
    if [ -f "/tmp/ghost-bridge.pid" ]; then
        echo "  ✅ Ghost bridge (PID: $(cat /tmp/ghost-bridge.pid))"
    else
        echo "  ❌ Ghost bridge (not running)"
    fi
    
    if [ -f "/tmp/ghost-watchdog.pid" ]; then
        echo "  ✅ Ghost watchdog (PID: $(cat /tmp/ghost-watchdog.pid))"
    else
        echo "  ❌ Ghost watchdog (not running)"
    fi
    
    if [ -f "/tmp/tunnel-watchdog.pid" ]; then
        echo "  ✅ Tunnel watchdog (PID: $(cat /tmp/tunnel-watchdog.pid))"
    else
        echo "  ❌ Tunnel watchdog (not running)"
    fi
    
    echo ""
    echo "🌐 URLs:"
    echo "  Runner: https://$RUNNER_HOSTNAME"
    echo "  Ghost: https://$***REMOVED***_HOSTNAME"
    echo "  Local Runner: http://localhost:$RUNNER_PORT"
    echo "  Local Ghost: http://localhost:$***REMOVED***_PORT"
}

# Function to stop all processes
stop_all() {
    log_info "Stopping all Ghost and tunnel processes..."
    
    # Stop cloudflared tunnels
    pkill -f cloudflared 2>/dev/null || true
    
    # Stop Ghost runners
    if [ -f "/tmp/ghost-runner.pid" ]; then
        kill $(cat /tmp/ghost-runner.pid) 2>/dev/null || true
        rm /tmp/ghost-runner.pid
    fi
    
    if [ -f "/tmp/enhanced-ghost.pid" ]; then
        kill $(cat /tmp/enhanced-ghost.pid) 2>/dev/null || true
        rm /tmp/enhanced-ghost.pid
    fi
    
    # Stop daemons
    if [ -f "/tmp/ghost-bridge.pid" ]; then
        kill $(cat /tmp/ghost-bridge.pid) 2>/dev/null || true
        rm /tmp/ghost-bridge.pid
    fi
    
    if [ -f "/tmp/ghost-watchdog.pid" ]; then
        kill $(cat /tmp/ghost-watchdog.pid) 2>/dev/null || true
        rm /tmp/ghost-watchdog.pid
    fi
    
    if [ -f "/tmp/tunnel-watchdog.pid" ]; then
        kill $(cat /tmp/tunnel-watchdog.pid) 2>/dev/null || true
        rm /tmp/tunnel-watchdog.pid
    fi
    
    # Clean up PID files
    rm -f /tmp/cloudflared-*.pid
    
    log_info "✅ All processes stopped"
}

# Function to show usage
show_usage() {
    echo -e "${BLUE}ATTACH ***REMOVED*** TO WARP TUNNEL${NC}"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start           Start all Ghost processes and tunnels"
    echo "  stop            Stop all Ghost processes and tunnels"
    echo "  restart         Restart all Ghost processes and tunnels"
    echo "  status          Show current status"
    echo "  test            Test connectivity"
    echo "  config          Update configuration files"
    echo "  help            Show this help"
    echo ""
    echo "Configuration:"
    echo "  Runner Tunnel: $RUNNER_HOSTNAME ($RUNNER_TUNNEL_ID)"
    echo "  Ghost Tunnel: $***REMOVED***_HOSTNAME ($***REMOVED***_TUNNEL_ID)"
    echo "  Runner Port: $RUNNER_PORT"
    echo "  Ghost Port: $***REMOVED***_PORT"
}

# Main script
main() {
    case "${1:-help}" in
        "start")
            log_info "Starting Ghost WARP tunnel system..."
            start_cloudflared_tunnels
            sleep 2
            start_ghost_runners
            sleep 2
            start_ghost_daemons
            sleep 2
            test_connectivity
            show_status
            ;;
        "stop")
            stop_all
            ;;
        "restart")
            log_info "Restarting Ghost WARP tunnel system..."
            stop_all
            sleep 2
            start_cloudflared_tunnels
            sleep 2
            start_ghost_runners
            sleep 2
            start_ghost_daemons
            sleep 2
            test_connectivity
            show_status
            ;;
        "status")
            show_status
            ;;
        "test")
            test_connectivity
            ;;
        "config")
            update_configs
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Run main function
main "$@" 
