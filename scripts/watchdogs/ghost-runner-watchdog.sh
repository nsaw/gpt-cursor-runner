#!/bin/bash
set -euo pipefail

# Enhanced Ghost Runner Watchdog with Graceful Recovery
# Monitors and auto-recovers ghost-runner service with jam-proof fallback

PORT=5053
PROCESS_NAME="ghost-runner.js"
SCRIPT_PATH="/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ghost-runner.js"
LOG_FILE="/Users/sawyer/gitSync/gpt-cursor-runner/logs/ghost-runner-CYOPS.log"
PID_FILE="/Users/sawyer/gitSync/gpt-cursor-runner/pids/ghost-runner-watchdog.pid"
MAX_ATTEMPTS=5
SLEEP_INTERVAL=30
MAX_MEMORY_MB=512
MAX_CPU_PERCENT=80
MAX_RESTARTS=3  # Reduced from 5 to match universal pattern
RESTART_WINDOW=300  # 5 minutes

# Graceful recovery configuration
RESTART_COUNT_FILE="/tmp/ghost-runner-restart-count"
RESTART_TIME_FILE="/tmp/ghost-runner-restart-time"

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
        echo "[$(date)] 🚨 MAX RESTARTS REACHED for Ghost Runner" >> "$LOG_FILE"
        echo "[$(date)] ⏸️ Entering cooldown period - no more restarts for $RESTART_WINDOW seconds" >> "$LOG_FILE"
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
    echo "[$(date)] 🔄 Restart count: $new_count/$MAX_RESTARTS" >> "$LOG_FILE"
}

# Safe health check with timeout and non-blocking pattern
safe_health_check() {
    (
        if curl -s --max-time 10 http://localhost:5053/health 2>/dev/null | grep -q '"status":"healthy"'; then
            echo "✅ Ghost Runner health check passed"
            exit 0
        else
            echo "❌ Ghost Runner health check failed"
            exit 1
        fi
    ) &
    local pid=$!
    
    # Wait with timeout
    local wait_time=0
    while [ $wait_time -lt 10 ] && kill -0 $pid 2>/dev/null; do
        sleep 1
        wait_time=$((wait_time + 1))
    done
    
    # Kill if still running
    if kill -0 $pid 2>/dev/null; then
        echo "[$(date)] ⏰ Ghost Runner health check timed out" >> "$LOG_FILE"
        kill -KILL $pid 2>/dev/null || true
        return 1
    fi
    
    # Get exit code
    wait $pid
    return $?
}

function health_check() {
    # Use safe health check
    safe_health_check
}

function is_running() {
  pgrep -f "$PROCESS_NAME" >/dev/null
}

function check_resource_usage() {
  local pid=$(pgrep -f "$PROCESS_NAME" | head -1)
  if [ -n "$pid" ]; then
    # Check memory usage
    local memory_usage=$(ps -o rss= -p "$pid" 2>/dev/null | awk '{print $1/1024}')
    if [ -n "$memory_usage" ] && (( $(echo "$memory_usage > $MAX_MEMORY_MB" | bc -l) )); then
      echo "[$(date)] ⚠️ Ghost Runner memory usage high: ${memory_usage}MB > ${MAX_MEMORY_MB}MB" >> "$LOG_FILE"
      return 1
    fi
    
    # Check CPU usage
    local cpu_usage=$(ps -o %cpu= -p "$pid" 2>/dev/null | awk '{print $1}')
    if [ -n "$cpu_usage" ] && (( $(echo "$cpu_usage > $MAX_CPU_PERCENT" | bc -l) )); then
      echo "[$(date)] ⚠️ Ghost Runner CPU usage high: ${cpu_usage}% > ${MAX_CPU_PERCENT}%" >> "$LOG_FILE"
      return 1
    fi
  fi
  return 0
}

function restart_runner() {
  echo "[$(date)] [INFO] Restarting Ghost Runner with graceful recovery..." >> "$LOG_FILE"
  
  # Check restart limits before attempting recovery
  if ! check_restart_limits; then
    echo "[$(date)] ⏸️ Skipping Ghost Runner recovery due to restart limits" >> "$LOG_FILE"
    return 1
  fi
  
  # First, try to stop Ghost Runner gracefully via PM2 if it's managed by PM2
# MIGRATED: if { timeout 15s pm2 describe ghost-runner & } >/dev/null 2>&1 & disown; then
node scripts/nb.js --ttl 15s --label pm2 --log validations/logs/pm2.log --status validations/status -- pm2 describe ghost-runner
    echo "[$(date)] 🔄 Stopping Ghost Runner via PM2..." >> "$LOG_FILE"
    timeout 15s pm2 stop ghost-runner --silent 2>/dev/null || true
    timeout 15s pm2 delete ghost-runner --silent 2>/dev/null || true
    sleep 3
  fi
  
  # Kill existing process if running
  { pkill -f "$PROCESS_NAME" 2>/dev/null || true & } >/dev/null 2>&1 & disown || true
  sleep 2
  
  # Check if port is available and free it non-destructively
  if lsof -ti:$PORT >/dev/null 2>&1; then
    echo "[$(date)] ⚠️ Port $PORT is in use, attempting graceful cleanup..." >> "$LOG_FILE"
    
    # Try graceful shutdown first
    lsof -ti:$PORT | xargs kill -TERM 2>/dev/null || true
    sleep 5
    
    # Check if processes are still running
    local remaining_pids=$(lsof -ti:$PORT 2>/dev/null)
    if [ -n "$remaining_pids" ]; then
      echo "[$(date)] ⚠️ Graceful shutdown failed, forcing kill" >> "$LOG_FILE"
      echo "$remaining_pids" | xargs kill -KILL 2>/dev/null || true
      sleep 2
    fi
  fi
  
  # Start new process
  { nohup node "$SCRIPT_PATH" >> "$LOG_FILE" 2>&1 & } >/dev/null 2>&1 & disown
  NEW_PID="$(pgrep -f "$PROCESS_NAME" | head -1)"
  
  echo "[$(date)] [INFO] Ghost Runner restarted with PID: $NEW_PID" >> "$LOG_FILE"
  
  # Wait for startup
  sleep 5
  
  # Verify restart
  if is_running && health_check; then
    echo "[$(date)] [INFO] Ghost Runner restart successful" >> "$LOG_FILE"
    return 0
  else
    echo "[$(date)] [ERROR] Ghost Runner restart failed" >> "$LOG_FILE"
    increment_restart_counter
    return 1
  fi
}

