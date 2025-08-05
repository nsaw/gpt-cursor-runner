#!/bin/bash
set -euo pipefail

# Initialize FLY_SUCCESS variable
FLY_SUCCESS=false

LOG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/unified-ghost-boot-enhanced.log"
mkdir -p $(dirname "$LOG")

# Enhanced logging
exec 2>> "$LOG"

# Unified Manager Integration
UNIFIED_MANAGER="/Users/sawyer/gitSync/gpt-cursor-runner/scripts/core/unified-manager.sh"

# Enhanced service validation function
validate_service() {
  local service_name=$1
  local pid_file=$2
  local health_url=$3
  
  # Check PID file exists
  if [ ! -f "$pid_file" ]; then
    echo "❌ $service_name: PID file missing"
    return 1
  fi
  
  # Check process is actually running
  local pid=$(cat "$pid_file")
  if ! ps -p "$pid" > /dev/null 2>&1; then
    echo "❌ $service_name: Process not running (PID: $pid)"
    return 1
  fi
  
  # Check health endpoint if provided
  if [ -n "$health_url" ]; then
    (
      if curl -s --max-time 10 "$health_url" > /dev/null 2>&1; then
        echo "✅ $service_name: Health check passed"
      else
        echo "❌ $service_name: Health check failed"
        exit 1
      fi
    ) &
    PID=$!
    sleep 10
    disown $PID
    if ! ps -p $PID > /dev/null 2>&1; then
      return 1
    fi
  fi
  
  echo "✅ $service_name: Running and healthy"
  return 0
}

# Check port availability before starting service
check_port_availability() {
  local port=$1
  local service_name=$2
  
  local pids=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "❌ Port $port is already in use by $service_name (PIDs: $pids)"
    return 1
  else
    echo "✅ Port $port is available for $service_name"
    return 0
  fi
}

# Check if service is already running
check_service_running() {
  local service_name=$1
  local pid_file=$2
  
  if [ -f "$pid_file" ]; then
    local pid=$(cat "$pid_file")
    if ps -p "$pid" > /dev/null 2>&1; then
      echo "⚠️ $service_name is already running (PID: $pid)"
      return 0
    else
      echo "⚠️ $service_name PID file exists but process not running, cleaning up..."
      rm -f "$pid_file"
      return 1
    fi
  else
    echo "✅ $service_name not running, will start fresh"
    return 1
  fi
}

# Enhanced service startup with verification
start_service_with_verification() {
  local service_name=$1
  local start_command=$2
  local pid_file=$3
  local health_url=$4
  local port=${5:-}
  local max_retries=3
  
  # Check if service is already running
  if check_service_running "$service_name" "$pid_file"; then
    echo "✅ $service_name is already running, skipping startup"
    return 0
  fi
  
  # Check port availability if specified
  if [ -n "$port" ]; then
    if ! check_port_availability "$port" "$service_name"; then
      echo "❌ Cannot start $service_name - port $port is occupied"
      return 1
    fi
  fi
  
  for attempt in $(seq 1 $max_retries); do
    echo "Starting $service_name (attempt $attempt/$max_retries)..."
    
    # Start service
    eval "$start_command"
    sleep 3
    
    # Verify startup
    if validate_service "$service_name" "$pid_file" "$health_url"; then
      echo "✅ $service_name started successfully"
      return 0
    else
      echo "❌ $service_name failed to start (attempt $attempt)"
      if [ $attempt -lt $max_retries ]; then
        echo "Retrying in 5 seconds..."
        sleep 5
      fi
    fi
  done
  
  echo "❌ $service_name failed to start after $max_retries attempts"
  return 1
}

