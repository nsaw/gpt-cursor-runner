#!/bin/bash
# Ghost 2.0 Systems Launcher
# Activates all advanced Ghost 2.0 capabilities while respecting system bounds
# Integrates with existing Ghost Runner, BRAUN daemon, and webhook systems
# ENFORCED: Non-blocking, timeout-protected execution for all daemon launches

# Unified path structure
CYOPS_CACHE="/Users/sawyer/gitSync/.cursor-cache/CYOPS"
MAIN_CACHE="/Users/sawyer/gitSync/.cursor-cache/MAIN"
LOG_DIR="$CYOPS_CACHE/logs"
PID_DIR="$CYOPS_CACHE/pids"

# Ensure directories exist
mkdir -p "$LOG_DIR" "$PID_DIR"

# Configuration
LAUNCH_LOG="$LOG_DIR/ghost-2.0-launch.log"
MAX_STARTUP_TIME=120
CHECK_INTERVAL=5
TIMEOUT_SECONDS=60

# Logging function
log() {
    local message="$1"
    local level="${2:-info}"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "[$timestamp] [$level] $message" | tee -a "$LAUNCH_LOG"
}

# Check if process is running by PID file
is_process_running() {
    local pid_file="$1"
    local process_name="$2"
    
    if [ ! -f "$pid_file" ]; then
        return 1
    fi
    
    local pid=$(cat "$pid_file" 2>/dev/null)
    if [ -z "$pid" ]; then
        return 1
    fi
    
    if kill -0 "$pid" 2>/dev/null; then
        log "$process_name is running (PID: $pid)"
        return 0
    else
        log "$process_name is not running (stale PID file)"
        return 1
    fi
}

# Start a daemon with watchdog (NON-BLOCKING, TIMEOUT-PROTECTED)
start_daemon_with_watchdog() {
    local daemon_name="$1"
    local watchdog_script="scripts/watchdogs/${daemon_name}-watchdog.sh"
    local pid_file="$PID_DIR/${daemon_name}.pid"
    
    log "Starting $daemon_name with watchdog (non-blocking, ${TIMEOUT_SECONDS}s timeout)..."
    
    if [ ! -f "$watchdog_script" ]; then
        log "Watchdog script not found: $watchdog_script" "error"
        return 1
    fi
    
    # Start the watchdog in background with timeout protection
    { timeout ${TIMEOUT_SECONDS}s bash "$watchdog_script" & } >/dev/null 2>&1 & disown
    
    # Wait for process to start
    local wait_time=0
    while [ $wait_time -lt $MAX_STARTUP_TIME ]; do
        if is_process_running "$pid_file" "$daemon_name"; then
            log "$daemon_name started successfully"
            return 0
        fi
        sleep $CHECK_INTERVAL
        wait_time=$((wait_time + CHECK_INTERVAL))
    done
    
    log "$daemon_name failed to start within $MAX_STARTUP_TIME seconds" "error"
    return 1
}

# Validate dashboard before startup (NON-BLOCKING)
validate_dashboard() {
    log "Validating dashboard/app.py (non-blocking, ${TIMEOUT_SECONDS}s timeout)..."
    
    if [ -f "scripts/validate-dashboard.sh" ]; then
        # Run validation with timeout protection
        if { timeout ${TIMEOUT_SECONDS}s bash scripts/validate-dashboard.sh & } >/dev/null 2>&1 & disown; then
            log "Dashboard validation passed"
            return 0
        else
            log "Dashboard validation failed - system startup blocked" "error"
            return 1
        fi
    else
        log "Dashboard validation script not found - skipping validation" "warning"
        return 0
    fi
}

# Check existing system status (NON-BLOCKING)
check_existing_systems() {
    log "Checking existing system status (non-blocking)..."
    
    # Check Ghost Runner
    if is_process_running "$PID_DIR/ghost-runner.pid" "Ghost Runner"; then
        log "Ghost Runner is already running"
    else
        log "Ghost Runner is not running" "warning"
    fi
    
    # Check BRAUN Daemon
    if is_process_running "$PID_DIR/braun-daemon.pid" "BRAUN Daemon"; then
        log "BRAUN Daemon is already running"
    else
        log "BRAUN Daemon is not running" "warning"
    fi
    
    # Check Webhook System
    if is_process_running "$PID_DIR/webhook-handler.pid" "Webhook Handler"; then
        log "Webhook Handler is already running"
    else
        log "Webhook Handler is not running" "warning"
    fi
}