function monitor_runner() {
  echo "[$(date)] [INFO] Enhanced Ghost Runner watchdog started with graceful recovery" >> "$LOG_FILE"
  echo "[$(date)] [INFO] Monitoring port: $PORT" >> "$LOG_FILE"
  echo "[$(date)] [INFO] Check interval: ${SLEEP_INTERVAL}s" >> "$LOG_FILE"
  echo "[$(date)] [INFO] Max memory: ${MAX_MEMORY_MB}MB" >> "$LOG_FILE"
  echo "[$(date)] [INFO] Max CPU: ${MAX_CPU_PERCENT}%" >> "$LOG_FILE"
  echo "[$(date)] [INFO] Max restarts: ${MAX_RESTARTS} per ${RESTART_WINDOW}s" >> "$LOG_FILE"
  
  # Initialize restart tracking
  init_restart_tracking
  
  # Write PID file
  mkdir -p "$(dirname "$PID_FILE")"
  echo $$ > "$PID_FILE"
  
  while true; do
    # Check if process is running and healthy
    if ! is_running || ! health_check || ! check_resource_usage; then
      echo "[$(date)] [WARN] Ghost Runner health check failed, attempting graceful recovery..." >> "$LOG_FILE"
      
      # Check restart limits before attempting recovery
      if check_restart_limits; then
        if restart_runner; then
          echo "[$(date)] [INFO] Graceful recovery successful" >> "$LOG_FILE"
        else
          echo "[$(date)] [ERROR] Graceful recovery failed" >> "$LOG_FILE"
        fi
        
        # Wait longer after restart
        sleep 15
      else
        echo "[$(date)] ⏸️ Skipping recovery due to restart limits, waiting for cooldown..." >> "$LOG_FILE"
        sleep 60
      fi
    else
      echo "[$(date)] [INFO] Ghost Runner healthy" >> "$LOG_FILE"
    fi
    
    sleep "$SLEEP_INTERVAL"
  done
}

function status() {
  echo "🛡️ Ghost Runner Watchdog Status"
  echo "================================"
  
  if is_running; then
    local pid=$(pgrep -f "$PROCESS_NAME" | head -1)
    echo "✅ Ghost Runner: RUNNING (PID: $pid)"
    
    # Show resource usage
    local memory_usage=$(ps -o rss= -p "$pid" 2>/dev/null | awk '{print $1/1024}')
    local cpu_usage=$(ps -o %cpu= -p "$pid" 2>/dev/null | awk '{print $1}')
    
    echo "💾 Memory Usage: ${memory_usage:-N/A}MB"
    echo "🖥️ CPU Usage: ${cpu_usage:-N/A}%"
    echo "🌐 Port: $PORT"
    echo "📋 Log File: $LOG_FILE"
    
    if health_check; then
      echo "🏥 Health Check: ✅ HEALTHY"
    else
      echo "🏥 Health Check: ❌ UNHEALTHY"
    fi
  else
    echo "❌ Ghost Runner: NOT RUNNING"
  fi
  
  echo ""
  echo "🛡️ Watchdog Configuration:"
  echo "⏱️ Check Interval: ${SLEEP_INTERVAL}s"
  echo "💾 Max Memory: ${MAX_MEMORY_MB}MB"
  echo "🖥️ Max CPU: ${MAX_CPU_PERCENT}%"
  echo "🔄 Max Restarts: ${MAX_RESTARTS} per ${RESTART_WINDOW}s"
}

function stop() {
  echo "[$(date)] [INFO] Stopping Ghost Runner watchdog..." >> "$LOG_FILE"
  
  # Kill watchdog process
  pkill -f "ghost-runner-watchdog.sh" 2>/dev/null || true
  
  # Kill Ghost Runner
  if is_running; then
    local pid=$(pgrep -f "$PROCESS_NAME" | head -1)
    echo "[$(date)] [INFO] Stopping Ghost Runner (PID: $pid)" >> "$LOG_FILE"
    kill -TERM "$pid" 2>/dev/null || true
    sleep 3
    kill -KILL "$pid" 2>/dev/null || true
  fi
  
  echo "[$(date)] [INFO] Ghost Runner watchdog stopped" >> "$LOG_FILE"
}

# Main execution
case "${1:-monitor}" in
  "monitor")
    monitor_runner
    ;;
  "status")
    status
    ;;
  "stop")
    stop
    ;;
  "restart")
    restart_runner
    ;;
  *)
    echo "Usage: $0 {monitor|status|stop|restart}"
    echo "  monitor  - Start monitoring Ghost Runner (default)"
    echo "  status   - Show current status"
    echo "  stop     - Stop watchdog and Ghost Runner"
    echo "  restart  - Restart Ghost Runner"
    exit 1
    ;;
esac 
