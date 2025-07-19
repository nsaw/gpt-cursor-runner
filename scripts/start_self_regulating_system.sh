#!/bin/bash

# GPT-Cursor Runner - Self-Regulating System Startup Script
# Launches all components with proper coordination and monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
PID_DIR="$PROJECT_DIR/logs/pids"

# Ensure directories exist
mkdir -p "$LOG_DIR" "$PID_DIR"

# Function to log messages
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_DIR/system_startup.log"
}

# Function to check if process is running
check_process() {
    local process_name="$1"
    pgrep -f "$process_name" > /dev/null 2>&1
}

# Function to kill process
kill_process() {
    local process_name="$1"
    local pid_file="$2"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log "🛑 Stopping $process_name (PID: $pid)"
            kill "$pid" 2>/dev/null || true
            sleep 2
            kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$pid_file"
    fi
    
    # Also kill by process name
    pkill -f "$process_name" 2>/dev/null || true
}

# Function to start process with monitoring
start_process() {
    local name="$1"
    local command="$2"
    local pid_file="$PID_DIR/${name}.pid"
    local log_file="$LOG_DIR/${name}.log"
    
    log "🚀 Starting $name..."
    
    # Kill existing process if running
    kill_process "$name" "$pid_file"
    
    # Start new process
    cd "$PROJECT_DIR"
    nohup $command > "$log_file" 2>&1 &
    local pid=$!
    
    # Save PID
    echo $pid > "$pid_file"
    
    # Wait for startup
    sleep 3
    
    # Verify process started
    if check_process "$name"; then
        log "✅ $name started successfully (PID: $pid)"
        return 0
    else
        log "❌ Failed to start $name"
        rm -f "$pid_file"
        return 1
    fi
}

# Function to check system requirements
check_requirements() {
    log "🔍 Checking system requirements..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        log "❌ Python3 not found"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log "❌ Node.js not found"
        exit 1
    fi
    
    # Check ngrok
    if ! command -v ngrok &> /dev/null; then
        log "⚠️ ngrok not found - tunnel functionality will be limited"
    fi
    
    # Check required Python packages
    python3 -c "import requests, psutil" 2>/dev/null || {
        log "❌ Required Python packages not found. Installing..."
        pip3 install requests psutil
    }
    
    log "✅ System requirements satisfied"
}

# Function to start Python runner
start_python_runner() {
    log "🐍 Starting Python GPT-Cursor Runner..."
    start_process "python_runner" "python3 -m gpt_cursor_runner.main"
}

# Function to start Node.js server
start_node_server() {
    log "🟢 Starting Node.js Slack Command Server..."
    start_process "node_server" "node server/index.js"
}

# Function to start enhanced BRAUN daemon
start_braun_daemon() {
    log "🤖 Starting Enhanced BRAUN Daemon..."
    start_process "braun_daemon" "python3 enhanced_braun_daemon.py"
}

# Function to start enhanced CYOPS daemon
start_cyops_daemon() {
    log "🤖 Starting Enhanced CYOPS Daemon..."
    start_process "cyops_daemon" "python3 enhanced_cyops_daemon.py"
}

# Function to start system monitor
start_system_monitor() {
    log "🛡️ Starting System Monitor..."
    start_process "system_monitor" "python3 system_monitor.py"
}

