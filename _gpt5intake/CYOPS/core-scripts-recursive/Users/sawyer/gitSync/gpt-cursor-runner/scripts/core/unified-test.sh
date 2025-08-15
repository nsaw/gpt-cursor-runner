#!/bin/bash
set -euo pipefail

LOG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/unified-test.log"
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
nb() {
  local cmd_str="$1"
  local t=${2:-30}
  if [ -n "$TIMEOUT_BIN" ]; then
    { $TIMEOUT_BIN ${t}s bash -lc "$cmd_str" & } >/dev/null 2>&1 & disown || true
  else
    { bash -lc "$cmd_str" & } >/dev/null 2>&1 & disown || true
  fi
}

# Test result tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test and track results
run_test() {
  local test_name=$1
  local test_command=$2
  local timeout_seconds=${3:-30}
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo "🧪 Testing: $test_name"
  
  # Run test with timeout
  (
    if eval "$test_command"; then
      echo "✅ PASS: $test_name"
      PASSED_TESTS=$((PASSED_TESTS + 1))
      exit 0
    else
      echo "❌ FAIL: $test_name"
      exit 1
    fi
  ) &
  TEST_PID=$!
  
  # Wait for test with timeout
  local wait_time=0
  while [ $wait_time -lt $timeout_seconds ] && kill -0 $TEST_PID 2>/dev/null; do
    sleep 1
    wait_time=$((wait_time + 1))
  done
  
  # Kill test if it's still running
  if kill -0 $TEST_PID 2>/dev/null; then
    echo "⏰ TIMEOUT: $test_name (${timeout_seconds}s)"
    kill -KILL $TEST_PID 2>/dev/null || true
    FAILED_TESTS=$((FAILED_TESTS + 1))
  else
    # Wait for test to complete and get exit code
    wait $TEST_PID
    if [ $? -ne 0 ]; then
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
  fi
  
  disown $TEST_PID 2>/dev/null || true
  echo ""
}

# Function to test PM2 processes
test_pm2_processes() {
  echo "📊 PM2 Process Tests"
  echo "==================="
  
  # Test PM2 list command
  run_test "PM2 List Command" "{ timeout 15s pm2 list & } >/dev/null 2>&1 & disown" 20
  
  # Test specific PM2 processes
  local pm2_processes=(
    "alert-engine-daemon"
    "autonomous-decision-daemon"
    "dashboard-uplink"
    "dual-monitor"
    "enhanced-doc-daemon"
    "flask-dashboard"
    "ghost-bridge"
    "ghost-relay"
    "ghost-runner"
    "ghost-viewer"
    "metrics-aggregator-daemon"
    "patch-executor"
    "summary-monitor"
    "telemetry-orchestrator"
  )
  
  for process in "${pm2_processes[@]}"; do
    run_test "PM2 Process: $process" "{ timeout 15s pm2 describe $process & } >/dev/null 2>&1 & disown" 15
  done
}

# Function to test port services
test_port_services() {
  echo "🌐 Port Service Tests"
  echo "===================="
  
  # Test critical ports
  local port_tests=(
    "5051:Ghost Bridge"
    "8787:Flask Dashboard"
    "8788:Telemetry API"
    "8789:Telemetry Orchestrator"
    "8081:Expo Development Server"
    "4000:Backend API"
    "3001:Ghost Relay"
  )
  
  for port_test in "${port_tests[@]}"; do
    IFS=':' read -r port service_name <<< "$port_test"
    run_test "Port $port ($service_name)" "lsof -i:$port > /dev/null 2>&1" 10
  done
}

# Function to test health endpoints
test_health_endpoints() {
  echo "🏥 Health Endpoint Tests"
  echo "======================="
  
  # Test health endpoints
  local health_tests=(
    "Flask Dashboard Health:http://localhost:8787/api/health"
    "Ghost Bridge Health:http://localhost:5051/health"
    "Dashboard API Status:http://localhost:8787/api/status"
    "Telemetry Orchestrator Health:http://localhost:8789/health"
    "Telemetry API Health:http://localhost:8788/health"
  )
  
  for health_test in "${health_tests[@]}"; do
    IFS=':' read -r name url <<< "$health_test"
    run_test "Health Check: $name" "curl -s --max-time 10 '$url' > /dev/null 2>&1" 15
  done
}

# Function to test external services
test_external_services() {
  echo "🌍 External Service Tests"
  echo "========================"
  
  # Test external endpoints
  local external_tests=(
    "Dashboard External:https://gpt-cursor-runner.thoughtmarks.app/monitor"
    "API Status External:https://gpt-cursor-runner.thoughtmarks.app/api/status"
    "Daemon Status External:https://gpt-cursor-runner.thoughtmarks.app/api/daemon-status"
    "Fly.io Health:https://gpt-cursor-runner.fly.dev/health"
    "Fly.io Webhook:https://gpt-cursor-runner.fly.dev/webhook"
  )
  
  for external_test in "${external_tests[@]}"; do
    IFS=':' read -r name url <<< "$external_test"
    run_test "External: $name" "curl -s --max-time 30 '$url' > /dev/null 2>&1" 35
  done
}

