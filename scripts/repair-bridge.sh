#!/bin/bash

# FILENAME: repair-bridge.sh
# PURPOSE: Fly repair bridge for remote fallback recovery
# CONTEXT: Deployed repair bridge for remote fallback recovery
# SAFETY: Remote recovery with dry-run protection and health checks

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/repair-bridge.log"
PID_FILE="$PROJECT_ROOT/.repair-bridge.pid"
LOCK_FILE="$PROJECT_ROOT/.repair-bridge.lock"

# Generate operation UUID for tracking
OPERATION_UUID=$(uuidgen)
START_TIME=$(date +%s)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${OPERATION_UUID}] $1" | tee -a "$LOG_FILE"
}

# Parse command line arguments
INIT_MODE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --init)
            INIT_MODE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            log "ERROR" "❌ Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check if already running
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE" 2>/dev/null)
    if ps -p "$PID" >/dev/null 2>&1; then
        log "INFO" "🔄 Repair bridge already running (PID: $PID)"
        exit 0
    else
        log "WARN" "⚠️  Stale lock file detected, removing"
        rm -f "$LOCK_FILE"
    fi
fi

# Create lock file
echo $$ > "$LOCK_FILE"

# Cleanup on exit
cleanup() {
    rm -f "$LOCK_FILE"
    log "INFO" "🛑 Repair bridge terminated"
    exit 0
}

trap cleanup EXIT INT TERM

log "INFO" "🌐 Starting Fly repair bridge: $OPERATION_UUID"

# Initialize repair bridge
if [ "$INIT_MODE" = true ]; then
    log "INFO" "🔧 Initializing repair bridge..."
    
    # Check Fly CLI availability
    if ! command -v fly >/dev/null 2>&1; then
        log "ERROR" "❌ Fly CLI not found"
        exit 1
    fi
    
    # Check app configuration
    if [ ! -f "$PROJECT_ROOT/fly.toml" ]; then
        log "ERROR" "❌ fly.toml not found"
        exit 1
    fi
    
    # Validate app configuration
    if [ "$DRY_RUN" = false ]; then
        if ! fly apps list | grep -q "gpt-cursor-runner"; then
            log "ERROR" "❌ App gpt-cursor-runner not found"
            exit 1
        fi
    fi
    
    log "INFO" "✅ Repair bridge initialization complete"
fi

# Health check function
check_fly_health() {
    local app_url="https://gpt-cursor-runner.fly.dev"
    local health_url="$app_url/health"
    
    # Check if app is responding
    if curl -s --max-time 10 "$health_url" >/dev/null 2>&1; then
        log "INFO" "✅ Fly app health check passed"
        return 0
    else
        log "WARN" "⚠️  Fly app health check failed"
        return 1
    fi
}

# Deploy function
deploy_app() {
    log "INFO" "📦 Deploying to Fly..."
    
    if [ "$DRY_RUN" = true ]; then
        log "INFO" "[DRY-RUN] Would deploy to Fly"
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    
    # Deploy with timeout and error handling
    timeout 600 fly deploy --app gpt-cursor-runner >/dev/null 2>&1 &
    DEPLOY_PID=$!
    
    # Wait for deployment
    wait $DEPLOY_PID
    DEPLOY_EXIT=$?
    
    if [ $DEPLOY_EXIT -eq 0 ]; then
        log "INFO" "✅ Deployment successful"
        return 0
    else
        log "ERROR" "❌ Deployment failed (exit code: $DEPLOY_EXIT)"
        return 1
    fi
}

# Repair function
repair_app() {
    log "INFO" "🔧 Starting repair sequence..."
    
    # Check current status
    if check_fly_health; then
        log "INFO" "✅ App is healthy, no repair needed"
        return 0
    fi
    
    # Attempt deployment
    if deploy_app; then
        # Wait for deployment to stabilize
        sleep 30
        
        # Check health again
        if check_fly_health; then
            log "INFO" "✅ Repair successful"
            return 0
        else
            log "ERROR" "❌ Repair failed - app still unhealthy"
            return 1
        fi
    else
        log "ERROR" "❌ Repair failed - deployment failed"
        return 1
    fi
}

# Monitor function
monitor_app() {
    log "INFO" "👀 Starting monitoring mode..."
    
    while true; do
        # Check health every 5 minutes
        if ! check_fly_health; then
            log "WARN" "⚠️  App unhealthy, initiating repair..."
            repair_app
        fi
        
        sleep 300  # 5 minutes
    done
}

# Main execution
if [ "$INIT_MODE" = true ]; then
    # Initialize and start monitoring
    monitor_app
else
    # Just repair once
    repair_app
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
log "INFO" "🏁 Repair bridge completed in ${DURATION}s" 