#!/bin/bash

# DEV Watchdog - Auto-restart on health check failure
# Monitors Fly.io app health and restarts on failure

echo "🛡️  DEV Watchdog started - monitoring health endpoint"

RETRIES=0
MAX_RETRIES=3
BACKOFF=2

while true; do
  # Test health endpoint
  if curl -s http://localhost:5051/health > /dev/null 2>&1; then
    echo "✅ Health check passed - $(date)"
    RETRIES=0
  else
    echo "🛑 HEALTH FAIL - $(date)"
    RETRIES=$((RETRIES+1))
    if [ $RETRIES -ge $MAX_RETRIES ]; then
      echo "🚨 Health check failed $RETRIES times, escalating!"
      # TODO: Add Slack escalation or dashboard log here
      RETRIES=0
    fi
    echo "🔄 Restarting Fly.io app..."
    flyctl restart --app gpt-cursor-runner
    echo "⏳ Waiting 60s for restart..."
    sleep 60
    sleep $((BACKOFF ** RETRIES))
  fi
  # Wait 30 seconds before next check
  sleep 30
done 