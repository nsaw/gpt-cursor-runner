#!/bin/bash

# Tunnel Watchdog
# Restarts downed tunnels (cloudflared / ngrok)

LOGFILE="/Users/sawyer/gitSync/gpt-cursor-runner/logs/watchdog-tunnel.log"

check_and_restart() {
  if ! pgrep -f cloudflared > /dev/null; then
    echo "[$(date)] [WARN] cloudflared not running. Restarting..." >> $LOGFILE
    timeout 30s cloudflared tunnel run --config /Users/sawyer/.cloudflared/config.yml >> $LOGFILE 2>&1 & disown
    sleep 2
  fi

  if ! pgrep -f ngrok > /dev/null; then
    echo "[$(date)] [WARN] ngrok not running. Restarting..." >> $LOGFILE
    timeout 30s ./scripts/tunnels/launch-ngrok.sh >> $LOGFILE 2>&1 & disown
    sleep 2
  fi
}

while true; do
  check_and_restart
  sleep 45
done 