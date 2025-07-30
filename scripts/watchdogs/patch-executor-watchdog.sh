#!/bin/bash
set -euo pipefail

# Patch Executor Watchdog
# Ensures patch executor loop never goes down

PATCH_EXECUTOR_SCRIPT="/Users/sawyer/gitSync/gpt-cursor-runner/scripts/patch-executor-loop.js"
LOG_FILE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/patch-executor-watchdog.log"
PID_FILE="/Users/sawyer/gitSync/gpt-cursor-runner/pids/patch-executor-loop.pid"
MAX_RESTARTS=10
SLEEP_INTERVAL=30
MAX_MEMORY_MB=512
MAX_CPU_PERCENT=80

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

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
      local log_file="/Users/sawyer/gitSync/gpt-cursor-runner/logs/patch-executor-loop.log"
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
  log_message "🔄 Restarting patch executor..."
  
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
  
  # Start new patch executor
  log_message "🚀 Starting new patch executor..."
  nohup node "$PATCH_EXECUTOR_SCRIPT" >> /Users/sawyer/gitSync/gpt-cursor-runner/logs/patch-executor-loop.log 2>&1 &
  local new_pid=$!
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
    return 1
  fi
}

function monitor_patch_executor() {
  log_message "🛡️ Patch executor watchdog started"
  log_message "📁 Monitoring: $PATCH_EXECUTOR_SCRIPT"
  log_message "⏱️ Check interval: ${SLEEP_INTERVAL}s"
  log_message "💾 Max memory: ${MAX_MEMORY_MB}MB"
  log_message "🖥️ Max CPU: ${MAX_CPU_PERCENT}%"
  log_message "🔄 Max restarts: ${MAX_RESTARTS} (unlimited for critical service)"
  
  local restart_count=0
  local last_restart_time=0
  
  while true; do
    if ! check_patch_executor_health; then
      local current_time=$(date +%s)
      local time_since_restart=$((current_time - last_restart_time))
      
      # Reset restart count if enough time has passed
      if [ "$time_since_restart" -gt 300 ]; then  # 5 minutes
        restart_count=0
      fi
      
      # For patch executor, we allow unlimited restarts as it's critical
      log_message "⚠️ Patch executor health check failed, attempting restart (${restart_count}/${MAX_RESTARTS})"
      
      if restart_patch_executor; then
        restart_count=$((restart_count + 1))
        last_restart_time=$current_time
        log_message "✅ Restart successful, count: ${restart_count}/${MAX_RESTARTS}"
      else
        log_message "❌ Restart failed, count: ${restart_count}/${MAX_RESTARTS}"
        # Even if restart fails, keep trying - this is a critical service
        log_message "🚨 CRITICAL: Patch executor restart failed, but continuing to attempt restarts"
      fi
    else
      log_message "✅ Patch executor healthy"
      # Reset restart count on successful health check
      restart_count=0
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