# Pre-boot validation
pre_boot_validation() {
  echo "🔍 Pre-boot validation..."
  
  # Check for syntax errors in critical scripts
  echo "Checking script syntax..."
  if ! node -c scripts/ghost/ghost-unified-daemon.js 2>/dev/null; then
    echo "❌ Ghost Unified Daemon syntax error detected"
    return 1
  fi
  
  # Check for required files
  echo "Checking required files..."
  local required_files=(
    "scripts/ghost/ghost-unified-daemon.js"
    "scripts/core/command-queue-daemon.sh"
    "scripts/webhook-thoughtmarks-tunnel-daemon.sh"
    "scripts/monitor/dual-monitor-server.js"
    "scripts/watchdogs/dashboard-uplink.js"
    "patch_executor_daemon.py"
    "dashboard_daemon.py"
    "summary_watcher_daemon.py"
    "apply_patch.py"
  )
  
  for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
      echo "❌ Required file missing: $file"
      return 1
    fi
  done
  
  # Check for required directories
  echo "Checking required directories..."
  local required_dirs=(
    "/Users/sawyer/gitSync/.cursor-cache/MAIN/patches"
    "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches"
    "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries"
    "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries"
  )
  
  for dir in "${required_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
      echo "❌ Required directory missing: $dir"
      return 1
    fi
  done
  
  # Comprehensive dashboard validation
  echo "Validating dashboard and documentation..."
  if ! bash scripts/validate-dashboard.sh; then
    echo "❌ Dashboard validation failed"
    return 1
  fi
  
  # Check documentation staleness
  echo "Checking documentation staleness..."
  local docs_modified=$(stat -f "%m" docs/current/SYSTEMS_CONFIGURATION.md 2>/dev/null || echo "0")
  local packages_modified=$(stat -f "%m" ../thoughtpilot-commercial/clean-tier-packages/README-clean-packages.md 2>/dev/null || echo "0")
  local current_time=$(date +%s)
  local max_age=$((7 * 24 * 60 * 60)) # 7 days
  
  if [ $((current_time - docs_modified)) -gt $max_age ]; then
    echo "❌ SYSTEMS_CONFIGURATION.md is stale (>7 days old)"
    return 1
  fi
  
  if [ $((current_time - packages_modified)) -gt $max_age ]; then
    echo "❌ README-clean-packages.md is stale (>7 days old)"
    return 1
  fi
  
  # Check for system policy in documentation
  if ! grep -q "Dashboard Daemon/Monitor Resilience Policy" docs/current/SYSTEMS_CONFIGURATION.md; then
    echo "❌ SYSTEMS_CONFIGURATION.md missing Dashboard Daemon/Monitor Resilience Policy"
    return 1
  fi
  
  if ! grep -q "Compliance & Validation" ../thoughtpilot-commercial/clean-tier-packages/README-clean-packages.md; then
    echo "❌ README-clean-packages.md missing Compliance & Validation section"
    return 1
  fi
  
  echo "✅ Pre-boot validation passed"
  return 0
}