# Function to start tunnels
start_tunnels() {
    log "🌐 Starting ngrok tunnels..."
    
    # Kill existing tunnels
    pkill -f "ngrok" 2>/dev/null || true
    sleep 2
    
    # Start tunnel for Python runner (port 5051)
    log "📡 Starting tunnel for Python runner (port 5051)..."
    nohup ngrok http 5051 > "$LOG_DIR/ngrok-python.log" 2>&1 &
    echo $! > "$PID_DIR/ngrok-python.pid"
    
    # Start tunnel for Node.js server (port 5555)
    log "📡 Starting tunnel for Node.js server (port 5555)..."
    nohup ngrok http 5555 > "$LOG_DIR/ngrok-node.log" 2>&1 &
    echo $! > "$PID_DIR/ngrok-node.pid"
    
    # Wait for tunnels to start
    sleep 10
    
    # Get tunnel URLs
    if command -v curl &> /dev/null; then
        python_url=$(curl -s "http://localhost:4040/api/tunnels" | jq -r '.tunnels[] | select(.config.addr == "localhost:5051") | .public_url' 2>/dev/null)
        node_url=$(curl -s "http://localhost:4040/api/tunnels" | jq -r '.tunnels[] | select(.config.addr == "localhost:5555") | .public_url' 2>/dev/null)
        
        if [ -n "$python_url" ] && [ "$python_url" != "null" ]; then
            log "✅ Python tunnel: $python_url"
        fi
        
        if [ -n "$node_url" ] && [ "$node_url" != "null" ]; then
            log "✅ Node.js tunnel: $node_url"
        fi
    fi
}

# Function to check all components
check_all_components() {
    log "🔍 Checking all components..."
    
    local all_healthy=true
    
    # Check Python runner
    if check_process "python3.*gpt_cursor_runner"; then
        log "✅ Python runner is running"
    else
        log "❌ Python runner is not running"
        all_healthy=false
    fi
    
    # Check Node.js server
    if check_process "node.*server/index.js"; then
        log "✅ Node.js server is running"
    else
        log "❌ Node.js server is not running"
        all_healthy=false
    fi
    
    # Check BRAUN daemon
    if check_process "python3.*enhanced_braun_daemon"; then
        log "✅ BRAUN daemon is running"
    else
        log "❌ BRAUN daemon is not running"
        all_healthy=false
    fi
    
    # Check CYOPS daemon
    if check_process "python3.*enhanced_cyops_daemon"; then
        log "✅ CYOPS daemon is running"
    else
        log "❌ CYOPS daemon is not running"
        all_healthy=false
    fi
    
    # Check system monitor
    if check_process "python3.*system_monitor"; then
        log "✅ System monitor is running"
    else
        log "❌ System monitor is not running"
        all_healthy=false
    fi
    
    # Check tunnels
    if check_process "ngrok"; then
        log "✅ ngrok tunnels are running"
    else
        log "❌ ngrok tunnels are not running"
        all_healthy=false
    fi
    
    if [ "$all_healthy" = true ]; then
        log "🎉 All components are healthy!"
        return 0
    else
        log "⚠️ Some components are not running"
        return 1
    fi
}

# Function to show status
show_status() {
    log "📊 System Status Report"
    log "======================"
    
    # Component status
    log "Components:"
    check_process "python3.*gpt_cursor_runner" && log "  🟢 Python Runner" || log "  🔴 Python Runner"
    check_process "node.*server/index.js" && log "  🟢 Node.js Server" || log "  🔴 Node.js Server"
    check_process "python3.*enhanced_braun_daemon" && log "  🟢 BRAUN Daemon" || log "  🔴 BRAUN Daemon"
    check_process "python3.*enhanced_cyops_daemon" && log "  🟢 CYOPS Daemon" || log "  🔴 CYOPS Daemon"
    check_process "python3.*system_monitor" && log "  🟢 System Monitor" || log "  🔴 System Monitor"
    check_process "ngrok" && log "  🟢 ngrok Tunnels" || log "  🔴 ngrok Tunnels"
    
    # Port status
    log ""
    log "Ports:"
    netstat -an 2>/dev/null | grep ":5051" | grep "LISTEN" >/dev/null && log "  🟢 Port 5051 (Python)" || log "  🔴 Port 5051 (Python)"
    netstat -an 2>/dev/null | grep ":5555" | grep "LISTEN" >/dev/null && log "  🟢 Port 5555 (Node.js)" || log "  🔴 Port 5555 (Node.js)"
    netstat -an 2>/dev/null | grep ":4040" | grep "LISTEN" >/dev/null && log "  🟢 Port 4040 (ngrok API)" || log "  🔴 Port 4040 (ngrok API)"
    
    # Tunnel URLs
    if command -v curl &> /dev/null; then
        log ""
        log "Tunnel URLs:"
        python_url=$(curl -s "http://localhost:4040/api/tunnels" | jq -r '.tunnels[] | select(.config.addr == "localhost:5051") | .public_url' 2>/dev/null)
        node_url=$(curl -s "http://localhost:4040/api/tunnels" | jq -r '.tunnels[] | select(.config.addr == "localhost:5555") | .public_url' 2>/dev/null)
        
        if [ -n "$python_url" ] && [ "$python_url" != "null" ]; then
            log "  📡 Python: $python_url"
        else
            log "  ❌ Python tunnel not available"
        fi
        
        if [ -n "$node_url" ] && [ "$node_url" != "null" ]; then
            log "  📡 Node.js: $node_url"
        else
            log "  ❌ Node.js tunnel not available"
        fi
    fi
}

