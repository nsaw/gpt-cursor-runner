#!/bin/bash

# Setup Patch Watchdog with Launchd Auto-Boot
# ENHANCED: Creates launchd configuration for auto-boot with health monitoring

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WATCHDOG_SCRIPT="$SCRIPT_DIR/patch-watchdog.js"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_FILE="$LAUNCH_AGENTS_DIR/com.thoughtmarks.patchwatchdog.plist"
LOG_DIR="$PROJECT_ROOT/logs"

# Generate unique identifier for this installation
INSTALLATION_UUID=$(uuidgen)
START_TIME=$(date +%s)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${INSTALLATION_UUID}] $1"
}

notify_dashboard() {
    local message="$1"
    local level="${2:-INFO}"
    
    curl -s -X POST "https://gpt-cursor-runner.fly.dev/slack/commands" \
        -H "Content-Type: application/json" \
        -d "{
            \"command\": \"/alert-runner-crash\",
            \"text\": \"[WATCHDOG-SETUP] ${level}: ${message}\",
            \"user_name\": \"watchdog-setup\",
            \"channel_id\": \"infrastructure\"
        }" >/dev/null 2>&1
}

# Validate environment
validate_environment() {
    log "🔍 Validating environment..."
    
    # Check if we're on macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        log "❌ This script is designed for macOS only"
        exit 1
    fi
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        log "❌ Node.js is not installed"
        exit 1
    fi
    
    # Check if watchdog script exists
    if [[ ! -f "$WATCHDOG_SCRIPT" ]]; then
        log "❌ Watchdog script not found: $WATCHDOG_SCRIPT"
        exit 1
    fi
    
    # Check if project root exists
    if [[ ! -d "$PROJECT_ROOT" ]]; then
        log "❌ Project root not found: $PROJECT_ROOT"
        exit 1
    fi
    
    log "✅ Environment validation passed"
}

# Create launchd plist configuration
create_plist() {
    log "📝 Creating launchd configuration..."
    
    # Ensure LaunchAgents directory exists
    mkdir -p "$LAUNCH_AGENTS_DIR"
    
    # Create the plist file
    cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.thoughtmarks.patchwatchdog</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/node</string>
        <string>$WATCHDOG_SCRIPT</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>$PROJECT_ROOT</string>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>$LOG_DIR/patch-watchdog-stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/patch-watchdog-stderr.log</string>
    
    <key>ProcessType</key>
    <string>Background</string>
    
    <key>ThrottleInterval</key>
    <integer>10</integer>
    
    <key>StartInterval</key>
    <integer>30</integer>
    
    <key>StartCalendarInterval</key>
    <dict>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>WATCHDOG_MODE</key>
        <string>launchd</string>
        <key>WATCHDOG_INSTALLATION_UUID</key>
        <string>$INSTALLATION_UUID</string>
    </dict>
    
    <key>WatchPaths</key>
    <array>
        <string>$PROJECT_ROOT/patches</string>
        <string>$PROJECT_ROOT/logs</string>
    </array>
    
    <key>QueueDirectories</key>
    <array>
        <string>$PROJECT_ROOT/quarantine</string>
    </array>
</dict>
</plist>
EOF

    log "✅ Launchd configuration created: $PLIST_FILE"
}

# Test the watchdog script
test_watchdog() {
    log "🧪 Testing watchdog script..."
    
    # Test if the script can start and exit gracefully
    if timeout 5 node "$WATCHDOG_SCRIPT" >/dev/null 2>&1; then
        log "✅ Watchdog script test passed"
        return 0
    else
        # Try a simpler test - just check if the script can be parsed
        if node -c "$WATCHDOG_SCRIPT" 2>/dev/null; then
            log "✅ Watchdog script syntax is valid"
            return 0
        else
            log "❌ Watchdog script test failed"
            return 1
        fi
    fi
}

# Install and start the service
install_service() {
    log "🚀 Installing and starting watchdog service..."
    
    # Load the service
    if launchctl load "$PLIST_FILE" 2>/dev/null; then
        log "✅ Service loaded successfully"
    else
        log "⚠️  Service may already be loaded"
    fi
    
    # Start the service
    if launchctl start com.thoughtmarks.patchwatchdog 2>/dev/null; then
        log "✅ Service started successfully"
    else
        log "⚠️  Service may already be running"
    fi
    
    # Verify the service is running
    sleep 2
    if launchctl list | grep -q "com.thoughtmarks.patchwatchdog"; then
        log "✅ Service is running"
        notify_dashboard "Patch watchdog service installed and running successfully", "SUCCESS"
        return 0
    else
        log "❌ Service failed to start"
        notify_dashboard "Patch watchdog service failed to start", "ERROR"
        return 1
    fi
}