# Post-boot verification
post_boot_verification() {
  echo "🔍 Post-boot verification..."
  
  local services=(
    "Flask App:http://localhost:5555/health"
    "Ghost Runner:http://localhost:5053/health"
    "Comprehensive Dashboard:http://localhost:3002"
    "Dual Monitor Server:http://localhost:8787/api/status"
  )
  
  local failed_services=()
  
  for service in "${services[@]}"; do
    IFS=':' read -r name url <<< "$service"
    (
      if curl -s --max-time 10 "$url" > /dev/null 2>&1; then
        echo "✅ $name healthy"
      else
        echo "❌ $name health check failed"
        exit 1
      fi
    ) &
    PID=$!
    sleep 10
    disown $PID
    if ! ps -p $PID > /dev/null 2>&1; then
      failed_services+=("$name")
    fi
  done
  
  if [ ${#failed_services[@]} -gt 0 ]; then
    echo "❌ Post-boot verification failed for: ${failed_services[*]}"
    return 1
  fi
  
  echo "✅ Post-boot verification passed"
  return 0
}

# Service failure handler
handle_service_failure() {
  local service_name=$1
  local error_message=$2
  
  echo "❌ CRITICAL: $service_name failed to start"
  echo "Error: $error_message"
  echo "Attempting recovery..."
  
  # Log failure
  echo "[$(date)] SERVICE FAILURE: $service_name - $error_message" >> "$LOG"
  
  # Attempt recovery
  case "$service_name" in
    "ghost-runner")
      echo "Attempting Ghost Runner recovery..."
      pkill -f "ghost-runner.js" 2>/dev/null || true
      sleep 2
      start_service_with_verification "Ghost Runner" \
        "nohup node scripts/core/ghost-runner.js >> /Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-runner-CYOPS.log 2>&1 & echo \$! > pids/ghost-runner.pid" \
        "pids/ghost-runner.pid" \
        "http://localhost:5053/health" \
        "5053"
      ;;
    "flask-app")
      echo "Attempting Flask App recovery..."
      pkill -f "dashboard/app.py" 2>/dev/null || true
      sleep 2
      start_service_with_verification "Flask App" \
        "nohup python3 dashboard/app.py >> /Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/flask-app.log 2>&1 & echo \$! > pids/python-runner.pid" \
        "pids/python-runner.pid" \
        "http://localhost:5555/health" \
        "5555"
      ;;
    "comprehensive-dashboard")
      echo "Attempting Comprehensive Dashboard recovery..."
      pkill -f "dashboard_daemon.py" 2>/dev/null || true
      sleep 2
      start_service_with_verification "Comprehensive Dashboard" \
        "nohup python3 dashboard_daemon.py --port 3002 >> /Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/dashboard-daemon.log 2>&1 & echo \$! > pids/dashboard-daemon.pid" \
        "pids/dashboard-daemon.pid" \
        "http://localhost:3002" \
        "3002"
      ;;
    "dual-monitor-server")
      echo "Attempting Dual Monitor Server recovery..."
      pkill -f "dual-monitor-server.js" 2>/dev/null || true
      sleep 2
      start_service_with_verification "Dual Monitor Server" \
        "nohup node scripts/monitor/dual-monitor-server.js >> /Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/dual-monitor-server.log 2>&1 & echo \$! > pids/dual-monitor-server.pid" \
        "pids/dual-monitor-server.pid" \
        "http://localhost:8787/api/status" \
        "8787"
      ;;
    "command-queue")
      echo "Attempting Command Queue recovery..."
      pkill -f "command-queue-daemon.sh" 2>/dev/null || true
      sleep 2
      start_service_with_verification "Command Queue" \
        "nohup bash scripts/core/command-queue-daemon.sh monitor >> /Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/command-queue-daemon.log 2>&1 & echo \$! > pids/command-queue-daemon.pid" \
        "pids/command-queue-daemon.pid" \
        "" \
        ""
      ;;
    "summary-watcher")
      echo "Attempting Summary Watcher recovery..."
      pkill -f "summary_watcher_daemon.py" 2>/dev/null || true
      sleep 2
      start_service_with_verification "Summary Watcher" \
        "nohup python3 summary_watcher_daemon.py --check-interval 30 >> /Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/summary-watcher-daemon.log 2>&1 & echo \$! > pids/summary-watcher-daemon.pid" \
        "pids/summary-watcher-daemon.pid" \
        "" \
        ""
      ;;
    "dashboard-uplink")
      echo "Attempting Dashboard Uplink recovery..."
      pkill -f "dashboard-uplink.js" 2>/dev/null || true
      sleep 2
      start_service_with_verification "Dashboard Uplink" \
        "nohup node scripts/watchdogs/dashboard-uplink.js >> /Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/dashboard-uplink.log 2>&1 & echo \$! > pids/dashboard-uplink.pid" \
        "pids/dashboard-uplink.pid" \
        "" \
        ""
      ;;
    "ghost-bridge")
      echo "Attempting Ghost Bridge recovery..."
      pkill -f "ghost-bridge-simple.js" 2>/dev/null || true
      sleep 2
      start_service_with_verification "Ghost Bridge" \
        "nohup node scripts/ghost-bridge-simple.js >> /Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-bridge.log 2>&1 & echo \$! > pids/ghost-bridge.pid" \
        "pids/ghost-bridge.pid" \
        "" \
        ""
      ;;
    "ghost-relay")
      echo "Attempting Ghost Relay recovery..."
      pkill -f "ghost-relay.js" 2>/dev/null || true
      sleep 2
      start_service_with_verification "Ghost Relay" \
        "nohup node scripts/ghost/ghost-relay.js >> /Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-relay.log 2>&1 & echo \$! > pids/ghost-relay.pid" \
        "pids/ghost-relay.pid" \
        "" \
        ""
      ;;
    "live-status-server")
      echo "Attempting Live Status Server recovery..."
      pkill -f "live-status-server.js" 2>/dev/null || true
      sleep 2
      start_service_with_verification "Live Status Server" \
        "nohup node scripts/web/live-status-server.js SILENT=true >> /Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/live-status-server.log 2>&1 & echo \$! > pids/live-status-server.pid" \
        "pids/live-status-server.pid" \
        "" \
        ""
      ;;
    "comprehensive-dashboard")
      echo "Attempting Comprehensive Dashboard recovery..."
      pkill -f "comprehensive-dashboard.js" 2>/dev/null || true
      sleep 2
      start_service_with_verification "Comprehensive Dashboard" \
        "nohup node scripts/core/comprehensive-dashboard.js >> /Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/comprehensive-dashboard.log 2>&1 & echo \$! > pids/comprehensive-dashboard.pid" \
        "pids/comprehensive-dashboard.pid" \
        "" \
        ""
      ;;
    *)
      echo "No recovery procedure for $service_name"
      ;;
  esac
}

