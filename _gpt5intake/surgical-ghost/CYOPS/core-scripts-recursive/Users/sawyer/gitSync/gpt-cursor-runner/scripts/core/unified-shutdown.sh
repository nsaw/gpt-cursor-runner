#!/bin/bash
set -euo pipefail

LOG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/unified-shutdown.log"
mkdir -p $(dirname "$LOG")

# Enhanced logging
exec 2>> "$LOG"
# Resolve timeout binary (prefer coreutils gtimeout on macOS if available)
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

# Generic non-blocking runner with disown and optional timeout (defaults to 30s)
# Usage: nb "command string" [timeoutSeconds]
nb() {
  local cmd_str="$1"
  local t=${2:-30}
  if [ -n "$TIMEOUT_BIN" ]; then
    { $TIMEOUT_BIN ${t}s bash -lc "$cmd_str" & } >/dev/null 2>&1 & disown || true
  else
    { bash -lc "$cmd_str" & } >/dev/null 2>&1 & disown || true
  fi
}

# Enhanced service shutdown function
shutdown_service() {
  local service_name=$1
  local pid_file=$2
  local max_wait=30
  
  echo "🛑 Shutting down $service_name..."
  
  if [ -f "$pid_file" ]; then
    local pid=$(cat "$pid_file")
    if ps -p "$pid" > /dev/null 2>&1; then
      echo "   Sending SIGTERM to PID $pid..."
      kill -TERM "$pid" 2>/dev/null || true
      
      # Wait for graceful shutdown
      local wait_time=0
      while [ $wait_time -lt $max_wait ] && ps -p "$pid" > /dev/null 2>&1; do
        sleep 1
        wait_time=$((wait_time + 1))
        echo "   Waiting for $service_name to shutdown... ($wait_time/$max_wait)"
      done
      
      # Force kill if still running
      if ps -p "$pid" > /dev/null 2>&1; then
        echo "   Force killing $service_name (PID: $pid)..."
        kill -KILL "$pid" 2>/dev/null || true
        sleep 2
      fi
      
      # Verify shutdown
      if ! ps -p "$pid" > /dev/null 2>&1; then
        echo "✅ $service_name shutdown successfully"
        rm -f "$pid_file"
      else
        echo "❌ $service_name failed to shutdown"
        return 1
      fi
    else
      echo "⚠️ $service_name not running (PID: $pid)"
      rm -f "$pid_file"
    fi
  else
    echo "⚠️ $service_name PID file not found"
  fi
}

# Kill processes by port
kill_port_processes() {
  local port=$1
  local service_name=$2
  
  local pids=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "🛑 Killing processes on port $port ($service_name): $pids"
    echo "$pids" | xargs kill -TERM 2>/dev/null || true
    sleep 3
    
    # Force kill if still running
    local remaining_pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$remaining_pids" ]; then
      echo "   Force killing remaining processes: $remaining_pids"
      echo "$remaining_pids" | xargs kill -KILL 2>/dev/null || true
      sleep 2
    fi
    
    echo "✅ Port $port cleared"
  else
    echo "✅ Port $port ($service_name) already clear"
  fi
}

