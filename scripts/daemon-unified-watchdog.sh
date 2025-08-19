#!/bin/bash
set -euo pipefail

LOG_FILE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/daemon-watchdog.log"
WEBHOOK_LOG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/webhook-delivery-ops.log"

PORT_FLASK=5555
PORT_***REMOVED***=5053
MAX_RESTART_ATTEMPTS=5
SLEEP_INTERVAL=60

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

function log_message() {
  echo "[$(date)] $1" >> "$LOG_FILE"
}

function check_flask_health() {
  curl -s --max-time 5 http://localhost:$PORT_FLASK/health >/dev/null 2>&1
}

function check_ghost_health() {
  curl -s --max-time 5 http://localhost:$PORT_***REMOVED***/health >/dev/null 2>&1
}

function check_tunnel() {
  pgrep -f cloudflared >/dev/null
}

function restart_flask() {
  log_message "[🔄 RESTARTING FLASK] Flask app health check failed"
  
  # Kill existing Flask process
  lsof -ti:$PORT_FLASK | xargs kill -9 2>/dev/null || true
  sleep 2
  
  # Start Flask app
  cd /Users/sawyer/gitSync/gpt-cursor-runner
  nohup python3 -m gpt_cursor_runner.main > logs/python-runner.log 2>&1 &
  echo $! > pids/python-runner.pid
  
  log_message "[✅ FLASK RESTARTED] PID: $(cat pids/python-runner.pid)"
}

function restart_ghost() {
  log_message "[🔄 RESTARTING ***REMOVED***] Ghost Runner health check failed"
  
  # Kill existing Ghost process
  lsof -ti:$PORT_***REMOVED*** | xargs kill -9 2>/dev/null || true
  sleep 2
  
  # Start Ghost Runner
  cd /Users/sawyer/gitSync/gpt-cursor-runner
  nohup node scripts/ghost-runner.js > logs/ghost-runner.log 2>&1 &
  echo $! > pids/ghost-runner.pid
  
  log_message "[✅ ***REMOVED*** RESTARTED] PID: $(cat pids/ghost-runner.pid)"
}

function restart_tunnel() {
  log_message "[🔄 RESTARTING TUNNEL] Cloudflare tunnel not found"
  
  # Kill existing tunnel
  pkill -f cloudflared 2>/dev/null || true
  sleep 2
  
  # Start tunnel
  cd /Users/sawyer/gitSync/gpt-cursor-runner
  nohup cloudflared tunnel run webhook-tunnel --config config/webhook-tunnel-config.yml > logs/cloudflared.log 2>&1 &
  echo $! > pids/cloudflared.pid
  
  log_message "[✅ TUNNEL RESTARTED] PID: $(cat pids/cloudflared.pid)"
}

function monitor_services() {
  log_message "[🚀 UNIFIED WATCHDOG STARTED] Monitoring all services"
  
  flask_attempts=0
  ghost_attempts=0
  tunnel_attempts=0
  
  while true; do
    # Check Flask health
    if ! check_flask_health; then
      ((flask_attempts++))
      if [ $flask_attempts -le $MAX_RESTART_ATTEMPTS ]; then
        restart_flask
      else
        log_message "[❌ FLASK MAX ATTEMPTS] Reached $MAX_RESTART_ATTEMPTS restarts"
      fi
    else
      if [ $flask_attempts -gt 0 ]; then
        log_message "[✅ FLASK RECOVERED] Reset attempt counter"
        flask_attempts=0
      fi
    fi
    
    # Check Ghost health
    if ! check_ghost_health; then
      ((ghost_attempts++))
      if [ $ghost_attempts -le $MAX_RESTART_ATTEMPTS ]; then
        restart_ghost
      else
        log_message "[❌ ***REMOVED*** MAX ATTEMPTS] Reached $MAX_RESTART_ATTEMPTS restarts"
      fi
    else
      if [ $ghost_attempts -gt 0 ]; then
        log_message "[✅ ***REMOVED*** RECOVERED] Reset attempt counter"
        ghost_attempts=0
      fi
    fi
    
    # Check tunnel
    if ! check_tunnel; then
      ((tunnel_attempts++))
      if [ $tunnel_attempts -le $MAX_RESTART_ATTEMPTS ]; then
        restart_tunnel
      else
        log_message "[❌ TUNNEL MAX ATTEMPTS] Reached $MAX_RESTART_ATTEMPTS restarts"
      fi
    else
      if [ $tunnel_attempts -gt 0 ]; then
        log_message "[✅ TUNNEL RECOVERED] Reset attempt counter"
        tunnel_attempts=0
      fi
    fi
    
    # Log status
    if [ $flask_attempts -eq 0 ] && [ $ghost_attempts -eq 0 ] && [ $tunnel_attempts -eq 0 ]; then
      log_message "[✅ ALL SERVICES HEALTHY] Flask: $(check_flask_health && echo "OK" || echo "FAIL"), Ghost: $(check_ghost_health && echo "OK" || echo "FAIL"), Tunnel: $(check_tunnel && echo "OK" || echo "FAIL")"
    fi
    
    sleep $SLEEP_INTERVAL
  done
}

function status() {
  echo "Unified Watchdog Status at $(date):"
  echo "Flask Health: $(check_flask_health && echo "✅ OK" || echo "❌ FAIL")"
  echo "Ghost Health: $(check_ghost_health && echo "✅ OK" || echo "❌ FAIL")"
  echo "Tunnel Status: $(check_tunnel && echo "✅ OK" || echo "❌ FAIL")"
  
  # Show PIDs
  if [ -f pids/python-runner.pid ]; then
    echo "Flask PID: $(cat pids/python-runner.pid)"
  fi
  if [ -f pids/ghost-runner.pid ]; then
    echo "Ghost PID: $(cat pids/ghost-runner.pid)"
  fi
  if [ -f pids/cloudflared.pid ]; then
    echo "Tunnel PID: $(cat pids/cloudflared.pid)"
  fi
}

case "$1" in
  monitor) monitor_services ;;
  status) status ;;
  *) echo "Usage: $0 {monitor|status}" ;;
esac 
