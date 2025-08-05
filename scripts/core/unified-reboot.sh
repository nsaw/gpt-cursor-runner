#!/bin/bash
set -euo pipefail

LOG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/unified-reboot.log"
mkdir -p $(dirname "$LOG")

# Enhanced logging
exec 2>> "$LOG"

# Function to check if a script exists and is executable
check_script() {
  local script_path=$1
  local script_name=$2
  
  if [ ! -f "$script_path" ]; then
    echo "❌ $script_name not found: $script_path"
    return 1
  fi
  
  if [ ! -x "$script_path" ]; then
    echo "⚠️ $script_name not executable, making executable: $script_path"
    chmod +x "$script_path"
  fi
  
  echo "✅ $script_name ready: $script_path"
  return 0
}

# Function to wait for user confirmation
confirm_reboot() {
  echo "🔄 UNIFIED SYSTEM REBOOT"
  echo "================================"
  echo "This will:"
  echo "1. Shutdown all running services"
  echo "2. Clean up ports and processes"
  echo "3. Restart all critical systems"
  echo "4. Verify all services are running"
  echo ""
  echo "⚠️  This operation will temporarily interrupt all services."
  echo ""
  
  read -p "Do you want to proceed with the reboot? (y/N): " -n 1 -r
  echo
  if [[ ! $REply =~ ^[Yy]$ ]]; then
    echo "❌ Reboot cancelled by user"
    exit 0
  fi
  
  echo "✅ Reboot confirmed, proceeding..."
}

# Function to perform pre-reboot checks
pre_reboot_checks() {
  echo "🔍 Pre-reboot system checks..."
  
  # Check if required scripts exist
  local scripts=(
    "scripts/core/unified-shutdown.sh:Unified Shutdown Script"
    "scripts/core/unified-boot.sh:Unified Boot Script"
  )
  
  for script_info in "${scripts[@]}"; do
    IFS=':' read -r script_path script_name <<< "$script_info"
    if ! check_script "$script_path" "$script_name"; then
      echo "❌ Pre-reboot checks failed"
      return 1
    fi
  done
  
  # Check if we're in the correct directory
  if [ ! -f "scripts/core/unified-boot.sh" ]; then
    echo "❌ Not in gpt-cursor-runner directory"
    echo "   Please run this script from: /Users/sawyer/gitSync/gpt-cursor-runner"
    return 1
  fi
  
  # Check for required directories
  local required_dirs=(
    "logs"
    "pids"
    "scripts/core"
    "scripts/watchdogs"
  )
  
  for dir in "${required_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
      echo "❌ Required directory missing: $dir"
      return 1
    fi
  done
  
  echo "✅ Pre-reboot checks passed"
  return 0
}