# Function to test Cloudflare tunnels
test_cloudflare_tunnels() {
  echo "☁️ Cloudflare Tunnel Tests"
  echo "=========================="
  
  # Test tunnel list command
  run_test "Cloudflare Tunnel List" "{ timeout 15s cloudflared tunnel list & } >/dev/null 2>&1 & disown" 20
  
  # Test specific tunnels
  local tunnels=(
    "dev-thoughtmarks"
    "expo-thoughtmarks"
    "ghost-thoughtmarks"
    "gpt-cursor-runner"
    "gpt-liveFile"
    "health-thoughtmarks"
    "webhook-thoughtmarks"
  )
  
  for tunnel in "${tunnels[@]}"; do
    run_test "Tunnel: $tunnel" "{ timeout 15s cloudflared tunnel info $tunnel & } >/dev/null 2>&1 & disown" 20
  done
}

# Function to test Python processes
test_python_processes() {
  echo "🐍 Python Process Tests"
  echo "======================"
  
  # Test Python processes
  local python_tests=(
    "Flask Dashboard:python.*dashboard"
    "Patch Executor:python.*patch"
    "Summary Watcher:python.*summary"
    "BRAUN Daemon:python.*braun"
  )
  
  for python_test in "${python_tests[@]}"; do
    IFS=':' read -r name pattern <<< "$python_test"
    run_test "Python Process: $name" "pgrep -f '$pattern' > /dev/null 2>&1" 10
  done
}

# Function to test file system
test_file_system() {
  echo "📁 File System Tests"
  echo "==================="
  
  # Test critical directories
  local dir_tests=(
    "MAIN Patches:/Users/sawyer/gitSync/.cursor-cache/MAIN/patches"
    "CYOPS Patches:/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches"
    "MAIN Summaries:/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries"
    "CYOPS Summaries:/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries"
    "Logs Directory:logs"
    "PID Directory:pids"
    "Scripts Core:scripts/core"
    "Scripts Watchdogs:scripts/watchdogs"
  )
  
  for dir_test in "${dir_tests[@]}"; do
    IFS=':' read -r name path <<< "$dir_test"
    run_test "Directory: $name" "[ -d '$path' ]" 5
  done
  
  # Test critical files
  local file_tests=(
    "Unified Boot Script:scripts/core/unified-boot.sh"
    "Unified Shutdown Script:scripts/core/unified-shutdown.sh"
    "Unified Reboot Script:scripts/core/unified-reboot.sh"
    "Unified Status Script:scripts/core/unified-status.sh"
    "Ecosystem Config:config/ecosystem.config.js"
    "Tunnel Config:config/tunnel-config.yml"
  )
  
  for file_test in "${file_tests[@]}"; do
    IFS=':' read -r name path <<< "$file_test"
    run_test "File: $name" "[ -f '$path' ]" 5
  done
}

# Function to test main project services
test_main_project_services() {
  echo "📱 Main Project Service Tests"
  echo "============================="
  
  # Test backend API
  run_test "Backend API (Port 4000)" "lsof -i:4000 > /dev/null 2>&1" 10
  
  # Test Expo development server
  run_test "Expo Development Server (Port 8081)" "lsof -i:8081 > /dev/null 2>&1" 10
  
  # Test Expo web server
  run_test "Expo Web Server (Port 8088)" "lsof -i:8088 > /dev/null 2>&1" 10
  
  # Test ngrok tunnel
  run_test "Ngrok Tunnel" "pgrep -f 'ngrok.*8088' > /dev/null 2>&1" 10
  
  # Test main project processes
  local main_project_tests=(
    "Expo Start Process:expo.*start"
    "Backend Dev Process:yarn.*dev"
    "Ngrok Process:ngrok"
  )
  
  for main_test in "${main_project_tests[@]}"; do
    IFS=':' read -r name pattern <<< "$main_test"
    run_test "Main Project: $name" "pgrep -f '$pattern' > /dev/null 2>&1" 10
  done
}

# Function to test API endpoints
test_api_endpoints() {
  echo "🔌 API Endpoint Tests"
  echo "===================="
  
  # Test API endpoints
  local api_tests=(
    "Process Health API:http://localhost:5555/api/process_health"
    "Daemon Status API:http://localhost:5555/api/daemon-status"
    "System Status API:http://localhost:5555/api/status"
    "Telemetry API:http://localhost:5555/api/telemetry"
  )
  
  for api_test in "${api_tests[@]}"; do
    IFS=':' read -r name url <<< "$api_test"
    run_test "API: $name" "curl -s --max-time 10 '$url' > /dev/null 2>&1" 15
  done
}