# Function to stop all components
stop_all() {
    log "🛑 Stopping all components..."
    
    # Stop system monitor first
    kill_process "system_monitor" "$PID_DIR/system_monitor.pid"
    
    # Stop daemons
    kill_process "braun_daemon" "$PID_DIR/braun_daemon.pid"
    kill_process "cyops_daemon" "$PID_DIR/cyops_daemon.pid"
    
    # Stop servers
    kill_process "python_runner" "$PID_DIR/python_runner.pid"
    kill_process "node_server" "$PID_DIR/node_server.pid"
    
    # Stop tunnels
    kill_process "ngrok" "$PID_DIR/ngrok-python.pid"
    kill_process "ngrok" "$PID_DIR/ngrok-node.pid"
    
    # Clean up PID files
    rm -f "$PID_DIR"/*.pid
    
    log "✅ All components stopped"
}

# Function to restart all components
restart_all() {
    log "🔄 Restarting all components..."
    stop_all
    sleep 5
    start_all
}

# Function to start all components
start_all() {
    log "🚀 Starting Self-Regulating System..."
    log "=================================="
    
    # Check requirements
    check_requirements
    
    # Start components in order
    start_python_runner
    sleep 2
    
    start_node_server
    sleep 2
    
    start_braun_daemon
    sleep 2
    
    start_cyops_daemon
    sleep 2
    
    start_system_monitor
    sleep 2
    
    start_tunnels
    sleep 5
    
    # Check all components
    check_all_components
    
    log ""
    log "🎉 Self-Regulating System started successfully!"
    log ""
    log "📊 Quick Status:"
    show_status
    log ""
    log "📝 Logs available in: $LOG_DIR"
    log "🆔 PID files in: $PID_DIR"
    log ""
    log "🔧 Management Commands:"
    log "  $0 status    - Show system status"
    log "  $0 restart   - Restart all components"
    log "  $0 stop      - Stop all components"
    log "  $0 logs      - Show recent logs"
}

# Function to show logs
show_logs() {
    log "📝 Recent Logs"
    log "=============="
    
    for log_file in "$LOG_DIR"/*.log; do
        if [ -f "$log_file" ]; then
            filename=$(basename "$log_file")
            log ""
            log "📄 $filename:"
            tail -10 "$log_file" 2>/dev/null || log "  (empty or unreadable)"
        fi
    done
}

# Main script logic
case "${1:-start}" in
    "start")
        start_all
        ;;
    "stop")
        stop_all
        ;;
    "restart")
        restart_all
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "check")
        check_all_components
        ;;
    *)
        echo "GPT-Cursor Runner - Self-Regulating System"
        echo "=========================================="
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|check}"
        echo ""
        echo "Commands:"
        echo "  start    - Start all components"
        echo "  stop     - Stop all components"
        echo "  restart  - Restart all components"
        echo "  status   - Show system status"
        echo "  logs     - Show recent logs"
        echo "  check    - Check component health"
        echo ""
        echo "Configuration:"
        echo "  Project Dir: $PROJECT_DIR"
        echo "  Log Dir: $LOG_DIR"
        echo "  PID Dir: $PID_DIR"
        ;;
esac 