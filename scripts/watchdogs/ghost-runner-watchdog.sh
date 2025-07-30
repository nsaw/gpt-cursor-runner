#!/bin/bash

PORT=5053
PROCESS_NAME="ghost-runner.js"
SCRIPT_PATH="/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ghost-runner.js"
LOG_FILE="/Users/sawyer/gitSync/gpt-cursor-runner/logs/ghost-runner-CYOPS.log"
MAX_ATTEMPTS=10
SLEEP_INTERVAL=30

function health_check() {
  curl -s http://localhost:5555/health 2>/dev/null | grep -q '"ghost_runner": "up"'
}

function is_running() {
  pgrep -f "$PROCESS_NAME" >/dev/null
}

function restart_runner() {
  echo "[$(date)] [INFO] Restarting Ghost Runner..."
  nohup node "$SCRIPT_PATH" >> "$LOG_FILE" 2>&1 &
  sleep 5
  echo "[$(date)] [INFO] Restart issued"
}

function monitor() {
  attempts=0
  while true; do
    if ! is_running || ! health_check; then
      echo "[$(date)] [WARN] Ghost Runner unhealthy or stopped"
      ((attempts++))
      if [ $attempts -le $MAX_ATTEMPTS ]; then
        restart_runner
      else
        echo "[$(date)] [FATAL] Max restart attempts reached. Manual intervention required."
        exit 1
      fi
    else
      attempts=0
    fi
    sleep $SLEEP_INTERVAL
  done
}

function status() {
  echo "Ghost Runner Watchdog Status at $(date):"
  is_running && echo "✅ Process running" || echo "❌ Process not found"
  health_check && echo "✅ Health check passed" || echo "❌ Health check failed"
}

case "$1" in
  monitor) monitor ;;
  status) status ;;
  *) echo "Usage: $0 {monitor|status}" ;;
esac 