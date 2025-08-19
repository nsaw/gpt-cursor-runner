#!/bin/bash

# System Health Watchdog
# Monitors and restarts critical services
LOGFILE="/Users/sawyer/gitSync/gpt-cursor-runner/logs/watchdog-system.log"

# Resolve timeout binary
resolve_timeout_bin() {
  if command -v timeout >/dev/null 2>&1; then
    echo "timeout"
  elif command -v gtimeout >/dev/null 2>&1; then
    echo "gtimeout"
  else
    echo ""
  fi
}
TIMEOUT_BIN="$(resolve_timeout_bin)"

nb() {
  local cmd_str="$1"
  local t=${2:-30}
  if [ -n "$TIMEOUT_BIN" ]; then
    { $TIMEOUT_BIN ${t}s bash -lc "$cmd_str" & } >/dev/null 2>&1 & disown || true
  else
    { bash -lc "$cmd_str" & } >/dev/null 2>&1 & disown || true
  fi
}

check_and_restart() {
  for svc in "ghost-bridge" "patch-executor" "summary-monitor" "realtime-monitor"; do
    if ! pgrep -f $svc > /dev/null; then
      echo "[$(date)] [WARN] $svc not running. Restarting..." >> $LOGFILE
      case $svc in
        "ghost-bridge")
          nb "node scripts/ghost-bridge.js >> $LOGFILE 2>&1" 30
          ;;
        "patch-executor")
          nb "node scripts/patch-executor.js >> $LOGFILE 2>&1" 30
          ;;
        "summary-monitor")
          nb "node scripts/monitor/summary-monitor.js >> $LOGFILE 2>&1" 30
          ;;
        "realtime-monitor")
          nb "node scripts/monitor/realtime-monitor.js >> $LOGFILE 2>&1" 30
          ;;
      esac
      sleep 2
    fi
  done
}

while true; do
  check_and_restart
  sleep 45
done 
