#!/bin/bash

# =============================================================================
# PHASE 2 SELF-REGULATING SYSTEM STARTUP SCRIPT
# =============================================================================
# Integrates with MAIN side systems and provides comprehensive monitoring
# Coordinates all components: Python runner, Node.js server, enhanced daemons,
# system monitor, performance monitor, and MAIN side integration
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/sawyer/gitSync/gpt-cursor-runner"
MAIN_SCRIPTS_DIR="/Users/sawyer/gitSync/tm-mobile-cursor/scripts"
MOBILE_SCRIPTS_DIR="/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/scripts"

# Port assignments
PYTHON_RUNNER_PORT=5051
NODE_SERVER_PORT=5555
SYSTEM_MONITOR_PORT=5556
PERFORMANCE_MONITOR_PORT=5557

# Log files
STARTUP_LOG="$PROJECT_ROOT/logs/phase2-startup.log"
PID_FILE="$PROJECT_ROOT/logs/phase2-pids.json"
HEALTH_FILE="$PROJECT_ROOT/logs/phase2-health.json"

# Create necessary directories
mkdir -p "$PROJECT_ROOT/logs"
mkdir -p "$PROJECT_ROOT/patches/processed"
mkdir -p "$PROJECT_ROOT/patches/failed"

# Function to log messages
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$STARTUP_LOG"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$STARTUP_LOG"
}

log_warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$STARTUP_LOG"
}

log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$STARTUP_LOG"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$STARTUP_LOG"
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local process_name=$2
    if check_port $port; then
        log_warn "Port $port is in use. Killing existing process..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to start process and save PID
start_process() {
    local name=$1
    local command=$2
    local log_file=$3
    
    log_info "Starting $name..."
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$log_file")"
    
    # Start process in background
    eval "$command" > "$log_file" 2>&1 &
    local pid=$!
    
    # Save PID to JSON file
    if [ -f "$PID_FILE" ]; then
        # Update existing JSON
        node /Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/pid_file_update_once.js "$PID_FILE" "$name" "$pid" "$command" "$log_file" 2>/dev/null || true
    else
        # Create new JSON
        echo "{\"$name\": {\"pid\": $pid, \"command\": \"$command\", \"log_file\": \"$log_file\", \"started\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}" > "$PID_FILE"
    fi
    
    log_info "$name started with PID $pid"
    return $pid
}

# Function to wait for service to be ready
wait_for_service() {
    local name=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    log_info "Waiting for $name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            log_success "$name is ready!"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts: $name not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "$name failed to start after $max_attempts attempts"
    return 1
}

# Function to check MAIN side integration
check_main_side_integration() {
    log_info "🔍 Checking MAIN side integration..."
    
    # Check if MAIN side directories exist
    if [ ! -d "$MAIN_SCRIPTS_DIR" ]; then
        log_warn "MAIN side scripts directory not found: $MAIN_SCRIPTS_DIR"
        return 1
    fi
    
    if [ ! -d "$MOBILE_SCRIPTS_DIR" ]; then
        log_warn "Mobile scripts directory not found: $MOBILE_SCRIPTS_DIR"
        return 1
    fi
    
    # Check for key MAIN side files
    local main_files=(
        "$MAIN_SCRIPTS_DIR/monitoring-system.js"
        "$MAIN_SCRIPTS_DIR/watchdog-runner.sh"
        "$MAIN_SCRIPTS_DIR/boot-all-systems.sh"
        "$MOBILE_SCRIPTS_DIR/super_autolinter.py"
    )
    
    for file in "${main_files[@]}"; do
        if [ -f "$file" ]; then
            log_success "✅ Found: $(basename "$file")"
        else
            log_warn "⚠️ Missing: $(basename "$file")"
        fi
    done
    
    # Check if MAIN side processes are running
    local main_processes=(
        "monitoring-system.js"
        "super_autolinter.py"
        "watchdog-runner.sh"
    )
    
    for process in "${main_processes[@]}"; do
        if pgrep -f "$process" >/dev/null 2>&1; then
            log_success "✅ MAIN side process running: $process"
        else
            log_warn "⚠️ MAIN side process not running: $process"
        fi
    done
    
    return 0
}

