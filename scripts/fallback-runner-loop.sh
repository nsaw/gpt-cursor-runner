#!/bin/bash

# FILENAME: fallback-runner-loop.sh
# PURPOSE: Shadow bootstrap loop for dead GHOST recovery
# CONTEXT: Runs every 5 minutes via cron to resurrect runner when GHOST fails
# SAFETY: Dry-run protected, only activates if no runner is detected

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/fallback-runner-loop.log"
PID_FILE="$PROJECT_ROOT/.fallback-runner.pid"
LOCK_FILE="$PROJECT_ROOT/.fallback-runner.lock"

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
        log "INFO" "🔄 Fallback runner loop already running (PID: $PID)"
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
    log "INFO" "🛑 Fallback runner loop terminated"
    exit 0
}

trap cleanup EXIT INT TERM

log "INFO" "🚀 Starting fallback runner loop: $OPERATION_UUID"

# Check if runner is already running
if pgrep -f "gpt_cursor_runner.main" >/dev/null; then
    log "INFO" "✅ Runner already active, skipping bootstrap"
    exit 0
fi

# Check if watchdog is running
if ! launchctl list | grep -q "com.thoughtmarks.watchdog"; then
    log "WARN" "⚠️  Watchdog not running, attempting to restart"
    launchctl load ~/Library/LaunchAgents/com.thoughtmarks.watchdog.gpt-cursor-runner.plist 2>/dev/null || {
        log "ERROR" "❌ Failed to load watchdog plist"
    }
fi

# Check if Fly app is accessible
if ! curl -s --max-time 10 https://gpt-cursor-runner.fly.dev/health >/dev/null 2>&1; then
    log "WARN" "⚠️  Fly app not responding, attempting deployment"
    
    # Dry-run deployment check
    if [ -f "$PROJECT_ROOT/fly.toml" ]; then
        log "INFO" "📦 Attempting Fly deployment recovery"
        cd "$PROJECT_ROOT"
        
        # Use safe deployment with timeout
        timeout 300 fly deploy --app gpt-cursor-runner >/dev/null 2>&1 &
        DEPLOY_PID=$!
        
        # Wait for deployment with timeout
        wait $DEPLOY_PID 2>/dev/null || {
            log "WARN" "⚠️  Deployment timeout, continuing with local recovery"
        }
    fi
fi

# Start local runner if not running
if ! pgrep -f "gpt_cursor_runner.main" >/dev/null; then
    log "INFO" "🔄 Starting local runner recovery"
    cd "$PROJECT_ROOT"
    
    # Start runner in background with safety checks
    python3 -m gpt_cursor_runner.main >/dev/null 2>&1 &
    RUNNER_PID=$!
    
    # Wait a moment and check if it started
    sleep 3
    if ps -p $RUNNER_PID >/dev/null 2>&1; then
        log "INFO" "✅ Local runner started (PID: $RUNNER_PID)"
        echo $RUNNER_PID > "$PID_FILE"
    else
        log "ERROR" "❌ Failed to start local runner"
    fi
fi

# Check patch watchdog
if ! pgrep -f "patch-watchdog.js" >/dev/null; then
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

# Health check
HEALTH_CHECK_URL="http://localhost:5051/health"
if curl -s --max-time 5 "$HEALTH_CHECK_URL" >/dev/null 2>&1; then
    log "INFO" "✅ Runner health check passed"
else
    log "WARN" "⚠️  Runner health check failed, may need manual intervention"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
log "INFO" "🏁 Fallback runner loop completed in ${DURATION}s" 