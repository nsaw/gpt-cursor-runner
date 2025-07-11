#!/bin/bash

# DEV Watchdog - Auto-restart on health check failure
# Monitors Fly.io app health and restarts on failure

echo "🛡️  DEV Watchdog started - monitoring health endpoint"

while true; do
  # Test health endpoint
  if curl -s http://localhost:5051/health > /dev/null 2>&1; then
    echo "✅ Health check passed - $(date)"
  else
    echo "🛑 HEALTH FAIL - $(date)"
    echo "🔄 Restarting Fly.io app..."
    flyctl restart --app gpt-cursor-runner
    echo "⏳ Waiting 60s for restart..."
    sleep 60
  fi
  
  # Wait 30 seconds before next check
  sleep 30
done 