# Function to start MAIN side systems if needed
start_main_side_systems() {
    log_info "🚀 Starting MAIN side systems..."
    
    if [ -f "$MAIN_SCRIPTS_DIR/boot-all-systems.sh" ]; then
        log_info "Starting MAIN side boot script..."
        cd "$MAIN_SCRIPTS_DIR"
        ./boot-all-systems.sh > "$PROJECT_ROOT/logs/main-side-boot.log" 2>&1 &
        cd "$PROJECT_ROOT"
        log_success "MAIN side boot script started"
    else
        log_warn "MAIN side boot script not found"
    fi
}

# Function to verify system health
verify_system_health() {
    log_info "🔍 Verifying system health..."
    
    local health_status=0
    
    # Check Python runner
    if check_port $PYTHON_RUNNER_PORT; then
        log_success "✅ Python runner is running on port $PYTHON_RUNNER_PORT"
    else
        log_error "❌ Python runner is not running on port $PYTHON_RUNNER_PORT"
        health_status=1
    fi
    
    # Check Node.js server
    if check_port $NODE_SERVER_PORT; then
        log_success "✅ Node.js server is running on port $NODE_SERVER_PORT"
    else
        log_error "❌ Node.js server is not running on port $NODE_SERVER_PORT"
        health_status=1
    fi
    
    # Check system monitor
    if pgrep -f "system_monitor.py" >/dev/null 2>&1; then
        log_success "✅ System monitor is running"
    else
        log_error "❌ System monitor is not running"
        health_status=1
    fi
    
    # Check performance monitor
    if pgrep -f "performance_monitor.py" >/dev/null 2>&1; then
        log_success "✅ Performance monitor is running"
    else
        log_error "❌ Performance monitor is not running"
        health_status=1
    fi
    
    # Check enhanced daemons
    if pgrep -f "enhanced_braun_daemon.py" >/dev/null 2>&1; then
        log_success "✅ Enhanced BRAUN daemon is running"
    else
        log_error "❌ Enhanced BRAUN daemon is not running"
        health_status=1
    fi
    
    if pgrep -f "enhanced_cyops_daemon.py" >/dev/null 2>&1; then
        log_success "✅ Enhanced CYOPS daemon is running"
    else
        log_error "❌ Enhanced CYOPS daemon is not running"
        health_status=1
    fi
    
    # Save health status
    echo "{\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"healthy\": $health_status}" > "$HEALTH_FILE"
    
    return $health_status
}

# Function to show system status
show_status() {
    log_info "📊 System Status:"
    
    if [ -f "$PID_FILE" ]; then
        echo "Processes:"
        node /Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/pid_list_once.js "$PID_FILE" 2>/dev/null || echo "No PID file found"
    fi
    
    echo "Port Status:"
    echo "  Python Runner (5051): $(check_port 5051 && echo "✅ Running" || echo "❌ Not running")"
    echo "  Node Server (5555): $(check_port 5555 && echo "✅ Running" || echo "❌ Not running")"
    
    echo "Process Status:"
    echo "  System Monitor: $(pgrep -f "system_monitor.py" >/dev/null && echo "✅ Running" || echo "❌ Not running")"
    echo "  Performance Monitor: $(pgrep -f "performance_monitor.py" >/dev/null && echo "✅ Running" || echo "❌ Not running")"
    echo "  Enhanced BRAUN: $(pgrep -f "enhanced_braun_daemon.py" >/dev/null && echo "✅ Running" || echo "❌ Not running")"
    echo "  Enhanced CYOPS: $(pgrep -f "enhanced_cyops_daemon.py" >/dev/null && echo "✅ Running" || echo "❌ Not running")"
}

# Function to stop all processes
stop_all() {
    log_info "🛑 Stopping all Phase 2 processes..."
    
    # Kill processes by PID file
    if [ -f "$PID_FILE" ]; then
        node /Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/pid_stop_once.js "$PID_FILE" 2>/dev/null || true
    fi
    
    # Kill processes by pattern
    pkill -f "system_monitor.py" 2>/dev/null || true
    pkill -f "performance_monitor.py" 2>/dev/null || true
    pkill -f "enhanced_braun_daemon.py" 2>/dev/null || true
    pkill -f "enhanced_cyops_daemon.py" 2>/dev/null || true
    
    # Kill ports
    kill_port $PYTHON_RUNNER_PORT "Python Runner"
    kill_port $NODE_SERVER_PORT "Node Server"
    
    log_success "All Phase 2 processes stopped"
}