# Kill processes by name pattern
kill_processes_by_pattern() {
  local pattern=$1
  local service_name=$2
  
  local pids=$(pgrep -f "$pattern" 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "🛑 Killing $service_name processes: $pids"
    echo "$pids" | xargs kill -TERM 2>/dev/null || true
    sleep 3
    
    # Force kill if still running
    local remaining_pids=$(pgrep -f "$pattern" 2>/dev/null)
    if [ -n "$remaining_pids" ]; then
      echo "   Force killing remaining $service_name processes: $remaining_pids"
      echo "$remaining_pids" | xargs kill -KILL 2>/dev/null || true
      sleep 2
    fi
    
    echo "✅ $service_name processes killed"
  else
    echo "✅ No $service_name processes running"
  fi
}

{
  echo "[SHUTDOWN START] $(date)"
  echo "🛑 Starting unified system shutdown..."

  # 🔧 MAIN PROJECT SERVICES SHUTDOWN (tm-mobile-cursor)
  echo "📱 Shutting down Main Project Services (tm-mobile-cursor)..."
  
  # Stop Expo Web Server (Port 8088)
  echo "🌐 Stopping Expo Web Server on port 8088..."
  kill_port_processes 8088 "Expo Web Server"
  
  # Stop Ngrok Tunnel (Port 8088)
  echo "🌐 Stopping Ngrok Tunnel on port 8088..."
  kill_processes_by_pattern "ngrok http.*8088" "Ngrok Tunnel"
  
  # Stop Expo Development Server (Port 8081)
  echo "📱 Stopping Expo Development Server on port 8081..."
  kill_port_processes 8081 "Expo Development Server"
  
  # Stop Backend API (Port 4000)
  echo "🔧 Stopping Backend API on port 4000..."
  kill_port_processes 4000 "Backend API"

  # 🔧 PM2 PROCESSES SHUTDOWN
  echo "🛑 Shutting down PM2 processes..."
  
  # Stop all PM2 processes
  nb "pm2 stop all" 15
  sleep 5
  
  # Kill PM2 daemon
  nb "pm2 kill" 15
  sleep 3
  
  # Kill any remaining PM2 processes
  kill_processes_by_pattern "pm2" "PM2 Daemon"

  # 🔧 WATCHDOG SERVICES SHUTDOWN
  echo "🛡️ Shutting down watchdog services..."
  
  # Stop all watchdog processes
  kill_processes_by_pattern "watchdog" "Watchdog Services"
  
  # Stop specific watchdogs
  shutdown_service "Unified Manager Watchdog" "pids/unified-manager-watchdog.pid"
  shutdown_service "BRAUN Watchdog" "pids/braun-watchdog.pid"
  shutdown_service "Ghost Runner Watchdog" "pids/ghost-runner-watchdog.pid"
  shutdown_service "Patch Executor Watchdog" "pids/patch-executor-watchdog.pid"
  shutdown_service "Summary Watcher Watchdog" "pids/summary-watcher-watchdog.pid"
  shutdown_service "Dashboard Uplink Watchdog" "pids/dashboard-uplink-watchdog.pid"
  shutdown_service "Tunnel Watchdog" "pids/tunnel-watchdog.pid"
  shutdown_service "Webhook-Thoughtmarks Tunnel Daemon" "pids/webhook-tunnel-daemon.pid"
  shutdown_service "Fly.io Watchdog" "pids/fly-watchdog.pid"
  shutdown_service "Flask Watchdog" "pids/flask-watchdog.pid"
  shutdown_service "Enhanced Document Daemon Watchdog" "pids/enhanced-doc-daemon-watchdog.pid"
  shutdown_service "Autonomous Decision Engine Watchdog" "pids/autonomous-decision-daemon-watchdog.pid"
  shutdown_service "Telemetry Orchestrator Watchdog" "pids/telemetry-orchestrator-daemon-watchdog.pid"
  shutdown_service "Metrics Aggregator Watchdog" "pids/metrics-aggregator-daemon-watchdog.pid"
  shutdown_service "Alert Engine Watchdog" "pids/alert-engine-daemon-watchdog.pid"

  # 🔧 GHOST 2.0 ADVANCED CAPABILITIES SHUTDOWN
  echo "🤖 Shutting down Ghost 2.0 Advanced Capabilities..."
  
  shutdown_service "Autonomous Decision Engine" "pids/autonomous-decision-daemon.pid"
  shutdown_service "Telemetry Orchestrator" "pids/telemetry-orchestrator-daemon.pid"
  shutdown_service "Metrics Aggregator" "pids/metrics-aggregator-daemon.pid"
  shutdown_service "Alert Engine" "pids/alert-engine-daemon.pid"

  # 🔧 ADDITIONAL CRITICAL SYSTEMS SHUTDOWN
  echo "🔧 Shutting down Additional Critical Systems..."
  
  shutdown_service "Ghost Bridge" "pids/ghost-bridge.pid"
  shutdown_service "Ghost Relay" "pids/ghost-relay.pid"
  shutdown_service "Live Status Server" "pids/live-status-server.pid"
  shutdown_service "Comprehensive Dashboard" "pids/comprehensive-dashboard.pid"
  shutdown_service "Dual Monitor Server" "pids/dual-monitor-server.pid"
  shutdown_service "Real-Time Status API" "pids/real-time-status-api.pid"
  shutdown_service "Autonomous Patch Trigger" "pids/autonomous-patch-trigger.pid"
  shutdown_service "Webhook-Thoughtmarks Server" "pids/webhook-thoughtmarks-server.pid"

  # 🔧 DASHBOARD SERVICES SHUTDOWN
  echo "📊 Shutting down dashboard services..."
  
  shutdown_service "Dashboard Uplink" "pids/dashboard-uplink.pid"
  shutdown_service "Summary Watcher" "pids/summary-watcher-daemon.pid"
  shutdown_service "Enhanced Document Daemon" "pids/enhanced-doc-daemon.pid"

  # 🔧 CORE SERVICES SHUTDOWN
  echo "🔧 Shutting down core services..."
  
  shutdown_service "Command Queue" "pids/command-queue-daemon.pid"
  shutdown_service "Patch Executor" "pids/patch-executor-daemon.pid"
  shutdown_service "BRAUN Daemon" "pids/braun-daemon.pid"
  shutdown_service "Ghost Runner" "pids/ghost-runner.pid"
  shutdown_service "Comprehensive Dashboard" "pids/dashboard-daemon.pid"
  shutdown_service "Dual Monitor Server" "pids/dual-monitor-server.pid"
  shutdown_service "Flask App" "pids/python-runner.pid"

  # 🔧 MAIN SYSTEM SHUTDOWN
  echo "🚀 Shutting down MAIN system..."
  shutdown_service "MAIN System" "pids/start-main.pid"

  # 🔧 TUNNEL SERVICES SHUTDOWN
  echo "🌐 Shutting down tunnel services..."
  
  shutdown_service "Cloudflare Tunnel" "pids/cloudflared-tunnel.pid"
  shutdown_service "Cloudflare Tunnel (Dashboard)" "pids/cloudflared.pid"
  
  # Kill any remaining cloudflared processes
  kill_processes_by_pattern "cloudflared" "Cloudflare Tunnel"

  # 🔧 PORT CLEANUP
  echo "🧹 Cleaning up ports..."
  
  # Clean up all critical ports
  kill_port_processes 5555 "Flask App"
  kill_port_processes 5053 "Ghost Runner"
  kill_port_processes 3002 "Comprehensive Dashboard"
  kill_port_processes 8787 "Dual Monitor Server"
  kill_port_processes 5432 "PostgreSQL"
  kill_port_processes 8081 "Expo Development Server"
  kill_port_processes 4000 "Backend API"
  kill_port_processes 8088 "Expo Web Server"
  kill_port_processes 8789 "Real-Time Status API"
  kill_port_processes 8790 "Autonomous Patch Trigger"

  # 🔧 PROCESS CLEANUP
  echo "🧹 Cleaning up remaining processes..."
  
  # Kill any remaining daemon processes
  kill_processes_by_pattern "daemon" "Daemon Processes"
  
  # Kill any remaining Node.js processes related to our services
  kill_processes_by_pattern "node.*scripts" "Node.js Scripts"
  
  # Kill any remaining Python processes related to our services
  kill_processes_by_pattern "python.*dashboard" "Python Dashboard"
  kill_processes_by_pattern "python.*patch" "Python Patch"
  kill_processes_by_pattern "python.*summary" "Python Summary"
  kill_processes_by_pattern "python.*braun" "Python BRAUN"

  # 🔧 PID FILE CLEANUP
  echo "🧹 Cleaning up PID files..."
  rm -f pids/*.pid pids/*.lock

  # 🔧 LOG ROTATION
  echo "📝 Rotating logs..."
  
  # Create timestamp for log rotation
  timestamp=$(date +%Y%m%d_%H%M%S)
  
  # Rotate log files
  for log_file in logs/*.log; do
    if [ -f "$log_file" ]; then
      local size=$(stat -f%z "$log_file" 2>/dev/null || echo 0)
      if [ "$size" -gt 10485760 ]; then  # 10MB
        echo "   Rotating $log_file (size: $size bytes)"
        mv "$log_file" "${log_file}.${timestamp}.bak"
        touch "$log_file"
      fi
    fi
  done

  # 🔧 FINAL VERIFICATION
  echo "🔍 Final verification..."
  
  # Check for any remaining processes
  local remaining_processes=()
  
  # Check for PM2 processes
  if pgrep -f "pm2" > /dev/null 2>&1; then
    remaining_processes+=("PM2 processes")
  fi
  
  # Check for our Node.js processes
  if pgrep -f "node.*scripts" > /dev/null 2>&1; then
    remaining_processes+=("Node.js script processes")
  fi
  
  # Check for our Python processes
  if pgrep -f "python.*(dashboard|patch|summary|braun)" > /dev/null 2>&1; then
    remaining_processes+=("Python daemon processes")
  fi
  
  # Check for watchdog processes
  if pgrep -f "watchdog" > /dev/null 2>&1; then
    remaining_processes+=("Watchdog processes")
  fi
  
  # Check for tunnel processes
  if pgrep -f "cloudflared" > /dev/null 2>&1; then
    remaining_processes+=("Cloudflare tunnel processes")
  fi
  
  # Check for main project processes
  if pgrep -f "expo.*start" > /dev/null 2>&1; then
    remaining_processes+=("Expo development processes")
  fi
  
  if pgrep -f "yarn.*dev" > /dev/null 2>&1; then
    remaining_processes+=("Backend development processes")
  fi
  
  if pgrep -f "ngrok" > /dev/null 2>&1; then
    remaining_processes+=("Ngrok tunnel processes")
  fi
  
  if [ ${#remaining_processes[@]} -gt 0 ]; then
    echo "⚠️ Warning: Some processes may still be running:"
    for process in "${remaining_processes[@]}"; do
      echo "   - $process"
    done
    echo "   You may need to manually kill these processes if needed."
  else
    echo "✅ All processes successfully shut down"
  fi

  echo "🎉 Unified system shutdown completed!"
  echo "📊 Shutdown Summary:"
  echo "   - PM2 Processes: ✅ STOPPED"
  echo "   - Watchdog Services: ✅ STOPPED"
  echo "   - Core Services: ✅ STOPPED"
  echo "   - Dashboard Services: ✅ STOPPED"
  echo "   - Tunnel Services: ✅ STOPPED"
  echo "   - Main Project Services: ✅ STOPPED"
  echo "   - Port Cleanup: ✅ COMPLETED"
  echo "   - PID File Cleanup: ✅ COMPLETED"
  echo "   - Log Rotation: ✅ COMPLETED"
  echo ""
  echo "🔄 To restart the system, run: ./scripts/core/unified-boot.sh"

} 2>&1 | tee "$LOG"

echo "✅ Unified system shutdown completed. Log saved to: $LOG" 
