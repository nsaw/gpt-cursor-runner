#!/bin/bash

# Generate Watchdog Plist Files v1.0
# Generates .plist files for all three watchdogs using the existing generator
# Part of the hardened fallback pipeline for GHOST↔DEV reliability

set -e

# Configuration
LOG_DIR="./logs/watchdogs"
LOG_FILE="$LOG_DIR/plist-generation.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Generate operation UUID for tracking
OPERATION_UUID=$(uuidgen)
START_TIME=$(date +%s)

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    echo "[$timestamp] [${OPERATION_UUID}] [$level] $message" | tee -a "$LOG_FILE"
}

# Generate plist for Fly watchdog
generate_fly_plist() {
    log "INFO" "🔧 Generating Fly watchdog plist"
    
    node _global/dev-tools/gen-launchd-watchdog.js \
        --label "com.thoughtmarks.watchdog.fly" \
        --script "./scripts/watchdog-fly.sh" \
        --log-dir "./logs/watchdogs" \
        --start-interval 30 \
        --throttle-interval 10 \
        --write
    
    if [ $? -eq 0 ]; then
        log "INFO" "✅ Fly watchdog plist generated successfully"
    else
        log "ERROR" "❌ Failed to generate Fly watchdog plist"
        return 1
    fi
}

# Generate plist for Tunnel watchdog
generate_tunnel_plist() {
    log "INFO" "🔧 Generating Tunnel watchdog plist"
    
    node _global/dev-tools/gen-launchd-watchdog.js \
        --label "com.thoughtmarks.watchdog.tunnel" \
        --script "./scripts/watchdog-tunnel.sh" \
        --log-dir "./logs/watchdogs" \
        --start-interval 30 \
        --throttle-interval 10 \
        --write
    
    if [ $? -eq 0 ]; then
        log "INFO" "✅ Tunnel watchdog plist generated successfully"
    else
        log "ERROR" "❌ Failed to generate Tunnel watchdog plist"
        return 1
    fi
}

# Generate plist for Runner watchdog
generate_runner_plist() {
    log "INFO" "🔧 Generating Runner watchdog plist"
    
    node _global/dev-tools/gen-launchd-watchdog.js \
        --label "com.thoughtmarks.watchdog.runner" \
        --script "./scripts/watchdog-runner.sh" \
        --log-dir "./logs/watchdogs" \
        --start-interval 30 \
        --throttle-interval 10 \
        --write
    
    if [ $? -eq 0 ]; then
        log "INFO" "✅ Runner watchdog plist generated successfully"
    else
        log "ERROR" "❌ Failed to generate Runner watchdog plist"
        return 1
    fi
}

# Load plist into launchd
load_plist() {
    local label="$1"
    local plist_path="$HOME/Library/LaunchAgents/$label.plist"
    
    log "INFO" "📥 Loading plist: $label"
    
    if [ -f "$plist_path" ]; then
        launchctl load "$plist_path" 2>&1 | tee -a "$LOG_FILE"
        local exit_code=$?
        
        if [ $exit_code -eq 0 ]; then
            log "INFO" "✅ Plist loaded successfully: $label"
            return 0
        else
            log "ERROR" "❌ Failed to load plist: $label"
            return 1
        fi
    else
        log "ERROR" "❌ Plist file not found: $plist_path"
        return 1
    fi
}

# Check plist status
check_plist_status() {
    local label="$1"
    
    log "INFO" "🔍 Checking plist status: $label"
    
    launchctl list | grep "$label" >/dev/null 2>&1
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log "INFO" "✅ Plist is loaded and running: $label"
        return 0
    else
        log "WARN" "⚠️ Plist is not loaded: $label"
        return 1
    fi
}

# Generate cron entries
generate_cron_entries() {
    log "INFO" "⏰ Generating cron entries for extra safety"
    
    # Create cron entries for all three watchdogs
    local cron_entries="# Watchdog cron entries for extra safety
# Generated on $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
# Operation UUID: $OPERATION_UUID

# Fly watchdog - every 5 minutes
*/5 * * * * cd $(pwd) && ./scripts/watchdog-fly.sh health >> ./logs/watchdogs/fly-cron.log 2>&1

# Tunnel watchdog - every 5 minutes
*/5 * * * * cd $(pwd) && ./scripts/watchdog-tunnel.sh health >> ./logs/watchdogs/tunnel-cron.log 2>&1

# Runner watchdog - every 5 minutes
*/5 * * * * cd $(pwd) && ./scripts/watchdog-runner.sh health >> ./logs/watchdogs/runner-cron.log 2>&1

# Patch retry - every 10 minutes
*/10 * * * * cd $(pwd) && ./scripts/retry-patch-delivery.sh run >> ./logs/watchdogs/retry-cron.log 2>&1
"
    
    echo "$cron_entries" > "./watchdog-cron-entries.txt"
    log "INFO" "✅ Cron entries generated: ./watchdog-cron-entries.txt"
}

