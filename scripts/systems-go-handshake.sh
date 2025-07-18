#!/bin/bash

# Systems-Go Handshake Protocol
# Validates all components before enabling autopilot mode

set -e

# Configuration
CONFIG_FILE=".cursor-systems-go.json"
LOG_FILE="logs/systems-go-handshake.log"
STATUS_FILE="logs/systems-go-status.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "info") echo -e "${BLUE}[${timestamp}] ℹ️  ${message}${NC}" ;;
        "success") echo -e "${GREEN}[${timestamp}] ✓ ${message}${NC}" ;;
        "warning") echo -e "${YELLOW}[${timestamp}] ⚠️  ${message}${NC}" ;;
        "error") echo -e "${RED}[${timestamp}] ❌ ${message}${NC}" ;;
        "check") echo -e "${CYAN}[${timestamp}] 🔍 ${message}${NC}" ;;
        "handshake") echo -e "${PURPLE}[${timestamp}] 🤝 ${message}${NC}" ;;
    esac
    
    # Also log to file
    echo "[${timestamp}] ${message}" >> "$LOG_FILE"
}

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Load configuration
load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        log "info" "Loading systems-go configuration from $CONFIG_FILE"
        CONFIG=$(cat "$CONFIG_FILE")
    else
        log "warning" "Systems-go config not found, using defaults"
        CONFIG='{"protocol":"systems-go-handshake","enforceGlobally":true}'
    fi
}

# Check if trust daemon is active
check_trust_daemon() {
    log "check" "Checking trust daemon status..."
    
    # Check if trust daemon script exists and is executable
    if [ ! -f "scripts/trust-daemon.js" ]; then
        log "error" "Trust daemon script not found"
        return 1
    fi
    
    if [ ! -x "scripts/trust-daemon.js" ]; then
        log "error" "Trust daemon script not executable"
        return 1
    fi
    
    # Check if trust daemon is running
    if pgrep -f "trust-daemon" > /dev/null; then
        log "success" "Trust daemon is running"
        return 0
    else
        log "warning" "Trust daemon not running, attempting to start..."
        node scripts/trust-daemon.js &
        sleep 2
        
        if pgrep -f "trust-daemon" > /dev/null; then
            log "success" "Trust daemon started successfully"
            return 0
        else
            log "error" "Failed to start trust daemon"
            return 1
        fi
    fi
}

# Check tunnel status
check_tunnel() {
    log "check" "Checking tunnel status..."
    
    # Check if tunnel is running
    if pgrep -f "cloudflared" > /dev/null; then
        log "success" "Cloudflare tunnel is running"
        return 0
    elif pgrep -f "ngrok" > /dev/null; then
        log "success" "Ngrok tunnel is running"
        return 0
    else
        log "error" "No tunnel found running"
        return 1
    fi
}

# Check ghost relay
check_ghost_relay() {
    log "check" "Checking ghost relay status..."
    
    # Check if ghost relay is listening
    if curl -s http://localhost:2368 > /dev/null 2>&1; then
        log "success" "Ghost relay is responding"
        return 0
    else
        log "warning" "Ghost relay not responding on default port"
        
        # Try alternative ports
        for port in 3000 8080 5000; do
            if curl -s http://localhost:$port > /dev/null 2>&1; then
                log "success" "Ghost relay found on port $port"
                return 0
            fi
        done
        
        log "error" "Ghost relay not found on any expected port"
        return 1
    fi
}

# Check execution summary hook
check_execution_summary() {
    log "check" "Checking execution summary hook..."
    
    # Check if summaries directory exists
    if [ ! -d "summaries" ]; then
        log "warning" "Summaries directory not found, creating..."
        mkdir -p summaries
    fi
    
    # Check if summary manager is available
    if [ -f "gpt_cursor_runner/summary_manager.py" ]; then
        log "success" "Summary manager found"
        return 0
    else
        log "error" "Summary manager not found"
        return 1
    fi
}