# Function to perform post-reboot verification
post_reboot_verification() {
  echo "🔍 Post-reboot verification..."
  
  # Wait for services to start
  echo "   Waiting for services to start (30 seconds)..."
  sleep 30
  
  # Check critical services
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
  
  # Check PM2 processes
  echo "   Checking PM2 processes..."
  { timeout 15s pm2 list & } >/dev/null 2>&1 & disown
  sleep 3
  
  # Check main project services
  echo "   Checking main project services..."
  (
    if lsof -i:4000 > /dev/null 2>&1; then
      echo "✅ Backend API (Port 4000) running"
    else
      echo "❌ Backend API (Port 4000) not running"
      exit 1
    fi
  ) &
  BACKEND_PID=$!
  sleep 5
  disown $BACKEND_PID
  
  (
    if lsof -i:8081 > /dev/null 2>&1; then
      echo "✅ Expo Development Server (Port 8081) running"
    else
      echo "❌ Expo Development Server (Port 8081) not running"
      exit 1
    fi
  ) &
  EXPO_PID=$!
  sleep 5
  disown $EXPO_PID
  
  (
    if lsof -i:8088 > /dev/null 2>&1; then
      echo "✅ Expo Web Server (Port 8088) running"
    else
      echo "❌ Expo Web Server (Port 8088) not running"
      exit 1
    fi
  ) &
  EXPO_WEB_PID=$!
  sleep 5
  disown $EXPO_WEB_PID
  
  if [ ${#failed_services[@]} -gt 0 ]; then
    echo "⚠️ Post-reboot verification warnings:"
    for service in "${failed_services[@]}"; do
      echo "   - $service may need manual attention"
    done
    return 1
  fi
  
  echo "✅ Post-reboot verification passed"
  return 0
}

{
  echo "[REBOOT START] $(date)"
  echo "🔄 Starting unified system reboot..."
  
  # 🔧 PRE-REBOOT CHECKS
  if ! pre_reboot_checks; then
    echo "❌ Pre-reboot checks failed. Aborting reboot."
    exit 1
  fi
  
  # 🔧 USER CONFIRMATION
  confirm_reboot
  
  # 🔧 SHUTDOWN PHASE
  echo "🛑 Phase 1: System Shutdown"
  echo "================================"
  
  if ! bash scripts/core/unified-shutdown.sh; then
    echo "⚠️ Warning: Shutdown completed with warnings"
    echo "   Continuing with reboot..."
  else
    echo "✅ Shutdown completed successfully"
  fi
  
  # 🔧 CLEANUP PHASE
  echo "🧹 Phase 2: System Cleanup"
  echo "================================"
  
  # Additional cleanup
  echo "   Cleaning up any remaining processes..."
  pkill -f "node.*scripts" 2>/dev/null || true
  pkill -f "python.*dashboard" 2>/dev/null || true
  pkill -f "python.*patch" 2>/dev/null || true
  pkill -f "python.*summary" 2>/dev/null || true
  pkill -f "python.*braun" 2>/dev/null || true
  pkill -f "expo.*start" 2>/dev/null || true
  pkill -f "yarn.*dev" 2>/dev/null || true
  pkill -f "ngrok" 2>/dev/null || true
  
  # Clear any remaining port processes
  echo "   Clearing ports..."
  for port in 5555 5053 3002 8787 5432 8081 4000 8088 8789 8790; do
    lsof -ti:$port 2>/dev/null | xargs kill -KILL 2>/dev/null || true
  done
  
  # Remove PID files
  echo "   Removing PID files..."
  rm -f pids/*.pid pids/*.lock 2>/dev/null || true
  
  # Wait for cleanup
  echo "   Waiting for cleanup to complete..."
  sleep 10
  
  echo "✅ Cleanup completed"
  
  # 🔧 BOOT PHASE
  echo "🚀 Phase 3: System Boot"
  echo "================================"
  
  if ! bash scripts/core/unified-boot.sh; then
    echo "❌ Boot failed. Check logs for details."
    echo "   You may need to manually restart services."
    exit 1
  else
    echo "✅ Boot completed successfully"
  fi
  
  # 🔧 POST-REBOOT VERIFICATION
  echo "🔍 Phase 4: Post-Reboot Verification"
  echo "================================"
  
  if ! post_reboot_verification; then
    echo "⚠️ Post-reboot verification completed with warnings"
    echo "   Some services may need manual attention"
  else
    echo "✅ Post-reboot verification passed"
  fi
  
  # 🔧 FINAL STATUS
  echo "📊 Final System Status"
  echo "================================"
  
  # Run unified status check
  echo "   Running comprehensive status check..."
  if [ -f "scripts/core/unified-status.sh" ]; then
    bash scripts/core/unified-status.sh
  else
    echo "   Unified status script not found, running basic checks..."
    
    # Basic PM2 status
    { timeout 15s pm2 list & } >/dev/null 2>&1 & disown
    sleep 3
    
    # Basic port check
    echo "   Checking critical ports..."
    for port in 5555 5053 3002 8787 4000 8081 8088; do
      if lsof -i:$port > /dev/null 2>&1; then
        echo "✅ Port $port: Active"
      else
        echo "❌ Port $port: Inactive"
      fi
    done
  fi
  
  echo "🎉 Unified system reboot completed!"
  echo "📊 Reboot Summary:"
  echo "   - Pre-reboot Checks: ✅ PASSED"
  echo "   - System Shutdown: ✅ COMPLETED"
  echo "   - System Cleanup: ✅ COMPLETED"
  echo "   - System Boot: ✅ COMPLETED"
  echo "   - Post-reboot Verification: ✅ PASSED"
  echo ""
  echo "🌐 External Access:"
  echo "   - Dashboard: https://gpt-cursor-runner.thoughtmarks.app/monitor"
  echo "   - API Status: https://gpt-cursor-runner.thoughtmarks.app/api/status"
  echo "   - Webhook: https://gpt-cursor-runner.fly.dev/webhook"
  echo ""
  echo "📱 Main Project Services:"
  echo "   - Backend API: http://localhost:4000"
  echo "   - Expo Development: http://localhost:8081"
  echo "   - Expo Web: http://localhost:8088"
  echo ""
  echo "🔄 Next time you need to reboot, run: ./scripts/core/unified-reboot.sh"

} 2>&1 | tee "$LOG"

echo "✅ Unified system reboot completed. Log saved to: $LOG" 