# Install cron entries
install_cron_entries() {
    log "INFO" "📥 Installing cron entries"
    
    if [ -f "./watchdog-cron-entries.txt" ]; then
        # Remove existing watchdog cron entries
        crontab -l 2>/dev/null | grep -v "watchdog\|retry-patch-delivery" | crontab -
        
        # Add new cron entries
        (crontab -l 2>/dev/null; cat ./watchdog-cron-entries.txt) | crontab -
        
        log "INFO" "✅ Cron entries installed successfully"
    else
        log "ERROR" "❌ Cron entries file not found"
        return 1
    fi
}

# Main generation sequence
generate_all_plists() {
    log "INFO" "🚀 Starting plist generation for all watchdogs"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Generate all plists
    local success_count=0
    
    if generate_fly_plist; then
        success_count=$((success_count + 1))
    fi
    
    if generate_tunnel_plist; then
        success_count=$((success_count + 1))
    fi
    
    if generate_runner_plist; then
        success_count=$((success_count + 1))
    fi
    
    log "INFO" "📊 Plist generation results: $success_count/3 successful"
    
    if [ $success_count -eq 3 ]; then
        log "INFO" "✅ All plists generated successfully"
        return 0
    else
        log "ERROR" "❌ Some plists failed to generate"
        return 1
    fi
}

# Load all plists
load_all_plists() {
    log "INFO" "🚀 Loading all plists into launchd"
    
    local success_count=0
    
    if load_plist "com.thoughtmarks.watchdog.fly"; then
        success_count=$((success_count + 1))
    fi
    
    if load_plist "com.thoughtmarks.watchdog.tunnel"; then
        success_count=$((success_count + 1))
    fi
    
    if load_plist "com.thoughtmarks.watchdog.runner"; then
        success_count=$((success_count + 1))
    fi
    
    log "INFO" "📊 Plist loading results: $success_count/3 successful"
    
    if [ $success_count -eq 3 ]; then
        log "INFO" "✅ All plists loaded successfully"
        return 0
    else
        log "ERROR" "❌ Some plists failed to load"
        return 1
    fi
}

# Check all plist statuses
check_all_plist_statuses() {
    log "INFO" "🔍 Checking all plist statuses"
    
    local loaded_count=0
    
    if check_plist_status "com.thoughtmarks.watchdog.fly"; then
        loaded_count=$((loaded_count + 1))
    fi
    
    if check_plist_status "com.thoughtmarks.watchdog.tunnel"; then
        loaded_count=$((loaded_count + 1))
    fi
    
    if check_plist_status "com.thoughtmarks.watchdog.runner"; then
        loaded_count=$((loaded_count + 1))
    fi
    
    log "INFO" "📊 Plist status results: $loaded_count/3 loaded"
    
    if [ $loaded_count -eq 3 ]; then
        log "INFO" "✅ All plists are loaded and running"
        return 0
    else
        log "WARN" "⚠️ Some plists are not loaded"
        return 1
    fi
}

# Main execution
main() {
    log "INFO" "🚀 Starting watchdog plist generation (operation: $OPERATION_UUID)"
    
    # Check command line arguments
    case "${1:-all}" in
        generate)
            generate_all_plists
            ;;
        load)
            load_all_plists
            ;;
        status)
            check_all_plist_statuses
            ;;
        cron)
            generate_cron_entries
            install_cron_entries
            ;;
        all)
            generate_all_plists
            if [ $? -eq 0 ]; then
                load_all_plists
                if [ $? -eq 0 ]; then
                    check_all_plist_statuses
                    generate_cron_entries
                    install_cron_entries
                fi
            fi
            ;;
        *)
            echo "Usage: $0 {generate|load|status|cron|all}"
            echo "  generate - Generate all plist files"
            echo "  load     - Load all plists into launchd"
            echo "  status   - Check plist statuses"
            echo "  cron     - Generate and install cron entries"
            echo "  all      - Run complete setup (default)"
            exit 1
            ;;
    esac
    
    # Log final status
    TOTAL_TIME=$(( $(date +%s) - START_TIME ))
    log "INFO" "📊 Plist generation metrics: ${TOTAL_TIME}s total time"
    
    log "INFO" "✅ Watchdog plist generation completed"
}

# Run main function
main "$@" 