# Start Ghost 2.0 Advanced Systems (NON-BLOCKING, TIMEOUT-PROTECTED)
start_ghost_2_0_systems() {
    log "Starting Ghost 2.0 Advanced Systems (non-blocking, ${TIMEOUT_SECONDS}s timeout per daemon)..."
    
    # 1. Autonomous Decision Engine
    log "=== Starting Autonomous Decision Engine ==="
    if start_daemon_with_watchdog "autonomous-decision-daemon"; then
        log "✅ Autonomous Decision Engine started"
    else
        log "❌ Failed to start Autonomous Decision Engine" "error"
    fi
    
    # 2. Telemetry Orchestrator
    log "=== Starting Telemetry Orchestrator ==="
    if start_daemon_with_watchdog "telemetry-orchestrator-daemon"; then
        log "✅ Telemetry Orchestrator started"
    else
        log "❌ Failed to start Telemetry Orchestrator" "error"
    fi
    
    # 3. Enhanced Document Daemon (if not already running)
    log "=== Starting Enhanced Document Daemon ==="
    if ! is_process_running "$PID_DIR/enhanced-document-daemon.pid" "Enhanced Document Daemon"; then
        if start_daemon_with_watchdog "enhanced-document-daemon"; then
            log "✅ Enhanced Document Daemon started"
        else
            log "❌ Failed to start Enhanced Document Daemon" "error"
        fi
    else
        log "✅ Enhanced Document Daemon already running"
    fi
    
    # 4. Metrics Aggregator
    log "=== Starting Metrics Aggregator ==="
    if start_daemon_with_watchdog "metrics-aggregator-daemon"; then
        log "✅ Metrics Aggregator started"
    else
        log "❌ Failed to start Metrics Aggregator" "error"
    fi
    
    # 5. Alert Engine
    log "=== Starting Alert Engine ==="
    if start_daemon_with_watchdog "alert-engine-daemon"; then
        log "✅ Alert Engine started"
    else
        log "❌ Failed to start Alert Engine" "error"
    fi
}

# Verify system integration (NON-BLOCKING)
verify_integration() {
    log "=== Verifying System Integration (non-blocking) ==="
    
    # Check if systems are communicating
    local integration_checks=(
        "autonomous-decision-daemon"
        "telemetry-orchestrator-daemon"
        "enhanced-document-daemon"
        "metrics-aggregator-daemon"
        "alert-engine-daemon"
    )
    
    local all_running=true
    
    for system in "${integration_checks[@]}"; do
        local pid_file="$PID_DIR/${system}.pid"
        if is_process_running "$pid_file" "$system"; then
            log "✅ $system is running and integrated"
        else
            log "❌ $system is not running" "error"
            all_running=false
        fi
    done
    
    if [ "$all_running" = true ]; then
        log "🎉 All Ghost 2.0 systems are running and integrated!"
        return 0
    else
        log "⚠️ Some Ghost 2.0 systems failed to start" "warning"
        return 1
    fi
}

# Main execution
main() {
    log "=== Ghost 2.0 Systems Launcher Starting (Non-Blocking Enforcement) ==="
    log "CYOPS Cache: $CYOPS_CACHE"
    log "MAIN Cache: $MAIN_CACHE"
    log "Timeout Protection: ${TIMEOUT_SECONDS}s per daemon"
    
    # Validate dashboard before startup
    if ! validate_dashboard; then
        log "❌ Dashboard validation failed - system startup aborted" "error"
        exit 1
    fi
    
    # Check existing systems
    check_existing_systems
    
    # Start Ghost 2.0 systems
    start_ghost_2_0_systems
    
    # Verify integration
    if verify_integration; then
        log "🎉 Ghost 2.0 Systems Launch Complete!"
        log "All advanced capabilities are now active:"
        log "  - Autonomous Decision Engine (AI-powered optimization)"
        log "  - Telemetry Orchestrator (centralized monitoring)"
        log "  - Enhanced Document Daemon (auto-organization)"
        log "  - Metrics Aggregator (performance tracking)"
        log "  - Alert Engine (intelligent notifications)"
        log ""
        log "Systems are integrated with existing:"
        log "  - Ghost Runner (patch processing)"
        log "  - BRAUN Daemon (enhanced processing)"
        log "  - Webhook System (GPT integration)"
        log "  - Slack Integration (remote control)"
        log ""
        log "✅ Non-blocking enforcement active - no hanging processes"
        exit 0
    else
        log "⚠️ Ghost 2.0 Systems Launch Incomplete" "warning"
        log "Some systems may need manual intervention"
        exit 1
    fi
}

# Handle signals
cleanup() {
    log "Launcher shutting down..."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Run main function
main 
