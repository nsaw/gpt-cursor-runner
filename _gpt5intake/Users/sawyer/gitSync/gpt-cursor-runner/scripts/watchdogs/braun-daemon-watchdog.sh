#!/bin/bash
set -euo pipefail

# BRAUN Daemon Watchdog
# Monitors BRAUN daemon and restarts if needed

BRAUN_DAEMON_SCRIPT="/Users/sawyer/gitSync/gpt-cursor-runner/braun_daemon.py"
BRAUN_PATCHES_DIR="/Users/sawyer/gitSync/.cursor-cache/MAIN/patches"
LOG_FILE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/braun-watchdog.log"
PID_FILE="/Users/sawyer/gitSync/gpt-cursor-runner/pids/braun-daemon.pid"
MAX_RESTARTS=5
SLEEP_INTERVAL=60
MAX_MEMORY_MB=512
MAX_CPU_PERCENT=80

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

function log_message() {
  echo "[$(date)] $1" >> "$LOG_FILE"
}

function check_braun_health() {
  # Check if BRAUN daemon process is running
  if [ -f "$PID_FILE" ]; then
    local pid=$(cat "$PID_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
      # Check memory usage
      local memory_usage=$(ps -o rss= -p "$pid" 2>/dev/null | awk '{print $1/1024}')
      if [ -n "$memory_usage" ] && (( $(echo "$memory_usage > $MAX_MEMORY_MB" | bc -l) )); then
        log_message "⚠️ BRAUN daemon memory usage high: ${memory_usage}MB > ${MAX_MEMORY_MB}MB"
        return 1
      fi
      
      # Check CPU usage (if available)
      local cpu_usage=$(ps -o %cpu= -p "$pid" 2>/dev/null | awk '{print $1}')
      if [ -n "$cpu_usage" ] && (( $(echo "$cpu_usage > $MAX_CPU_PERCENT" | bc -l) )); then
        log_message "⚠️ BRAUN daemon CPU usage high: ${cpu_usage}% > ${MAX_CPU_PERCENT}%"
        return 1
      fi
      
      # Check if daemon is responsive by looking for recent activity
      local log_file="/Users/sawyer/gitSync/gpt-cursor-runner/logs/braun-daemon.log"
      if [ -f "$log_file" ]; then
        local last_activity=$(stat -f "%m" "$log_file" 2>/dev/null || echo "0")
        local current_time=$(date +%s)
        local time_diff=$((current_time - last_activity))
        
        if [ "$time_diff" -gt 300 ]; then  # 5 minutes
          log_message "⚠️ BRAUN daemon no recent activity for ${time_diff} seconds"
          return 1
        fi
      fi
      
      return 0
    fi
  fi
  return 1
}

function restart_braun() {
  log_message "🔄 Restarting BRAUN daemon..."
  
  # Kill existing process if running
  if [ -f "$PID_FILE" ]; then
    local pid=$(cat "$PID_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
      log_message "🛑 Killing existing BRAUN daemon (PID: $pid)"
      kill -TERM "$pid" 2>/dev/null || true
      sleep 5
      kill -KILL "$pid" 2>/dev/null || true
    fi
  fi
  
  # Start new BRAUN daemon
  log_message "🚀 Starting new BRAUN daemon..."
  nohup python3 "$BRAUN_DAEMON_SCRIPT" --patches-dir "$BRAUN_PATCHES_DIR" >> /Users/sawyer/gitSync/gpt-cursor-runner/logs/braun-daemon.log 2>&1 &
  local new_pid=$!
  echo "$new_pid" > "$PID_FILE"
  
  log_message "✅ BRAUN daemon restarted (PID: $new_pid)"
  
  # Wait a moment for startup
  sleep 10
  
  # Verify restart was successful
  if check_braun_health; then
    log_message "✅ BRAUN daemon restart successful"
    return 0
  else
    log_message "❌ BRAUN daemon restart failed"
    return 1
  fi
}

function monitor_braun() {
  log_message "🛡️ BRAUN daemon watchdog started"
  log_message "📁 Monitoring: $BRAUN_PATCHES_DIR"
  log_message "⏱️ Check interval: ${SLEEP_INTERVAL}s"
  log_message "💾 Max memory: ${MAX_MEMORY_MB}MB"
  log_message "🖥️ Max CPU: ${MAX_CPU_PERCENT}%"
  
  local restart_count=0
  local last_restart_time=0
  
  while true; do
    if ! check_braun_health; then
      local current_time=$(date +%s)
      local time_since_restart=$((current_time - last_restart_time))
      
      # Reset restart count if enough time has passed
      if [ "$time_since_restart" -gt 300 ]; then  # 5 minutes
        restart_count=0
      fi
      
      if [ "$restart_count" -lt "$MAX_RESTARTS" ]; then
        log_message "⚠️ BRAUN daemon health check failed, attempting restart (${restart_count}/${MAX_RESTARTS})"
        
        if restart_braun; then
          restart_count=$((restart_count + 1))
          last_restart_time=$current_time
          log_message "✅ Restart successful, count: ${restart_count}/${MAX_RESTARTS}"
        else
          log_message "❌ Restart failed, count: ${restart_count}/${MAX_RESTARTS}"
        fi
      else
        log_message "🚨 Maximum restart attempts (${MAX_RESTARTS}) reached. BRAUN daemon may need manual intervention."
        log_message "💤 Waiting 5 minutes before allowing more restarts..."
        sleep 300
        restart_count=0
      fi
    else
      log_message "✅ BRAUN daemon healthy"
      # Reset restart count on successful health check
      restart_count=0
    fi
    
    sleep "$SLEEP_INTERVAL"
  done
}

function status() {
  echo "🛡️ BRAUN Daemon Watchdog Status"
  echo "================================"
  
  if [ -f "$PID_FILE" ]; then
    local pid=$(cat "$PID_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
      echo "✅ BRAUN Daemon: RUNNING (PID: $pid)"
      
      # Show resource usage
      local memory_usage=$(ps -o rss= -p "$pid" 2>/dev/null | awk '{print $1/1024}')
      local cpu_usage=$(ps -o %cpu= -p "$pid" 2>/dev/null | awk '{print $1}')
      
      echo "💾 Memory Usage: ${memory_usage:-N/A}MB"
      echo "🖥️ CPU Usage: ${cpu_usage:-N/A}%"
      echo "📁 Patches Directory: $BRAUN_PATCHES_DIR"
      echo "📋 Log File: $LOG_FILE"
    else
      echo "❌ BRAUN Daemon: NOT RUNNING (stale PID file)"
    fi
  else
    echo "❌ BRAUN Daemon: NOT RUNNING (no PID file)"
  fi
  
  echo ""
  echo "🛡️ Watchdog Configuration:"
  echo "⏱️ Check Interval: ${SLEEP_INTERVAL}s"
  echo "💾 Max Memory: ${MAX_MEMORY_MB}MB"
  echo "🖥️ Max CPU: ${MAX_CPU_PERCENT}%"
  echo "🔄 Max Restarts: ${MAX_RESTARTS}"
}

function stop() {
  log_message "🛑 Stopping BRAUN daemon watchdog..."
  
  # Kill watchdog process
  pkill -f "braun-daemon-watchdog.sh" 2>/dev/null || true
  
  # Kill BRAUN daemon
  if [ -f "$PID_FILE" ]; then
    local pid=$(cat "$PID_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
      log_message "🛑 Stopping BRAUN daemon (PID: $pid)"
      kill -TERM "$pid" 2>/dev/null || true
      sleep 3
      kill -KILL "$pid" 2>/dev/null || true
    fi
  fi
  
  rm -f "$PID_FILE"
  log_message "✅ BRAUN daemon watchdog stopped"
}

# Main execution
case "${1:-monitor}" in
  "monitor")
    monitor_braun
    ;;
  "status")
    status
    ;;
  "stop")
    stop
    ;;
  "restart")
    restart_braun
    ;;
  *)
    echo "Usage: $0 {monitor|status|stop|restart}"
    echo "  monitor  - Start monitoring BRAUN daemon (default)"
    echo "  status   - Show current status"
    echo "  stop     - Stop watchdog and BRAUN daemon"
    echo "  restart  - Restart BRAUN daemon"
    exit 1
    ;;
esac 
