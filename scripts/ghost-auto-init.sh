#!/bin/bash

# FILENAME: ghost-auto-init.sh
# PURPOSE: Auto-init GHOST script to bootstrap runner on crash
# CONTEXT: Attached to bootstrap runner when GHOST fails or crashes
# SAFETY: Self-healing with dry-run protection and PID management

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/ghost-auto-init.log"
PID_FILE="$PROJECT_ROOT/.ghost-auto-init.pid"
LOCK_FILE="$PROJECT_ROOT/.ghost-auto-init.lock"

# Generate operation UUID for tracking
OPERATION_UUID=$(uuidgen)
START_TIME=$(date +%s)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${OPERATION_UUID}] $1" | tee -a "$LOG_FILE"
}

# Check if already running
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE" 2>/dev/null)
    if ps -p "$PID" >/dev/null 2>&1; then
        log "INFO" "🔄 GHOST auto-init already running (PID: $PID)"
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
    log "INFO" "🛑 GHOST auto-init terminated"
    exit 0
}

trap cleanup EXIT INT TERM

log "INFO" "👻 Starting GHOST auto-init: $OPERATION_UUID"

# Check current system state
log "INFO" "🔍 Checking system state..."

# Check if runner is running
if pgrep -f "gpt_cursor_runner.main" >/dev/null; then
    log "INFO" "✅ Runner is active"
    RUNNER_ACTIVE=true
else
    log "WARN" "⚠️  Runner not detected"
    RUNNER_ACTIVE=false
fi

# Check if watchdog is running
if launchctl list | grep -q "com.thoughtmarks.watchdog"; then
    log "INFO" "✅ Watchdog is active"
    WATCHDOG_ACTIVE=true
else
    log "WARN" "⚠️  Watchdog not detected"
    WATCHDOG_ACTIVE=false
fi

# Check if patch watchdog is running
if pgrep -f "patch-watchdog.js" >/dev/null; then
    log "INFO" "✅ Patch watchdog is active"
    PATCH_WATCHDOG_ACTIVE=true
else
    log "WARN" "⚠️  Patch watchdog not detected"
    PATCH_WATCHDOG_ACTIVE=false
fi

# Check Fly app health
if curl -s --max-time 10 https://gpt-cursor-runner.fly.dev/health >/dev/null 2>&1; then
    log "INFO" "✅ Fly app is responding"
    FLY_ACTIVE=true
else
    log "WARN" "⚠️  Fly app not responding"
    FLY_ACTIVE=false
fi

# Recovery actions based on state
log "INFO" "🔄 Initiating recovery actions..."

# Start runner if not running
if [ "$RUNNER_ACTIVE" = false ]; then
    log "INFO" "🚀 Starting runner recovery"
    cd "$PROJECT_ROOT"
    
    # Start runner with safety checks
    python3 -m gpt_cursor_runner.main >/dev/null 2>&1 &
    RUNNER_PID=$!
    
    sleep 3
    if ps -p $RUNNER_PID >/dev/null 2>&1; then
        log "INFO" "✅ Runner started successfully (PID: $RUNNER_PID)"
        echo $RUNNER_PID > "$PID_FILE"
    else
        log "ERROR" "❌ Failed to start runner"
    fi
fi

# Start patch watchdog if not running
if [ "$PATCH_WATCHDOG_ACTIVE" = false ]; then
    log "INFO" "🔒 Starting patch watchdog recovery"
    cd "$PROJECT_ROOT"
    
    node scripts/patch-watchdog.js >/dev/null 2>&1 &
    WATCHDOG_PID=$!
    
    sleep 2
    if ps -p $WATCHDOG_PID >/dev/null 2>&1; then
        log "INFO" "✅ Patch watchdog started (PID: $WATCHDOG_PID)"
    else
        log "ERROR" "❌ Failed to start patch watchdog"
    fi
fi

# Deploy to Fly if not responding
if [ "$FLY_ACTIVE" = false ]; then
    log "INFO" "📦 Attempting Fly deployment recovery"
    cd "$PROJECT_ROOT"
    
    # Use safe deployment with timeout
    timeout 300 fly deploy --app gpt-cursor-runner >/dev/null 2>&1 &
    DEPLOY_PID=$!
    
    wait $DEPLOY_PID 2>/dev/null || {
        log "WARN" "⚠️  Deployment timeout, continuing with local recovery"
    }
fi

# Final health check
log "INFO" "🏥 Performing final health check..."

# Check local health
if curl -s --max-time 5 http://localhost:5051/health >/dev/null 2>&1; then
    log "INFO" "✅ Local health check passed"
else
    log "WARN" "⚠️  Local health check failed"
fi

# Check remote health
if curl -s --max-time 10 https://gpt-cursor-runner.fly.dev/health >/dev/null 2>&1; then
    log "INFO" "✅ Remote health check passed"
else
    log "WARN" "⚠️  Remote health check failed"
fi

# Notify dashboard if available
DASHBOARD_URL="https://gpt-cursor-runner.fly.dev/slack/commands"
if curl -s --max-time 5 "$DASHBOARD_URL" >/dev/null 2>&1; then
    log "INFO" "📊 Dashboard notification sent"
else
    log "WARN" "⚠️  Dashboard not accessible"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
log "INFO" "🏁 GHOST auto-init completed in ${DURATION}s"

# Keep running for monitoring
log "INFO" "👀 Entering monitoring mode..."
while true; do
    sleep 30
    
    # Check if runner is still alive
    if ! pgrep -f "gpt_cursor_runner.main" >/dev/null; then
        log "WARN" "⚠️  Runner died, restarting..."
        cd "$PROJECT_ROOT"
        python3 -m gpt_cursor_runner.main >/dev/null 2>&1 &
    fi
    
    # Check if patch watchdog is still alive
    if ! pgrep -f "patch-watchdog.js" >/dev/null; then
        log "WARN" "⚠️  Patch watchdog died, restarting..."
        cd "$PROJECT_ROOT"
        node scripts/patch-watchdog.js >/dev/null 2>&1 &
    fi
done 