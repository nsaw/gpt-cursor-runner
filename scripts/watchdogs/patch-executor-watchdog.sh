#!/bin/bash
set -euo pipefail

# Enhanced Patch Executor Watchdog with Graceful Recovery
# Ensures patch executor loop never goes down with jam-proof fallback

PATCH_EXECUTOR_SCRIPT="/Users/sawyer/gitSync/gpt-cursor-runner/patch_executor_daemon.py"
LOG_FILE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/patch-executor-watchdog.log"
PID_FILE="/Users/sawyer/gitSync/gpt-cursor-runner/pids/patch-executor-daemon.pid"
WATCHDOG_PID_FILE="/Users/sawyer/gitSync/gpt-cursor-runner/pids/patch-executor-watchdog.pid"
MAX_RESTARTS=3  # Reduced to match universal pattern
SLEEP_INTERVAL=30
MAX_MEMORY_MB=512
MAX_CPU_PERCENT=80
RESTART_WINDOW=300  # 5 minutes

# Graceful recovery configuration
RESTART_COUNT_FILE="/tmp/patch-executor-restart-count"
RESTART_TIME_FILE="/tmp/patch-executor-restart-time"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$WATCHDOG_PID_FILE")"

# Initialize restart tracking
init_restart_tracking() {
    echo "0" > "$RESTART_COUNT_FILE"
    date +%s > "$RESTART_TIME_FILE"
}

# Check restart limits
check_restart_limits() {
    local current_time
    local last_restart_time
    local restart_count
    
    current_time=$(date +%s)
    last_restart_time=$(cat "$RESTART_TIME_FILE" 2>/dev/null || echo "0")
    restart_count=$(cat "$RESTART_COUNT_FILE" 2>/dev/null || echo "0")
    
    # Reset counter if outside window
    if [ $((current_time - last_restart_time)) -gt $RESTART_WINDOW ]; then
        echo "0" > "$RESTART_COUNT_FILE"
        restart_count=0
    fi
    
    if [ "$restart_count" -ge $MAX_RESTARTS ]; then
        log_message "🚨 MAX RESTARTS REACHED for Patch Executor"
        log_message "⏸️ Entering cooldown period - no more restarts for $RESTART_WINDOW seconds"
        return 1
    fi
    
    return 0
}

# Increment restart counter
increment_restart_counter() {
    local current_count
    local new_count
    
    current_count=$(cat "$RESTART_COUNT_FILE" 2>/dev/null || echo "0")
    new_count=$((current_count + 1))
    echo "$new_count" > "$RESTART_COUNT_FILE"
    date +%s > "$RESTART_TIME_FILE"
    log_message "🔄 Restart count: $new_count/$MAX_RESTARTS"
}

function log_message() {
  echo "[$(date)] $1" >> "$LOG_FILE"
}

