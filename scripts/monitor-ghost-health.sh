#!/bin/bash

# Ghost Health Monitor - Real-time log monitoring for patch delivery confirmation
# Part of patch-v3.3.25(P14.00.08)_real-time-log-ghost-health-inline

set -e

LOG_DIR="/Users/sawyer/gitSync/gpt-cursor-runner/logs"
GHOST_LOG="$LOG_DIR/ghost-bridge.log"
EXECUTOR_LOG="$LOG_DIR/patch-executor.log"
MONITOR_LOG="$LOG_DIR/ghost-health-monitor.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🚀 Starting Ghost Health Monitor..." | tee -a "$MONITOR_LOG"

# Function to check for ACKNOWLEDGED messages in ghost bridge log
check_ghost_ack() {
    if grep -q "ACKNOWLEDGED" "$GHOST_LOG" 2>/dev/null; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Ghost bridge ACK confirmed" | tee -a "$MONITOR_LOG"
        return 0
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⏳ Waiting for ghost bridge ACK..." | tee -a "$MONITOR_LOG"
        return 1
    fi
}

# Function to check for successful patch execution
check_executor_success() {
    if grep -q "Patch execution successful" "$EXECUTOR_LOG" 2>/dev/null; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Patch executor success confirmed" | tee -a "$MONITOR_LOG"
        return 0
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⏳ Waiting for patch executor success..." | tee -a "$MONITOR_LOG"
        return 1
    fi
}

# Function to monitor logs in real-time
monitor_logs() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 📊 Starting real-time log monitoring..." | tee -a "$MONITOR_LOG"
    
    # Start background tail processes for real-time monitoring
    { tail -f "$GHOST_LOG" | grep --line-buffered "ACKNOWLEDGED\|ERROR\|WARN" & } >/dev/null 2>&1 & disown
    { tail -f "$EXECUTOR_LOG" | grep --line-buffered "success\|ERROR\|WARN" & } >/dev/null 2>&1 & disown
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔍 Background monitoring started" | tee -a "$MONITOR_LOG"
}

# Function to validate log timestamps
validate_timestamps() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🕒 Validating log timestamps..." | tee -a "$MONITOR_LOG"
    
    # Check if logs have recent activity (within last 5 minutes)
    local current_time=$(date +%s)
    local ghost_mtime=$(stat -f %m "$GHOST_LOG" 2>/dev/null || echo "0")
    local executor_mtime=$(stat -f %m "$EXECUTOR_LOG" 2>/dev/null || echo "0")
    
    local time_diff_ghost=$((current_time - ghost_mtime))
    local time_diff_executor=$((current_time - executor_mtime))
    
    if [ "$time_diff_ghost" -lt 300 ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Ghost log is recent (${time_diff_ghost}s ago)" | tee -a "$MONITOR_LOG"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Ghost log is stale (${time_diff_ghost}s ago)" | tee -a "$MONITOR_LOG"
    fi
    
    if [ "$time_diff_executor" -lt 300 ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Executor log is recent (${time_diff_executor}s ago)" | tee -a "$MONITOR_LOG"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Executor log is stale (${time_diff_executor}s ago)" | tee -a "$MONITOR_LOG"
    fi
}

# Main execution
main() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🎯 Ghost Health Monitor v3.3.25(P14.00.08)" | tee -a "$MONITOR_LOG"
    
    # Validate log files exist
    if [ ! -f "$GHOST_LOG" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Ghost bridge log not found: $GHOST_LOG" | tee -a "$MONITOR_LOG"
        exit 1
    fi
    
    if [ ! -f "$EXECUTOR_LOG" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Patch executor log not found: $EXECUTOR_LOG" | tee -a "$MONITOR_LOG"
        exit 1
    fi
    
    # Start monitoring
    monitor_logs
    validate_timestamps
    
    # Initial checks
    check_ghost_ack
    check_executor_success
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🎉 Ghost Health Monitor initialized successfully" | tee -a "$MONITOR_LOG"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 📋 Monitoring active - watching for ACK and success patterns" | tee -a "$MONITOR_LOG"
}

# Run main function
main "$@" 