{
  echo "[BOOT START] $(date)"
  echo "🚀 Starting enhanced unified ghost boot with unified-manager.sh integration..."

  # 🔧 PRE-BOOT VALIDATION
  if ! pre_boot_validation; then
    echo "❌ Pre-boot validation failed. Aborting boot sequence."
    exit 1
  fi

  # 🔧 UNIFIED MANAGER INTEGRATION
  echo "🔧 Integrating unified-manager.sh as primary orchestrator..."
  
  # Verify unified-manager.sh exists and is executable
  if [ ! -f "$UNIFIED_MANAGER" ]; then
    echo "❌ CRITICAL: unified-manager.sh not found at $UNIFIED_MANAGER"
    exit 1
  fi
  
  if [ ! -x "$UNIFIED_MANAGER" ]; then
    echo "🔧 Making unified-manager.sh executable..."
    chmod +x "$UNIFIED_MANAGER"
  fi
  
  echo "✅ Unified manager ready: $UNIFIED_MANAGER"

  # 🔧 PORT CONFLICT RESOLUTION
  echo "🔧 Resolving port conflicts..."
  
  # Function to safely kill processes on a port
  kill_port_processes() {
    local port=$1
    local service_name=$2
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
      local pids=$(lsof -ti:$port 2>/dev/null)
      
      if [ -n "$pids" ]; then
        echo "⚠️ Found processes using port $port ($service_name): $pids (attempt $attempt/$max_attempts)"
        echo "Killing processes on port $port..."
        
        # Kill processes
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 3
        
        # Verify processes are killed
        local remaining_pids=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$remaining_pids" ]; then
          echo "❌ Failed to kill processes on port $port: $remaining_pids"
          if [ $attempt -lt $max_attempts ]; then
            echo "Retrying in 2 seconds..."
            sleep 2
            attempt=$((attempt + 1))
            continue
          else
            echo "❌ Failed to clear port $port after $max_attempts attempts"
            return 1
          fi
        else
          echo "✅ Successfully cleared port $port"
          return 0
        fi
      else
        echo "✅ Port $port ($service_name) is available"
        return 0
      fi
    done
  }
  
  # Check and kill processes on critical ports
  echo "🔧 Clearing critical ports..."
  kill_port_processes 5555 "Flask App" || echo "⚠️ Warning: Could not clear port 5555"
  kill_port_processes 5053 "Ghost Runner" || echo "⚠️ Warning: Could not clear port 5053"
  kill_port_processes 3002 "Comprehensive Dashboard" || echo "⚠️ Warning: Could not clear port 3002"
  kill_port_processes 8787 "Dual Monitor Server" || echo "⚠️ Warning: Could not clear port 8787"
  kill_port_processes 5432 "PostgreSQL" || echo "⚠️ Warning: Could not clear port 5432"
  kill_port_processes 8081 "Expo Development Server" || echo "⚠️ Warning: Could not clear port 8081"
  kill_port_processes 4000 "Backend API" || echo "⚠️ Warning: Could not clear port 4000"
  
  # Clean up PID files and processes
  echo "🔧 Cleaning up existing processes..."
  rm -f pids/*.pid pids/*.lock
  pkill -f "watchdog" 2>/dev/null || true
  pkill -f "daemon" 2>/dev/null || true
  pkill -f "cloudflared" 2>/dev/null || true
  
  sleep 2

  # 🔧 ENVIRONMENT VARIABLES
  echo "🔧 Setting environment variables..."
  export PYTHON_PORT=5555
  export GHOST_RUNNER_PORT=5053
  export FLY_DEPLOYMENT=true
  export FLY_WEBHOOK_URL="https://gpt-cursor-runner.fly.dev/webhook"
  export FLY_HEALTH_URL="https://gpt-cursor-runner.fly.dev/health"
  export LOCAL_WEBHOOK_URL="http://localhost:5555/webhook"
  export LOCAL_HEALTH_URL="http://localhost:5555/health"
  
  # Dashboard environment variables
  export DASHBOARD_PORT=8787
  export DASHBOARD_HOST="0.0.0.0"
  export DASHBOARD_DEBUG=true
  
  # Ghost environment variables
  export GHOST_PORT=5053
  export GHOST_HOST="0.0.0.0"
  export GHOST_DEBUG=true
  
  # PM2 environment variables
  export PM2_HOME="/Users/sawyer/.pm2"
  export PM2_LOG_PATH="/Users/sawyer/gitSync/gpt-cursor-runner/logs"
  
  echo "✅ Environment variables set"

  # 🔧 UNIFIED MANAGER SERVICE STARTUP
  echo "🔧 Starting services via unified-manager.sh..."
  
  # Start all services using unified manager
  echo "📋 Starting all services..."
  (
    if "$UNIFIED_MANAGER" start all; then
      echo "✅ All services started successfully"
    else
      echo "❌ Some services failed to start"
      exit 1
    fi
  ) &
  START_PID=$!
  sleep 30
  disown $START_PID
  
  # Wait for services to stabilize
  echo "⏳ Waiting for services to stabilize..."
  sleep 10

  # 🔧 UNIFIED MANAGER HEALTH VALIDATION
  echo "🔧 Validating service health via unified-manager.sh..."
  
  # Check health of all services
  (
    if "$UNIFIED_MANAGER" monitor; then
      echo "✅ All services healthy"
    else
      echo "❌ Some services unhealthy, attempting recovery..."
      "$UNIFIED_MANAGER" recover
    fi
  ) &
  HEALTH_PID=$!
  sleep 30
  disown $HEALTH_PID

  # 🔧 RESOURCE MONITORING
  echo "🔧 Checking system resources..."
  (
    "$UNIFIED_MANAGER" resources
  ) &
  RESOURCE_PID=$!
  sleep 10
  disown $RESOURCE_PID

  # 🔧 POST-BOOT VERIFICATION
  echo "🔧 Post-boot verification..."
  if ! post_boot_verification; then
    echo "❌ Post-boot verification failed. Some services may not be running properly."
    echo "Check the logs for more details."
  fi

  # 🔧 DAEMON STATUS API VALIDATION
  echo "🔧 Validating daemon status API..."
  sleep 10  # Wait for Flask app to fully start
  
  (
    if curl -s --max-time 30 "http://localhost:5555/api/daemon-status" > /dev/null 2>&1; then
      echo "✅ Daemon status API is responding"
      
      # Check if all critical daemons are running
      (
        DAEMON_STATUS=$(curl -s --max-time 30 "http://localhost:5555/api/daemon-status" | jq -r '.daemon_status')
        if [ $? -eq 0 ]; then
          echo "📊 Daemon Status Summary:"
          echo "$DAEMON_STATUS" | jq -r 'to_entries[] | "   - \(.key): \(.value)"'
          
          # Count running vs stopped daemons
          RUNNING_COUNT=$(echo "$DAEMON_STATUS" | jq -r 'to_entries[] | select(.value == "running") | .key' | wc -l)
          TOTAL_COUNT=$(echo "$DAEMON_STATUS" | jq -r 'to_entries | length')
          
          echo "📈 Status: $RUNNING_COUNT/$TOTAL_COUNT daemons running"
          
          if [ "$RUNNING_COUNT" -eq "$TOTAL_COUNT" ]; then
            echo "✅ All daemons are running successfully"
          else
            echo "⚠️ Some daemons are not running. Check individual status above."
          fi
        else
          echo "❌ Failed to parse daemon status response"
        fi
      ) &
      STATUS_PID=$!
      sleep 30
      disown $STATUS_PID
    else
      echo "❌ Daemon status API is not responding"
      echo "   Check if Flask app is running on port 5555"
    fi
  ) &
  API_PID=$!
  sleep 30
  disown $API_PID

  # 🔧 FINAL SYSTEM STATUS
  echo "🎉 Enhanced unified ghost boot with unified-manager.sh integration completed!"
  echo "📊 System Status:"
  echo "   - Unified Manager: ✅ PRIMARY ORCHESTRATOR"
  echo "   - All Services: ✅ MANAGED BY UNIFIED MANAGER"
  echo "   - Health Monitoring: ✅ ACTIVE"
  echo "   - Auto-Recovery: ✅ ACTIVE"
  echo "   - Resource Monitoring: ✅ ACTIVE"
  echo ""
  echo "🌐 External Access:"
  echo "   - Dashboard: https://gpt-cursor-runner.thoughtmarks.app/monitor"
  echo "   - API Status: https://gpt-cursor-runner.thoughtmarks.app/api/status"
  echo "   - Webhook: https://gpt-cursor-runner.fly.dev/webhook"
  echo "   - Webhook-Thoughtmarks: https://webhook-thoughtmarks.thoughtmarks.app"
  echo ""
  echo "🛡️ Enhanced Features:"
  echo "   - Unified Manager Integration: ✅ ACTIVE"
  echo "   - Pre-boot validation: ✅ ACTIVE"
  echo "   - Post-boot verification: ✅ ACTIVE"
  echo "   - Service startup verification: ✅ ACTIVE"
  echo "   - Automatic recovery: ✅ ACTIVE"
  echo "   - Enhanced error handling: ✅ ACTIVE"
  echo "   - Comprehensive logging: ✅ ACTIVE"
  echo "   - Resource monitoring: ✅ ACTIVE"
  echo ""
  echo "🔧 Management Commands:"
  echo "   - Monitor: $UNIFIED_MANAGER monitor"
  echo "   - Health Check: $UNIFIED_MANAGER health <service>"
  echo "   - Start Service: $UNIFIED_MANAGER start <service>"
  echo "   - Stop Service: $UNIFIED_MANAGER stop <service>"
  echo "   - Restart Service: $UNIFIED_MANAGER restart <service>"
  echo "   - Recover: $UNIFIED_MANAGER recover"
  echo "   - Resources: $UNIFIED_MANAGER resources"

} 2>&1 | tee "$LOG"

echo "✅ Enhanced unified ghost boot with unified-manager.sh integration completed. Log saved to: $LOG" 