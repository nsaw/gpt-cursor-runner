#!/bin/bash

# Create Watchdog Plist Files v1.0
# Creates .plist files directly for all three watchdogs
# Part of the hardened fallback pipeline for GHOST↔DEV reliability

set -e

# Configuration
LOG_DIR="./logs/watchdogs"
LOG_FILE="$LOG_DIR/plist-creation.log"

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

# Create Fly watchdog plist
create_fly_plist() {
    log "INFO" "🔧 Creating Fly watchdog plist"
    
    local plist_content="<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">
<plist version=\"1.0\">
<dict>
    <key>Label</key>
    <string>com.thoughtmarks.watchdog.fly</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$(pwd)/scripts/watchdog-fly.sh</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>$(pwd)</string>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>$(pwd)/logs/watchdogs/fly-watchdog-stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>$(pwd)/logs/watchdogs/fly-watchdog-stderr.log</string>
    
    <key>ProcessType</key>
    <string>Background</string>
    
    <key>ThrottleInterval</key>
    <integer>10</integer>
    
    <key>StartInterval</key>
    <integer>30</integer>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>WATCHDOG_MODE</key>
        <string>launchd</string>
        <key>WATCHDOG_INSTALLATION_UUID</key>
        <string>${OPERATION_UUID}</string>
    </dict>
</dict>
</plist>"
    
    local plist_path="$HOME/Library/LaunchAgents/com.thoughtmarks.watchdog.fly.plist"
    echo "$plist_content" > "$plist_path"
    chmod 644 "$plist_path"
    
    log "INFO" "✅ Fly watchdog plist created: $plist_path"
    return 0
}

# Create Tunnel watchdog plist
create_tunnel_plist() {
    log "INFO" "🔧 Creating Tunnel watchdog plist"
    
    local plist_content="<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">
<plist version=\"1.0\">
<dict>
    <key>Label</key>
    <string>com.thoughtmarks.watchdog.tunnel</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$(pwd)/scripts/watchdog-tunnel.sh</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>$(pwd)</string>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>$(pwd)/logs/watchdogs/tunnel-watchdog-stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>$(pwd)/logs/watchdogs/tunnel-watchdog-stderr.log</string>
    
    <key>ProcessType</key>
    <string>Background</string>
    
    <key>ThrottleInterval</key>
    <integer>10</integer>
    
    <key>StartInterval</key>
    <integer>30</integer>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>WATCHDOG_MODE</key>
        <string>launchd</string>
        <key>WATCHDOG_INSTALLATION_UUID</key>
        <string>${OPERATION_UUID}</string>
    </dict>
</dict>
</plist>"
    
    local plist_path="$HOME/Library/LaunchAgents/com.thoughtmarks.watchdog.tunnel.plist"
    echo "$plist_content" > "$plist_path"
    chmod 644 "$plist_path"
    
    log "INFO" "✅ Tunnel watchdog plist created: $plist_path"
    return 0
}

# Create Runner watchdog plist
create_runner_plist() {
    log "INFO" "🔧 Creating Runner watchdog plist"
    
    local plist_content="<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">
<plist version=\"1.0\">
<dict>
    <key>Label</key>
    <string>com.thoughtmarks.watchdog.runner</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$(pwd)/scripts/watchdog-runner.sh</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>$(pwd)</string>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>$(pwd)/logs/watchdogs/runner-watchdog-stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>$(pwd)/logs/watchdogs/runner-watchdog-stderr.log</string>
    
    <key>ProcessType</key>
    <string>Background</string>
    
    <key>ThrottleInterval</key>
    <integer>10</integer>
    
    <key>StartInterval</key>
    <integer>30</integer>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>WATCHDOG_MODE</key>
        <string>launchd</string>
        <key>WATCHDOG_INSTALLATION_UUID</key>
        <string>${OPERATION_UUID}</string>
    </dict>
</dict>
</plist>"
    
    local plist_path="$HOME/Library/LaunchAgents/com.thoughtmarks.watchdog.runner.plist"
    echo "$plist_content" > "$plist_path"
    chmod 644 "$plist_path"
    
    log "INFO" "✅ Runner watchdog plist created: $plist_path"
    return 0
}

# Load plist into launchd
load_plist() {
    local label="$1"
    local plist_path="$HOME/Library/LaunchAgents/$label.plist"
    
    log "INFO" "📥 Loading plist: $label"
    
    if [ -f "$plist_path" ]; then
        # Unload if already loaded
        launchctl unload "$plist_path" 2>/dev/null || true
        
        # Load the service
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

# Main creation sequence
create_all_plists() {
    log "INFO" "🚀 Starting plist creation for all watchdogs"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Create all plists
    local success_count=0
    
    if create_fly_plist; then
        success_count=$((success_count + 1))
    fi
    
    if create_tunnel_plist; then
        success_count=$((success_count + 1))
    fi
    
    if create_runner_plist; then
        success_count=$((success_count + 1))
    fi
    
    log "INFO" "📊 Plist creation results: $success_count/3 successful"
    
    if [ $success_count -eq 3 ]; then
        log "INFO" "✅ All plists created successfully"
        return 0
    else
        log "ERROR" "❌ Some plists failed to create"
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
    log "INFO" "🚀 Starting watchdog plist creation (operation: $OPERATION_UUID)"
    
    # Check command line arguments
    case "${1:-all}" in
        create)
            create_all_plists
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
            create_all_plists
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
            echo "Usage: $0 {create|load|status|cron|all}"
            echo "  create - Create all plist files"
            echo "  load   - Load all plists into launchd"
            echo "  status - Check plist statuses"
            echo "  cron   - Generate and install cron entries"
            echo "  all    - Run complete setup (default)"
            exit 1
            ;;
    esac
    
    # Log final status
    TOTAL_TIME=$(( $(date +%s) - START_TIME ))
    log "INFO" "📊 Plist creation metrics: ${TOTAL_TIME}s total time"
    
    log "INFO" "✅ Watchdog plist creation completed"
}

# Run main function
main "$@" 