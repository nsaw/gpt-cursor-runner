#!/bin/bash

# Log Migration Script
# Migrates existing logs to the new unified log location

set -e

UNIFIED_LOG_DIR="/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs"
OLD_LOG_DIR="/Users/sawyer/gitSync/gpt-cursor-runner/logs"

echo "🔄 Starting log migration to unified location..."

# Create unified log directory if it doesn't exist
mkdir -p "$UNIFIED_LOG_DIR"

# Function to migrate a log file
migrate_log() {
    local old_file="$1"
    local new_file="$2"
    
    if [ -f "$old_file" ]; then
        echo "📁 Migrating: $(basename "$old_file")"
        cp "$old_file" "$new_file"
        echo "✅ Migrated: $(basename "$old_file")"
    else
        echo "⚠️  Not found: $(basename "$old_file")"
    fi
}

# Migrate main service logs
echo "📋 Migrating main service logs..."
migrate_log "$OLD_LOG_DIR/flask-dashboard.log" "$UNIFIED_LOG_DIR/flask-dashboard.log"
migrate_log "$OLD_LOG_DIR/ghost-runner.log" "$UNIFIED_LOG_DIR/ghost-runner.log"
migrate_log "$OLD_LOG_DIR/ghost-bridge.log" "$UNIFIED_LOG_DIR/ghost-bridge.log"
migrate_log "$OLD_LOG_DIR/ghost-relay.log" "$UNIFIED_LOG_DIR/ghost-relay.log"
migrate_log "$OLD_LOG_DIR/ghost-viewer.log" "$UNIFIED_LOG_DIR/ghost-viewer.log"
migrate_log "$OLD_LOG_DIR/enhanced-doc-daemon.log" "$UNIFIED_LOG_DIR/enhanced-doc-daemon.log"
migrate_log "$OLD_LOG_DIR/summary-monitor.log" "$UNIFIED_LOG_DIR/summary-monitor.log"
migrate_log "$OLD_LOG_DIR/dual-monitor.log" "$UNIFIED_LOG_DIR/dual-monitor.log"
migrate_log "$OLD_LOG_DIR/dashboard-uplink.log" "$UNIFIED_LOG_DIR/dashboard-uplink.log"
migrate_log "$OLD_LOG_DIR/telemetry-orchestrator.log" "$UNIFIED_LOG_DIR/telemetry-orchestrator.log"
migrate_log "$OLD_LOG_DIR/metrics-aggregator-daemon.log" "$UNIFIED_LOG_DIR/metrics-aggregator-daemon.log"
migrate_log "$OLD_LOG_DIR/alert-engine-daemon.log" "$UNIFIED_LOG_DIR/alert-engine-daemon.log"
migrate_log "$OLD_LOG_DIR/patch-executor.log" "$UNIFIED_LOG_DIR/patch-executor.log"
migrate_log "$OLD_LOG_DIR/autonomous-decision-daemon.log" "$UNIFIED_LOG_DIR/autonomous-decision-daemon.log"
migrate_log "$OLD_LOG_DIR/ngrok-tunnel.log" "$UNIFIED_LOG_DIR/ngrok-tunnel.log"

# Migrate PM2 logs
echo "📋 Migrating PM2 logs..."
migrate_log "$OLD_LOG_DIR/ghost-bridge-error.log" "$UNIFIED_LOG_DIR/ghost-bridge-error.log"
migrate_log "$OLD_LOG_DIR/ghost-bridge-out.log" "$UNIFIED_LOG_DIR/ghost-bridge-out.log"
migrate_log "$OLD_LOG_DIR/ghost-bridge-combined.log" "$UNIFIED_LOG_DIR/ghost-bridge-combined.log"
migrate_log "$OLD_LOG_DIR/ghost-relay-error.log" "$UNIFIED_LOG_DIR/ghost-relay-error.log"
migrate_log "$OLD_LOG_DIR/ghost-relay-out.log" "$UNIFIED_LOG_DIR/ghost-relay-out.log"
migrate_log "$OLD_LOG_DIR/ghost-relay-combined.log" "$UNIFIED_LOG_DIR/ghost-relay-combined.log"
migrate_log "$OLD_LOG_DIR/ghost-viewer-error.log" "$UNIFIED_LOG_DIR/ghost-viewer-error.log"
migrate_log "$OLD_LOG_DIR/ghost-viewer-out.log" "$UNIFIED_LOG_DIR/ghost-viewer-out.log"
migrate_log "$OLD_LOG_DIR/ghost-viewer-combined.log" "$UNIFIED_LOG_DIR/ghost-viewer-combined.log"

# Migrate watchdog logs
echo "📋 Migrating watchdog logs..."
migrate_log "$OLD_LOG_DIR/ghost-bridge-watchdog.log" "$UNIFIED_LOG_DIR/ghost-bridge-watchdog.log"
migrate_log "$OLD_LOG_DIR/ghost-relay-watchdog.log" "$UNIFIED_LOG_DIR/ghost-relay-watchdog.log"
migrate_log "$OLD_LOG_DIR/ghost-viewer-watchdog.log" "$UNIFIED_LOG_DIR/ghost-viewer-watchdog.log"
migrate_log "$OLD_LOG_DIR/dashboard-uplink-watchdog.log" "$UNIFIED_LOG_DIR/dashboard-uplink-watchdog.log"
migrate_log "$OLD_LOG_DIR/summary-watcher-watchdog.log" "$UNIFIED_LOG_DIR/summary-watcher-watchdog.log"
migrate_log "$OLD_LOG_DIR/patch-executor-watchdog.log" "$UNIFIED_LOG_DIR/patch-executor-watchdog.log"

# Create placeholder files for services that don't have logs yet
echo "📋 Creating placeholder files for new services..."
touch "$UNIFIED_LOG_DIR/MAIN-backend-api.log"
touch "$UNIFIED_LOG_DIR/expo-dev.log"
touch "$UNIFIED_LOG_DIR/expo-web.log"

echo "✅ Log migration completed!"
echo "📁 New unified log location: $UNIFIED_LOG_DIR"
echo "📊 Total log files: $(ls -1 "$UNIFIED_LOG_DIR" | wc -l)" 