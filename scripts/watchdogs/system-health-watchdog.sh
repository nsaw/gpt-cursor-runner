#!/bin/bash

# System Health Watchdog
# Monitors and restarts critical services
LOGFILE="/Users/sawyer/gitSync/gpt-cursor-runner/logs/watchdog-system.log"

check_and_restart() {
  for svc in "ghost-bridge" "patch-executor" "summary-monitor" "realtime-monitor"; do
    if ! pgrep -f $svc > /dev/null; then
      echo "[$(date)] [WARN] $svc not running. Restarting..." >> $LOGFILE
      case $svc in
        "ghost-bridge")
          timeout 30s node scripts/ghost-bridge.js >> $LOGFILE 2>&1 & disown
          ;;
        "patch-executor")
          timeout 30s node scripts/patch-executor.js >> $LOGFILE 2>&1 & disown
          ;;
        "summary-monitor")
          timeout 30s node scripts/monitor/summary-monitor.js >> $LOGFILE 2>&1 & disown
          ;;
        "realtime-monitor")
          timeout 30s node scripts/monitor/realtime-monitor.js >> $LOGFILE 2>&1 & disown
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