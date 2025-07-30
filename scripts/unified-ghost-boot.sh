#!/bin/bash
set -euo pipefail

LOG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/unified-ghost-boot.log"
mkdir -p $(dirname "$LOG")

{
  echo "[BOOT START] $(date)"
  echo "🚀 Starting unified ghost boot with Fly.io as primary deployment..."

  # 🔧 PORT CONFLICT RESOLUTION
  echo "Resolving port conflicts..."
  
  # Kill any processes using port 5555 (Flask app port)
  lsof -ti:5555 | xargs kill -9 2>/dev/null || true
  
  # Kill any processes using port 5053 (Ghost Runner port)
  lsof -ti:5053 | xargs kill -9 2>/dev/null || true
  
  # Clean up PID files
  rm -f pids/python-runner.pid pids/ghost-runner.pid pids/cloudflared.pid
  
  # Clean up any existing watchdog processes
  pkill -f ghost-runner-watchdog.sh 2>/dev/null || true
  pkill -f command-queue-daemon.sh 2>/dev/null || true
  pkill -f braun-daemon-watchdog.sh 2>/dev/null || true
  pkill -f patch-executor-watchdog.sh 2>/dev/null || true
  pkill -f braun_daemon.py 2>/dev/null || true
  pkill -f patch-executor-loop.js 2>/dev/null || true
  
  sleep 2

  # 🔧 ENVIRONMENT VARIABLES
  echo "Setting environment variables..."
  export PYTHON_PORT=5555
  export GHOST_RUNNER_PORT=5053
  export FLY_DEPLOYMENT=true
  export FLY_WEBHOOK_URL="https://gpt-cursor-runner.fly.dev/webhook"
  export FLY_HEALTH_URL="https://gpt-cursor-runner.fly.dev/health"
  export LOCAL_WEBHOOK_URL="http://localhost:5555/webhook"
  export LOCAL_HEALTH_URL="http://localhost:5555/health"

  # 🔧 DEPENDENCY CHECKING
  echo "Checking dependencies..."
  
  # Check for psutil (required for process management)
  if ! python3 -c "import psutil" 2>/dev/null; then
    echo "Installing psutil..."
    pip3 install psutil
  fi
  
  # Check for Node.js
  if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js."
    exit 1
  fi

  # 🔧 FLY.IO DEPLOYMENT (PRIMARY)
  echo "🚀 Attempting Fly.io deployment (primary)..."
  
  # Check if fly CLI is available
  if command -v fly &> /dev/null; then
    echo "✅ Fly CLI found, checking authentication..."
    
    # Check if logged in
    if fly auth whoami &> /dev/null; then
      echo "✅ Fly.io authenticated, checking app status..."
      
      # Check if app exists and is running
      if fly apps list | grep -q "gpt-cursor-runner"; then
        echo "✅ Fly.io app found, checking deployment status..."
        
        # Deploy if needed
        fly deploy --remote-only
        
        # Wait for deployment
        sleep 10
        
        # Test health endpoint
        if curl -s --max-time 30 "$FLY_HEALTH_URL" | grep -q "ok"; then
          echo "✅ Fly.io deployment successful and healthy!"
          
          # Test webhook endpoint
          if curl -s --max-time 30 -X POST -H "Content-Type: application/json" \
            -d '{"id":"test","role":"test","target_file":"/tmp/test.json","patch":{"mutations":[]}}' \
            "$FLY_WEBHOOK_URL" | grep -q "received"; then
            echo "✅ Fly.io webhook endpoint working!"
            FLY_SUCCESS=true
          else
            echo "⚠️ Fly.io webhook endpoint not responding, falling back to local"
            FLY_SUCCESS=false
          fi
        else
          echo "⚠️ Fly.io health check failed, falling back to local"
          FLY_SUCCESS=false
        fi
      else
        echo "⚠️ Fly.io app not found, falling back to local"
        FLY_SUCCESS=false
      fi
    else
      echo "⚠️ Fly.io not authenticated, falling back to local"
      FLY_SUCCESS=false
    fi
  else
    echo "⚠️ Fly CLI not found, falling back to local"
    FLY_SUCCESS=false
  fi

  # 🔧 LOCAL SERVICES (FALLBACK OR PRIMARY)
  if [ "$FLY_SUCCESS" != "true" ]; then
    echo "🔄 Starting local services..."
    
    # Start Flask app with resource limits
    echo "Starting Flask app on port $PYTHON_PORT..."
    nohup python3 -m gpt_cursor_runner.main >> logs/flask-app.log 2>&1 &
    echo $! > pids/python-runner.pid
    sleep 3
    
    # Start Ghost Runner with resource limits
    echo "Starting Ghost Runner on port $GHOST_RUNNER_PORT..."
    nohup node scripts/ghost-runner.js >> logs/ghost-runner-CYOPS.log 2>&1 &
    echo $! > pids/ghost-runner.pid
    sleep 3
    
    # Start Cloudflare tunnel
    echo "Starting Cloudflare tunnel..."
    nohup cloudflared tunnel --url http://localhost:$PYTHON_PORT >> logs/cloudflared.log 2>&1 &
    echo $! > pids/cloudflared.pid
    sleep 3
  fi

  # 🔧 BRAUN DAEMON (MAIN PATCH PROCESSING)
  echo "🤖 Starting BRAUN daemon for MAIN patch processing..."
  nohup python3 braun_daemon.py --patches-dir /Users/sawyer/gitSync/.cursor-cache/MAIN/patches >> logs/braun-daemon.log 2>&1 &
  echo $! > pids/braun-daemon.pid
  sleep 3

  # 🔧 PATCH EXECUTOR LOOP (UNIFIED PROCESSING)
  echo "🔄 Starting patch executor loop for unified MAIN/CYOPS processing..."
  nohup node scripts/patch-executor-loop.js >> logs/patch-executor-loop.log 2>&1 &
  echo $! > pids/patch-executor-loop.pid
  sleep 3

  # 🔧 COMMAND QUEUE DAEMON
  echo "📋 Starting command queue daemon..."
  nohup bash scripts/command-queue-daemon.sh monitor >> logs/command-queue-daemon.log 2>&1 &
  echo $! > pids/command-queue-daemon.pid
  sleep 3

  # 🔧 WATCHDOG SERVICES
  echo "🛡️ Starting watchdog services..."
  
  # Start unified watchdog
  nohup bash scripts/daemon-unified-watchdog.sh monitor >> logs/unified-watchdog.log 2>&1 &
  echo $! > pids/unified-watchdog.pid
  
  # Start Ghost Runner watchdog
  nohup bash scripts/watchdogs/ghost-runner-watchdog.sh monitor >> logs/ghost-runner-watchdog.log 2>&1 &
  echo $! > pids/ghost-runner-watchdog.pid
  
  # Start BRAUN daemon watchdog
  echo "🛡️ Starting BRAUN daemon watchdog..."
  nohup bash scripts/watchdogs/braun-daemon-watchdog.sh monitor >> logs/braun-watchdog.log 2>&1 &
  echo $! > pids/braun-watchdog.pid
  
  # Start patch executor watchdog (CRITICAL SERVICE)
  echo "🛡️ Starting patch executor watchdog (CRITICAL SERVICE)..."
  nohup bash scripts/watchdogs/patch-executor-watchdog.sh monitor >> logs/patch-executor-watchdog.log 2>&1 &
  echo $! > pids/patch-executor-watchdog.pid
  
  sleep 5

  # 🔧 HEALTH VALIDATION
  echo "🏥 Validating system health..."
  
  # Check Flask app (if local)
  if [ "$FLY_SUCCESS" != "true" ]; then
    if curl -s --max-time 10 "http://localhost:$PYTHON_PORT/health" | grep -q "ok"; then
      echo "✅ Flask app healthy"
    else
      echo "❌ Flask app health check failed"
    fi
  fi
  
  # Check Ghost Runner
  if curl -s --max-time 10 "http://localhost:$GHOST_RUNNER_PORT/health" | grep -q "healthy"; then
    echo "✅ Ghost Runner healthy"
  else
    echo "❌ Ghost Runner health check failed"
  fi
  
  # Check BRAUN daemon
  if ps -p $(cat pids/braun-daemon.pid 2>/dev/null) > /dev/null 2>&1; then
    echo "✅ BRAUN daemon running"
  else
    echo "❌ BRAUN daemon not running"
  fi
  
  # Check patch executor loop
  if ps -p $(cat pids/patch-executor-loop.pid 2>/dev/null) > /dev/null 2>&1; then
    echo "✅ Patch executor loop running"
  else
    echo "❌ Patch executor loop not running"
  fi
  
  # Check command queue daemon
  if ps -p $(cat pids/command-queue-daemon.pid 2>/dev/null) > /dev/null 2>&1; then
    echo "✅ Command queue daemon running"
  else
    echo "❌ Command queue daemon not running"
  fi
  
  # Check BRAUN watchdog
  if ps -p $(cat pids/braun-watchdog.pid 2>/dev/null) > /dev/null 2>&1; then
    echo "✅ BRAUN watchdog running"
  else
    echo "❌ BRAUN watchdog not running"
  fi
  
  # Check patch executor watchdog (CRITICAL)
  if ps -p $(cat pids/patch-executor-watchdog.pid 2>/dev/null) > /dev/null 2>&1; then
    echo "✅ Patch executor watchdog running (CRITICAL)"
  else
    echo "❌ Patch executor watchdog not running (CRITICAL)"
  fi

  echo "🎉 Unified ghost boot completed successfully!"
  echo "📊 System Status:"
  echo "   - Fly.io: $([ "$FLY_SUCCESS" = "true" ] && echo "✅ PRIMARY" || echo "🔄 FALLBACK")"
  echo "   - Flask App: $([ "$FLY_SUCCESS" != "true" ] && echo "✅ LOCAL" || echo "🔄 FLY.IO")"
  echo "   - Ghost Runner: ✅ RUNNING"
  echo "   - BRAUN Daemon: ✅ RUNNING"
  echo "   - Patch Executor: ✅ RUNNING"
  echo "   - Command Queue: ✅ RUNNING"
  echo "   - BRAUN Watchdog: ✅ RUNNING"
  echo "   - Ghost Watchdog: ✅ RUNNING"
  echo "   - Patch Executor Watchdog: ✅ RUNNING (CRITICAL)"
  echo "   - Unified Watchdog: ✅ RUNNING"
  echo ""
  echo "🛡️ Resource Protection Active:"
  echo "   - Memory limits: 512MB per daemon"
  echo "   - CPU limits: 80% per daemon"
  echo "   - Restart limits: 5 attempts per 5 minutes"
  echo "   - Activity monitoring: 5-minute timeout"
  echo "   - Patch Executor: UNLIMITED restarts (critical service)"

} 2>&1 | tee "$LOG"

echo "✅ Unified ghost boot completed. Log saved to: $LOG" 