# Function to show logs
show_logs() {
    local component=$1
    local lines=${2:-50}
    
    if [ -f "$PID_FILE" ]; then
        local log_file=$(node /Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/log_file_get_once.js "$PID_FILE" "$component" 2>/dev/null)
        
        if [ -n "$log_file" ] && [ -f "$log_file" ]; then
            echo "=== Logs for $component ==="
            tail -n $lines "$log_file"
        else
            log_error "No log file found for $component"
        fi
    else
        log_error "PID file not found"
    fi
}

# Main startup sequence
main() {
    log "=== PHASE 2 SELF-REGULATING SYSTEM STARTUP ==="
    log "Integrating with MAIN side systems and starting all components"
    
    # Cleanup existing processes
    log_info "Cleaning up existing processes..."
    stop_all
    
    # Check MAIN side integration
    check_main_side_integration
    
    # Start MAIN side systems if needed
    start_main_side_systems
    
    # Wait for MAIN side to stabilize
    log_info "Waiting for MAIN side systems to stabilize..."
    sleep 10
    
    # Start Python runner
    log_info "=== STARTING PYTHON RUNNER ==="
    kill_port $PYTHON_RUNNER_PORT "Python Runner"
    start_process "Python Runner" "cd $PROJECT_ROOT && python3 -m gpt_cursor_runner.main" "$PROJECT_ROOT/logs/python-runner.log"
    sleep 5
    wait_for_service "Python Runner" "http://localhost:$PYTHON_RUNNER_PORT/health" || log_warn "Python runner health check failed"
    
    # Start Node.js server
    log_info "=== STARTING NODE.JS SERVER ==="
    kill_port $NODE_SERVER_PORT "Node Server"
    start_process "Node Server" "cd $PROJECT_ROOT/server && node index.js" "$PROJECT_ROOT/logs/node-server.log"
    sleep 5
    wait_for_service "Node Server" "http://localhost:$NODE_SERVER_PORT/health" || log_warn "Node server health check failed"
    
    # Start System Monitor
    log_info "=== STARTING SYSTEM MONITOR ==="
    start_process "System Monitor" "cd $PROJECT_ROOT && python3 system_monitor.py" "$PROJECT_ROOT/logs/system-monitor.log"
    sleep 5
    
    # Start Performance Monitor
    log_info "=== STARTING PERFORMANCE MONITOR ==="
    start_process "Performance Monitor" "cd $PROJECT_ROOT && python3 performance_monitor.py" "$PROJECT_ROOT/logs/performance-monitor.log"
    sleep 5
    
    # Start Enhanced BRAUN Daemon
    log_info "=== STARTING ENHANCED BRAUN DAEMON ==="
    start_process "Enhanced BRAUN Daemon" "cd $PROJECT_ROOT && python3 enhanced_braun_daemon.py" "$PROJECT_ROOT/logs/enhanced-braun-daemon.log"
    sleep 5
    
    # Start Enhanced CYOPS Daemon
    log_info "=== STARTING ENHANCED CYOPS DAEMON ==="
    start_process "Enhanced CYOPS Daemon" "cd $PROJECT_ROOT && python3 enhanced_cyops_daemon.py" "$PROJECT_ROOT/logs/enhanced-cyops-daemon.log"
    sleep 5
    
    # Verify system health
    log_info "=== VERIFYING SYSTEM HEALTH ==="
    if verify_system_health; then
        log_success "🎉 Phase 2 system started successfully!"
        show_status
    else
        log_error "❌ System health verification failed"
        show_status
        exit 1
    fi
    
    log_info "=== PHASE 2 STARTUP COMPLETE ==="
    log_info "System is now running with enhanced monitoring and MAIN side integration"
    log_info "Use './scripts/start_phase2_system.sh status' to check system status"
    log_info "Use './scripts/start_phase2_system.sh logs <component>' to view logs"
    log_info "Use './scripts/start_phase2_system.sh stop' to stop all processes"
}

# Command line interface
case "${1:-start}" in
    "start")
        main
        ;;
    "stop")
        stop_all
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2" "$3"
        ;;
    "health")
        verify_system_health
        ;;
    "restart")
        stop_all
        sleep 5
        main
        ;;
    *)
        echo "Usage: $0 {start|stop|status|logs|health|restart}"
        echo "  start   - Start all Phase 2 components"
        echo "  stop    - Stop all Phase 2 components"
        echo "  status  - Show system status"
        echo "  logs    - Show logs for a component"
        echo "  health  - Verify system health"
        echo "  restart - Restart all components"
        exit 1
        ;;
esac 