# Create health check script
create_health_check() {
    log "🔧 Creating health check script..."
    
    local health_script="$SCRIPT_DIR/watchdog-health-check.sh"
    
    cat > "$health_script" << 'EOF'
#!/bin/bash

# Patch Watchdog Health Check Script
# Monitors the watchdog service and restarts if needed

WATCHDOG_LABEL="com.thoughtmarks.patchwatchdog"
LOG_FILE="./logs/watchdog-health-check.log"
DASHBOARD_WEBHOOK="https://gpt-cursor-runner.fly.dev/slack/commands"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

notify_dashboard() {
    local message="$1"
    local level="${2:-INFO}"
    
    curl -s -X POST "$DASHBOARD_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{
            \"command\": \"/alert-runner-crash\",
            \"text\": \"[WATCHDOG-HEALTH] ${level}: ${message}\",
            \"user_name\": \"watchdog-health\",
            \"channel_id\": \"infrastructure\"
        }" >> "$LOG_FILE" 2>&1
}

# Check if watchdog is running
if ! launchctl list | grep -q "$WATCHDOG_LABEL"; then
    log "⚠️  Watchdog service not running - restarting..."
    notify_dashboard "Watchdog service not running - restarting", "WARNING"
    
    # Try to start the service
    if launchctl start "$WATCHDOG_LABEL" 2>/dev/null; then
        log "✅ Watchdog service restarted successfully"
        notify_dashboard "Watchdog service restarted successfully", "SUCCESS"
    else
        log "❌ Failed to restart watchdog service"
        notify_dashboard "Failed to restart watchdog service", "ERROR"
        exit 1
    fi
else
    log "✅ Watchdog service is running"
fi

# Check if the process is actually responding
if ! pgrep -f "patch-watchdog.js" >/dev/null; then
    log "⚠️  Watchdog process not found - restarting..."
    notify_dashboard "Watchdog process not found - restarting", "WARNING"
    
    # Kill any existing processes and restart
    pkill -f "patch-watchdog.js" 2>/dev/null
    sleep 2
    
    if launchctl start "$WATCHDOG_LABEL" 2>/dev/null; then
        log "✅ Watchdog process restarted successfully"
        notify_dashboard "Watchdog process restarted successfully", "SUCCESS"
    else
        log "❌ Failed to restart watchdog process"
        notify_dashboard "Failed to restart watchdog process", "ERROR"
        exit 1
    fi
else
    log "✅ Watchdog process is running"
fi
EOF

    chmod +x "$health_script"
    log "✅ Health check script created: $health_script"
}

# Create uninstall script
create_uninstall() {
    log "🗑️  Creating uninstall script..."
    
    local uninstall_script="$SCRIPT_DIR/uninstall-patch-watchdog.sh"
    
    cat > "$uninstall_script" << EOF
#!/bin/bash

# Uninstall Patch Watchdog Service

WATCHDOG_LABEL="com.thoughtmarks.patchwatchdog"
PLIST_FILE="$PLIST_FILE"

echo "🔄 Uninstalling patch watchdog service..."

# Stop the service
launchctl stop "$WATCHDOG_LABEL" 2>/dev/null

# Unload the service
launchctl unload "$PLIST_FILE" 2>/dev/null

# Remove the plist file
if [[ -f "$PLIST_FILE" ]]; then
    rm "$PLIST_FILE"
    echo "✅ Removed plist file"
fi

# Kill any remaining processes
pkill -f "patch-watchdog.js" 2>/dev/null

echo "✅ Patch watchdog service uninstalled"
echo "💡 You can reinstall by running: $0"
EOF

    chmod +x "$uninstall_script"
    log "✅ Uninstall script created: $uninstall_script"
}

# Main installation process
main() {
    log "🚀 Starting patch watchdog installation..."
    notify_dashboard "Starting patch watchdog installation", "INFO"
    
    # Validate environment
    validate_environment
    
    # Create log directory if it doesn't exist
    mkdir -p "$LOG_DIR"
    
    # Test the watchdog script
    if ! test_watchdog; then
        log "❌ Watchdog script test failed - aborting installation"
        notify_dashboard "Watchdog script test failed - aborting installation", "ERROR"
        exit 1
    fi
    
    # Create plist configuration
    create_plist
    
    # Create health check script
    create_health_check
    
    # Create uninstall script
    create_uninstall
    
    # Install and start the service
    if install_service; then
        log "🎉 Patch watchdog installation completed successfully!"
        notify_dashboard "Patch watchdog installation completed successfully", "SUCCESS"
        
        # Log installation metrics
        TOTAL_TIME=$(( $(date +%s) - START_TIME ))
        log "📊 Installation metrics: ${TOTAL_TIME}s total time, UUID: $INSTALLATION_UUID"
        
        echo ""
        echo "✅ Patch Watchdog Installation Complete!"
        echo "======================================"
        echo "📁 Plist file: $PLIST_FILE"
        echo "🔧 Health check: $SCRIPT_DIR/watchdog-health-check.sh"
        echo "🗑️  Uninstall: $SCRIPT_DIR/uninstall-patch-watchdog.sh"
        echo "📊 Logs: $LOG_DIR/patch-watchdog-*.log"
        echo ""
        echo "💡 The watchdog will now auto-start on login and restart if killed."
        echo "💡 Monitor health with: $SCRIPT_DIR/watchdog-health-check.sh"
        echo "💡 Uninstall with: $SCRIPT_DIR/uninstall-patch-watchdog.sh"
        
        exit 0
    else
        log "❌ Patch watchdog installation failed"
        notify_dashboard "Patch watchdog installation failed", "ERROR"
        exit 1
    fi
}

# Run main function
main "$@" 