# Check GPT response validation
check_gpt_validation() {
    log "check" "Checking GPT response validation..."
    
    # Check if webhook handler is configured
    if [ -f "gpt_cursor_runner/webhook_handler.py" ]; then
        log "success" "Webhook handler found"
        return 0
    else
        log "error" "Webhook handler not found"
        return 1
    fi
}

# Start watchdog monitoring
start_watchdog() {
    log "check" "Starting watchdog monitoring..."
    
    # Check if watchdog scripts exist
    watchdog_scripts=("scripts/watchdog-runner.sh" "scripts/watchdog-fly.sh" "scripts/watchdog-tunnel.sh")
    
    for script in "${watchdog_scripts[@]}"; do
        if [ -f "$script" ] && [ -x "$script" ]; then
            log "success" "Watchdog script found: $script"
        else
            log "warning" "Watchdog script missing or not executable: $script"
        fi
    done
    
    # Start watchdog if not running
    if ! pgrep -f "watchdog" > /dev/null; then
        log "info" "Starting watchdog daemon..."
        ./scripts/watchdog-runner.sh &
        sleep 1
        
        if pgrep -f "watchdog" > /dev/null; then
            log "success" "Watchdog daemon started"
            return 0
        else
            log "error" "Failed to start watchdog daemon"
            return 1
        fi
    else
        log "success" "Watchdog daemon already running"
        return 0
    fi
}

# Perform systems-go handshake
perform_handshake() {
    log "handshake" "Starting systems-go handshake protocol..."
    
    local checks=(
        "check_trust_daemon"
        "check_tunnel"
        "check_ghost_relay"
        "check_execution_summary"
        "check_gpt_validation"
        "start_watchdog"
    )
    
    local failed_checks=()
    
    for check in "${checks[@]}"; do
        log "check" "Running check: $check"
        if $check; then
            log "success" "Check passed: $check"
        else
            log "error" "Check failed: $check"
            failed_checks+=("$check")
        fi
    done
    
    if [ ${#failed_checks[@]} -eq 0 ]; then
        log "success" "All systems-go checks passed!"
        return 0
    else
        log "error" "Systems-go handshake failed: ${failed_checks[*]}"
        return 1
    fi
}

# Update status file
update_status() {
    local success=$1
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
    
    cat > "$STATUS_FILE" << EOF
{
  "systems_go": $success,
  "timestamp": "$timestamp",
  "protocol": "systems-go-handshake",
  "checks_performed": [
    "trust_daemon",
    "tunnel",
    "ghost_relay", 
    "execution_summary",
    "gpt_validation",
    "watchdog"
  ],
  "status_tag": "$(if [ $success -eq 0 ]; then echo "🟢 SYSTEMS GO | Full autopilot enabled"; else echo "🔴 SYSTEMS DOWN | Manual intervention required"; fi)"
}
EOF
    
    log "info" "Status updated: $STATUS_FILE"
}

# Main execution
main() {
    log "info" "🚀 Starting Systems-Go Handshake Protocol"
    log "info" "Configuration: $CONFIG_FILE"
    log "info" "Log file: $LOG_FILE"
    
    # Load configuration
    load_config
    
    # Perform handshake
    if perform_handshake; then
        log "success" "🎉 Systems-Go Handshake Successful!"
        log "handshake" "All systems are GO for autopilot mode"
        update_status 0
        
        echo ""
        echo "🟢 SYSTEMS GO | Full autopilot enabled"
        echo "🤝 Handshake completed successfully"
        echo "📊 Status: $STATUS_FILE"
        echo "📝 Log: $LOG_FILE"
        
        exit 0
    else
        log "error" "❌ Systems-Go Handshake Failed!"
        log "handshake" "Manual intervention required"
        update_status 1
        
        echo ""
        echo "🔴 SYSTEMS DOWN | Manual intervention required"
        echo "❌ Handshake failed - check logs for details"
        echo "📊 Status: $STATUS_FILE"
        echo "📝 Log: $LOG_FILE"
        
        exit 1
    fi
}

# Run main function
main "$@" 