# Function to test watchdog processes
test_watchdog_processes() {
  echo "🛡️ Watchdog Process Tests"
  echo "========================"
  
  # Test watchdog processes
  local watchdog_tests=(
    "Unified Manager Watchdog:unified-manager-watchdog"
    "BRAUN Watchdog:braun-watchdog"
    "Ghost Runner Watchdog:ghost-runner-watchdog"
    "Patch Executor Watchdog:patch-executor-watchdog"
    "Summary Watcher Watchdog:summary-watcher-watchdog"
    "Dashboard Uplink Watchdog:dashboard-uplink-watchdog"
    "Tunnel Watchdog:tunnel-watchdog"
    "Fly.io Watchdog:fly-watchdog"
    "Flask Watchdog:flask-watchdog"
    "Enhanced Doc Daemon Watchdog:enhanced-doc-daemon-watchdog"
    "Autonomous Decision Engine Watchdog:autonomous-decision-daemon-watchdog"
    "Telemetry Orchestrator Watchdog:telemetry-orchestrator-daemon-watchdog"
    "Metrics Aggregator Watchdog:metrics-aggregator-daemon-watchdog"
    "Alert Engine Watchdog:alert-engine-daemon-watchdog"
  )
  
  for watchdog_test in "${watchdog_tests[@]}"; do
    IFS=':' read -r name pattern <<< "$watchdog_test"
    run_test "Watchdog: $name" "pgrep -f '$pattern' > /dev/null 2>&1" 10
  done
}

# Function to test daemon processes
test_daemon_processes() {
  echo "🤖 Daemon Process Tests"
  echo "======================"
  
  # Test daemon processes
  local daemon_tests=(
    "Ghost Bridge:ghost-bridge"
    "Ghost Relay:ghost-relay"
    "Ghost Runner:ghost-runner"
    "Patch Executor:patch-executor"
    "Summary Monitor:summary-monitor"
    "Dashboard Uplink:dashboard-uplink"
    "Dual Monitor:dual-monitor"
    "Flask Dashboard:flask-dashboard"
    "Enhanced Doc Daemon:enhanced-doc-daemon"
    "Autonomous Decision Engine:autonomous-decision-daemon"
    "Telemetry Orchestrator:telemetry-orchestrator"
    "Metrics Aggregator:metrics-aggregator-daemon"
    "Alert Engine:alert-engine-daemon"
  )
  
  for daemon_test in "${daemon_tests[@]}"; do
    IFS=':' read -r name pattern <<< "$daemon_test"
    run_test "Daemon: $name" "pgrep -f '$pattern' > /dev/null 2>&1" 10
  done
}

# Function to generate test report
generate_test_report() {
  echo "📊 Test Report"
  echo "=============="
  echo "Total Tests: $TOTAL_TESTS"
  echo "Passed: $PASSED_TESTS"
  echo "Failed: $FAILED_TESTS"
  echo "Success Rate: $((PASSED_TESTS * 100 / TOTAL_TESTS))%"
  echo ""
  
  if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 All tests passed! System is fully operational."
    return 0
  else
    echo "⚠️ $FAILED_TESTS test(s) failed. Check individual test results above."
    return 1
  fi
}

{
  echo "[TEST START] $(date)"
  echo "🧪 Starting comprehensive system tests..."
  echo ""
  
  # 🔧 PM2 PROCESS TESTS
  test_pm2_processes
  echo ""
  
  # 🔧 PORT SERVICE TESTS
  test_port_services
  echo ""
  
  # 🔧 HEALTH ENDPOINT TESTS
  test_health_endpoints
  echo ""
  
  # 🔧 EXTERNAL SERVICE TESTS
  test_external_services
  echo ""
  
  # 🔧 CLOUDFLARE TUNNEL TESTS
  test_cloudflare_tunnels
  echo ""
  
  # 🔧 PYTHON PROCESS TESTS
  test_python_processes
  echo ""
  
  # 🔧 FILE SYSTEM TESTS
  test_file_system
  echo ""
  
  # 🔧 MAIN PROJECT SERVICE TESTS
  test_main_project_services
  echo ""
  
  # 🔧 API ENDPOINT TESTS
  test_api_endpoints
  echo ""
  
  # 🔧 WATCHDOG PROCESS TESTS
  test_watchdog_processes
  echo ""
  
  # 🔧 DAEMON PROCESS TESTS
  test_daemon_processes
  echo ""
  
  # 🔧 TEST REPORT
  generate_test_report
  
  echo ""
  echo "🌐 Quick Access Links:"
  echo "   - Dashboard: https://gpt-cursor-runner.thoughtmarks.app/monitor"
  echo "   - API Status: https://gpt-cursor-runner.thoughtmarks.app/api/status"
  echo "   - Local Flask: http://localhost:5555/health"
  echo "   - Local Dashboard: http://localhost:3002"
  echo "   - Backend API: http://localhost:4000"
  echo "   - Expo Development: http://localhost:8081"
  echo "   - Expo Web: http://localhost:8088"
  echo ""
  echo "🔄 To run tests again: ./scripts/core/unified-test.sh"

} 2>&1 | tee "$LOG"

# Exit with appropriate code based on test results
if [ $FAILED_TESTS -eq 0 ]; then
  echo "✅ All tests passed! Log saved to: $LOG"
  exit 0
else
  echo "⚠️ $FAILED_TESTS test(s) failed. Check log for details: $LOG"
  exit 1
fi 
