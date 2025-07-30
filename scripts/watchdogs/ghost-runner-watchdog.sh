#!/bin/bash

PORT=5053
PROCESS_NAME="ghost-runner.js"
SCRIPT_PATH="/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ghost-runner.js"
LOG_FILE="/Users/sawyer/gitSync/gpt-cursor-runner/logs/ghost-runner-CYOPS.log"
MAX_ATTEMPTS=5
SLEEP_INTERVAL=30
MAX_MEMORY_MB=512
MAX_CPU_PERCENT=80
MAX_RESTARTS=5
RESTART_WINDOW=300  # 5 minutes

function health_check() {
  # Check Ghost Runner directly on its own port
  curl -s http://localhost:5053/health 2>/dev/null | grep -q '"status":"healthy"'
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
  echo "[$(date)] [INFO] Restarting Ghost Runner..." >> "$LOG_FILE"
  
  # Kill existing process if running
  pkill -f "$PROCESS_NAME" 2>/dev/null || true
  sleep 2
  
  # Start new process
  nohup node "$SCRIPT_PATH" >> "$LOG_FILE" 2>&1 &
  NEW_PID=$!
  
  echo "[$(date)] [INFO] Ghost Runner restarted with PID: $NEW_PID" >> "$LOG_FILE"
  
  # Wait for startup
  sleep 5
  
  # Verify restart
  if is_running && health_check; then
    echo "[$(date)] [INFO] Ghost Runner restart successful" >> "$LOG_FILE"
    return 0
  else
    echo "[$(date)] [ERROR] Ghost Runner restart failed" >> "$LOG_FILE"
    return 1
  fi
}

function monitor_runner() {
  echo "[$(date)] [INFO] Ghost Runner watchdog started" >> "$LOG_FILE"
  echo "[$(date)] [INFO] Monitoring port: $PORT" >> "$LOG_FILE"
  echo "[$(date)] [INFO] Check interval: ${SLEEP_INTERVAL}s" >> "$LOG_FILE"
  echo "[$(date)] [INFO] Max memory: ${MAX_MEMORY_MB}MB" >> "$LOG_FILE"
  echo "[$(date)] [INFO] Max CPU: ${MAX_CPU_PERCENT}%" >> "$LOG_FILE"
  echo "[$(date)] [INFO] Max restarts: ${MAX_RESTARTS} per ${RESTART_WINDOW}s" >> "$LOG_FILE"
  
  local restart_count=0
  local last_restart_time=0
  
  while true; do
    # Check if process is running and healthy
    if ! is_running || ! health_check || ! check_resource_usage; then
      local current_time=$(date +%s)
      local time_since_restart=$((current_time - last_restart_time))
      
      # Reset restart count if enough time has passed
      if [ "$time_since_restart" -gt "$RESTART_WINDOW" ]; then
        restart_count=0
      fi
      
      if [ "$restart_count" -lt "$MAX_RESTARTS" ]; then
        echo "[$(date)] [WARN] Ghost Runner health check failed, attempting restart (${restart_count}/${MAX_RESTARTS})" >> "$LOG_FILE"
        
        if restart_runner; then
          restart_count=$((restart_count + 1))
          last_restart_time=$current_time
          echo "[$(date)] [INFO] Restart successful, count: ${restart_count}/${MAX_RESTARTS}" >> "$LOG_FILE"
        else
          echo "[$(date)] [ERROR] Restart failed, count: ${restart_count}/${MAX_RESTARTS}" >> "$LOG_FILE"
        fi
      else
        echo "[$(date)] [ERROR] Maximum restart attempts (${MAX_RESTARTS}) reached. Ghost Runner may need manual intervention." >> "$LOG_FILE"
        echo "[$(date)] [INFO] Waiting ${RESTART_WINDOW} seconds before allowing more restarts..." >> "$LOG_FILE"
        sleep "$RESTART_WINDOW"
        restart_count=0
      fi
    else
      echo "[$(date)] [INFO] Ghost Runner healthy" >> "$LOG_FILE"
      # Reset restart count on successful health check
      restart_count=0
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