function check_patch_executor_health() {
  # Check if patch executor process is running
  if [ -f "$PID_FILE" ]; then
    local pid=$(cat "$PID_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
      # Check memory usage
      local memory_usage=$(ps -o rss= -p "$pid" 2>/dev/null | awk '{print $1/1024}')
      if [ -n "$memory_usage" ] && (( $(echo "$memory_usage > $MAX_MEMORY_MB" | bc -l) )); then
        log_message "⚠️ Patch executor memory usage high: ${memory_usage}MB > ${MAX_MEMORY_MB}MB"
        return 1
      fi
      
      # Check CPU usage
      local cpu_usage=$(ps -o %cpu= -p "$pid" 2>/dev/null | awk '{print $1}')
      if [ -n "$cpu_usage" ] && (( $(echo "$cpu_usage > $MAX_CPU_PERCENT" | bc -l) )); then
        log_message "⚠️ Patch executor CPU usage high: ${cpu_usage}% > ${MAX_CPU_PERCENT}%"
        return 1
      fi
      
      # Check if process is responsive by looking for recent activity
      local log_file="/Users/sawyer/gitSync/gpt-cursor-runner/logs/patch-executor-daemon.log"
      if [ -f "$log_file" ]; then
        local last_activity=$(stat -f "%m" "$log_file" 2>/dev/null || echo "0")
        local current_time=$(date +%s)
        local time_diff=$((current_time - last_activity))
        
        if [ "$time_diff" -gt 300 ]; then  # 5 minutes
          log_message "⚠️ Patch executor no recent activity for ${time_diff} seconds"
          return 1
        fi
      fi
      
      return 0
    fi
  fi
  return 1
}

function restart_patch_executor() {
  log_message "🔄 Restarting patch executor with graceful recovery..."
  
  # Check restart limits before attempting recovery
  if ! check_restart_limits; then
    log_message "⏸️ Skipping Patch Executor recovery due to restart limits"
    return 1
  fi
  
  # First, try to stop Patch Executor gracefully via PM2 if it's managed by PM2
# MIGRATED: if { timeout 15s pm2 describe patch-executor & } >/dev/null 2>&1 & disown; then
node scripts/nb.js --ttl 15s --label pm2 --log validations/logs/pm2.log --status validations/status -- pm2 describe patch-executor
    log_message "🔄 Stopping Patch Executor via PM2..."
    timeout 15s pm2 stop patch-executor --silent 2>/dev/null || true
    timeout 15s pm2 delete patch-executor --silent 2>/dev/null || true
    sleep 3
  fi
  
  # Kill existing process if running
  if [ -f "$PID_FILE" ]; then
    local pid=$(cat "$PID_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
      log_message "🛑 Killing existing patch executor (PID: $pid)"
      kill -TERM "$pid" 2>/dev/null || true
      sleep 5
      kill -KILL "$pid" 2>/dev/null || true
    fi
  fi
  
  # Clean up any orphaned processes
  { pkill -f "patch_executor_daemon.py" 2>/dev/null || true & } >/dev/null 2>&1 & disown || true
  sleep 2
  
  # Start new patch executor
  log_message "🚀 Starting new patch executor..."
  { nohup python3 "$PATCH_EXECUTOR_SCRIPT" --patches-dir /Users/sawyer/gitSync/.cursor-cache/MAIN/patches >> /Users/sawyer/gitSync/gpt-cursor-runner/logs/patch-executor-daemon.log 2>&1 & } >/dev/null 2>&1 & disown
  local new_pid="$(pgrep -f 'patch_executor_daemon.py' | head -1)"
  echo "$new_pid" > "$PID_FILE"
  
  log_message "✅ Patch executor restarted (PID: $new_pid)"
  
  # Wait a moment for startup
  sleep 10
  
  # Verify restart was successful
  if check_patch_executor_health; then
    log_message "✅ Patch executor restart successful"
    return 0
  else
    log_message "❌ Patch executor restart failed"
    increment_restart_counter
    return 1
  fi
}

function monitor_patch_executor() {
  log_message "🛡️ Enhanced Patch executor watchdog started with graceful recovery"
  log_message "📁 Monitoring: $PATCH_EXECUTOR_SCRIPT"
  log_message "⏱️ Check interval: ${SLEEP_INTERVAL}s"
  log_message "💾 Max memory: ${MAX_MEMORY_MB}MB"
  log_message "🖥️ Max CPU: ${MAX_CPU_PERCENT}%"
  log_message "🔄 Max restarts: ${MAX_RESTARTS} per ${RESTART_WINDOW}s"
  
  # Initialize restart tracking
  init_restart_tracking
  
  # Write watchdog PID file
  echo $$ > "$WATCHDOG_PID_FILE"
  
  while true; do
    if ! check_patch_executor_health; then
      log_message "⚠️ Patch executor health check failed, attempting graceful recovery..."
      
      # Check restart limits before attempting recovery
      if check_restart_limits; then
        if restart_patch_executor; then
          log_message "✅ Graceful recovery successful"
        else
          log_message "❌ Graceful recovery failed"
          # Even if restart fails, keep trying - this is a critical service
          log_message "🚨 CRITICAL: Patch executor restart failed, but continuing to attempt restarts"
        fi
        
        # Wait longer after restart
        sleep 15
      else
        log_message "⏸️ Skipping recovery due to restart limits, waiting for cooldown..."
        sleep 60
      fi
    else
      log_message "✅ Patch executor healthy"
    fi
    
    sleep "$SLEEP_INTERVAL"
  done
}

function status() {
  echo "🛡️ Patch Executor Watchdog Status"
  echo "================================"
  
  if [ -f "$PID_FILE" ]; then
    local pid=$(cat "$PID_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
      echo "✅ Patch Executor: RUNNING (PID: $pid)"
      
      # Show resource usage
      local memory_usage=$(ps -o rss= -p "$pid" 2>/dev/null | awk '{print $1/1024}')
      local cpu_usage=$(ps -o %cpu= -p "$pid" 2>/dev/null | awk '{print $1}')
      
      echo "💾 Memory Usage: ${memory_usage:-N/A}MB"
      echo "🖥️ CPU Usage: ${cpu_usage:-N/A}%"
      echo "📁 Script: $PATCH_EXECUTOR_SCRIPT"
      echo "📋 Log File: $LOG_FILE"
    else
      echo "❌ Patch Executor: NOT RUNNING (stale PID file)"
    fi
  else
    echo "❌ Patch Executor: NOT RUNNING (no PID file)"
  fi
  
  echo ""
  echo "🛡️ Watchdog Configuration:"
  echo "⏱️ Check Interval: ${SLEEP_INTERVAL}s"
  echo "💾 Max Memory: ${MAX_MEMORY_MB}MB"
  echo "🖥️ Max CPU: ${MAX_CPU_PERCENT}%"
  echo "🔄 Max Restarts: ${MAX_RESTARTS} (unlimited for critical service)"
}

function stop() {
  log_message "🛑 Stopping patch executor watchdog..."
  
  # Kill watchdog process
  pkill -f "patch-executor-watchdog.sh" 2>/dev/null || true
  
  # Kill patch executor
  if [ -f "$PID_FILE" ]; then
    local pid=$(cat "$PID_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
      log_message "🛑 Stopping patch executor (PID: $pid)"
      kill -TERM "$pid" 2>/dev/null || true
      sleep 3
      kill -KILL "$pid" 2>/dev/null || true
    fi
  fi
  
  rm -f "$PID_FILE"
  log_message "✅ Patch executor watchdog stopped"
}

# Main execution
case "${1:-monitor}" in
  "monitor")
    monitor_patch_executor
    ;;
  "status")
    status
    ;;
  "stop")
    stop
    ;;
  "restart")
    restart_patch_executor
    ;;
  *)
    echo "Usage: $0 {monitor|status|stop|restart}"
    echo "  monitor  - Start monitoring patch executor (default)"
    echo "  status   - Show current status"
    echo "  stop     - Stop watchdog and patch executor"
    echo "  restart  - Restart patch executor"
    exit 1
    ;;
esac 
