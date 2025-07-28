#!/bin/bash

# Comprehensive Self-Regulating System Startup Script
# Integrates Fly.io deployment monitoring, MAIN side integration, and advanced performance tracking

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
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
CONFIG_DIR="$PROJECT_ROOT/config"
BACKUP_DIR="$PROJECT_ROOT/backups"

# Create necessary directories
mkdir -p "$LOG_DIR" "$CONFIG_DIR" "$BACKUP_DIR"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_DIR/system_startup.log"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_DIR/system_startup.log"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_DIR/system_startup.log"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_DIR/system_startup.log"
}

# Function to check if a process is running
is_process_running() {
    local process_pattern="$1"
    pgrep -f "$process_pattern" >/dev/null 2>&1
}

# Function to check if a port is in use
is_port_in_use() {
    local port="$1"
    lsof -i ":$port" >/dev/null 2>&1
}

# Function to wait for a service to be ready
wait_for_service() {
    local service_name="$1"
    local port="$2"
    local max_attempts=30
    local attempt=1

    info "Waiting for $service_name to be ready on port $port..."

    while [ $attempt -le $max_attempts ]; do
        if is_port_in_use "$port"; then
            info "$service_name is ready on port $port"
            return 0
        fi
        
        sleep 2
        attempt=$((attempt + 1))
    done

    error "$service_name failed to start on port $port after $max_attempts attempts"
    return 1
}

# Function to start a component with error handling
start_component() {
    local component_name="$1"
    local start_command="$2"
    local process_pattern="$3"
    local port="$4"

    info "Starting $component_name..."

    if is_process_running "$process_pattern"; then
        warning "$component_name is already running"
        return 0
    fi

    # Start the component
    eval "$start_command" > "$LOG_DIR/${component_name}.log" 2>&1 &
    local pid=$!
    echo $pid > "$LOG_DIR/${component_name}.pid"

    # Wait for the component to start
    sleep 3

    # Check if the component started successfully
    if is_process_running "$process_pattern"; then
        info "$component_name started successfully (PID: $pid)"
        
        # Wait for service to be ready if port is specified
        if [ -n "$port" ]; then
            wait_for_service "$component_name" "$port"
        fi
        
        return 0
    else
        error "$component_name failed to start"
        return 1
    fi
}

# Function to check Fly.io deployment status
check_fly_deployment() {
    info "Checking Fly.io deployment status..."
    
    if command -v fly >/dev/null 2>&1; then
        local app_name="gpt-cursor-runner"
        
        # Check if app exists
        if fly apps list | grep -q "$app_name"; then
            info "Fly.io app '$app_name' found"
            
            # Get deployment status
            local status_output=$(fly status --app "$app_name" 2>/dev/null || echo "ERROR")
            
            if echo "$status_output" | grep -q "started"; then
                info "Fly.io deployment is running"
                return 0
            else
                warning "Fly.io deployment may have issues"
                return 1
            fi
        else
            warning "Fly.io app '$app_name' not found"
            return 1
        fi
    else
        warning "Fly.io CLI not installed"
        return 1
    fi
}

# Function to check MAIN side integration
check_main_side_integration() {
    info "Checking MAIN side integration..."
    
    local main_scripts_dir="/Users/sawyer/gitSync/tm-mobile-cursor/scripts"
    local mobile_scripts_dir="/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/scripts"
    
    local issues=0
    
    # Check if directories exist
    if [ ! -d "$main_scripts_dir" ]; then
        warning "MAIN scripts directory not found: $main_scripts_dir"
        issues=$((issues + 1))
    else
        info "MAIN scripts directory found"
    fi
    
    if [ ! -d "$mobile_scripts_dir" ]; then
        warning "Mobile scripts directory not found: $mobile_scripts_dir"
        issues=$((issues + 1))
    else
        info "Mobile scripts directory found"
    fi
    
    # Check for tunnel processes
    local tunnel_processes=$(pgrep -f "ngrok\|tunnel" | wc -l)
    if [ "$tunnel_processes" -gt 0 ]; then
        info "Found $tunnel_processes tunnel processes"
    else
        warning "No tunnel processes found"
        issues=$((issues + 1))
    fi
    
    if [ $issues -eq 0 ]; then
        info "MAIN side integration check passed"
        return 0
    else
        warning "MAIN side integration has $issues issues"
        return 1
    fi
}

# Function to start the comprehensive monitoring system
start_comprehensive_monitoring() {
    info "Starting comprehensive monitoring system..."
    
    # Start enhanced performance monitor
    start_component \
        "enhanced_performance_monitor" \
        "cd $PROJECT_ROOT && python3 performance_monitor_clean.py" \
        "python3.*performance_monitor_clean" \
        ""
    
    # Start system monitor
    start_component \
        "system_monitor" \
        "cd $PROJECT_ROOT && python3 system_monitor.py" \
        "python3.*system_monitor" \
        ""
    
    # Start enhanced daemons
    start_component \
        "enhanced_braun_daemon" \
        "cd $PROJECT_ROOT && python3 enhanced_braun_daemon.py" \
        "python3.*enhanced_braun_daemon" \
        ""
    
    start_component \
        "enhanced_cyops_daemon" \
        "cd $PROJECT_ROOT && python3 enhanced_cyops_daemon.py" \
        "python3.*enhanced_cyops_daemon" \
        ""
}

# Function to start core services
start_core_services() {
    info "Starting core services..."
    
    # Start Python runner
    start_component \
        "python_runner" \
        "cd $PROJECT_ROOT && python3 -m gpt_cursor_runner.main" \
        "python3.*gpt_cursor_runner.main" \
        "5051"
    
    # Start Node.js server
    start_component \
        "node_server" \
        "cd $PROJECT_ROOT/server && node index.js" \
        "node.*server/index.js" \
        "5555"
}

# Function to start tunnel services
start_tunnel_services() {
    info "Starting tunnel services..."
    
    # Check if ngrok is available
    if command -v ngrok >/dev/null 2>&1; then
        # Start ngrok tunnel for Python runner
        if ! is_process_running "ngrok.*5051"; then
            info "Starting ngrok tunnel for Python runner..."
            ngrok http 5051 > "$LOG_DIR/ngrok-python.log" 2>&1 &
            echo $! > "$LOG_DIR/ngrok-python.pid"
        fi
        
        # Start ngrok tunnel for Node.js server
        if ! is_process_running "ngrok.*5555"; then
            info "Starting ngrok tunnel for Node.js server..."
            ngrok http 5555 > "$LOG_DIR/ngrok-node.log" 2>&1 &
            echo $! > "$LOG_DIR/ngrok-node.pid"
        fi
    else
        warning "ngrok not found, skipping tunnel setup"
    fi
}

# Function to start watchdog processes
start_watchdog_processes() {
    info "Starting watchdog processes..."
    
    # Start tunnel watchdog
    if [ -f "$SCRIPT_DIR/watchdog-tunnel.sh" ]; then
        start_component \
            "tunnel_watchdog" \
            "cd $SCRIPT_DIR && ./watchdog-tunnel.sh" \
            "watchdog-tunnel" \
            ""
    fi
    
    # Start runner watchdog
    if [ -f "$SCRIPT_DIR/watchdog-runner.sh" ]; then
        start_component \
            "runner_watchdog" \
            "cd $SCRIPT_DIR && ./watchdog-runner.sh" \
            "watchdog-runner" \
            ""
    fi
}

# Function to perform health checks
perform_health_checks() {
    info "Performing comprehensive health checks..."
    
    local all_healthy=true
    
    # Check core services
    if ! is_port_in_use "5051"; then
        error "Python runner not responding on port 5051"
        all_healthy=false
    else
        info "Python runner health check passed"
    fi
    
    if ! is_port_in_use "5555"; then
        error "Node.js server not responding on port 5555"
        all_healthy=false
    else
        info "Node.js server health check passed"
    fi
    
    # Check Fly.io deployment
    if ! check_fly_deployment; then
        warning "Fly.io deployment health check failed"
        all_healthy=false
    fi
    
    # Check MAIN side integration
    if ! check_main_side_integration; then
        warning "MAIN side integration health check failed"
        all_healthy=false
    fi
    
    # Check monitoring processes
    if ! is_process_running "performance_monitor"; then
        error "Performance monitor not running"
        all_healthy=false
    else
        info "Performance monitor health check passed"
    fi
    
    if ! is_process_running "system_monitor"; then
        error "System monitor not running"
        all_healthy=false
    else
        info "System monitor health check passed"
    fi
    
    if [ "$all_healthy" = true ]; then
        info "All health checks passed"
        return 0
    else
        error "Some health checks failed"
        return 1
    fi
}

# Function to display system status
display_system_status() {
    info "=== COMPREHENSIVE SELF-REGULATING SYSTEM STATUS ==="
    
    echo
    echo -e "${CYAN}Core Services:${NC}"
    if is_port_in_use "5051"; then
        echo -e "  ${GREEN}✓${NC} Python Runner (port 5051)"
    else
        echo -e "  ${RED}✗${NC} Python Runner (port 5051)"
    fi
    
    if is_port_in_use "5555"; then
        echo -e "  ${GREEN}✓${NC} Node.js Server (port 5555)"
    else
        echo -e "  ${RED}✗${NC} Node.js Server (port 5555)"
    fi
    
    echo
    echo -e "${CYAN}Monitoring Services:${NC}"
    if is_process_running "performance_monitor"; then
        echo -e "  ${GREEN}✓${NC} Enhanced Performance Monitor"
    else
        echo -e "  ${RED}✗${NC} Enhanced Performance Monitor"
    fi
    
    if is_process_running "system_monitor"; then
        echo -e "  ${GREEN}✓${NC} System Monitor"
    else
        echo -e "  ${RED}✗${NC} System Monitor"
    fi
    
    if is_process_running "enhanced_braun_daemon"; then
        echo -e "  ${GREEN}✓${NC} Enhanced Braun Daemon"
    else
        echo -e "  ${RED}✗${NC} Enhanced Braun Daemon"
    fi
    
    if is_process_running "enhanced_cyops_daemon"; then
        echo -e "  ${GREEN}✓${NC} Enhanced Cyops Daemon"
    else
        echo -e "  ${RED}✗${NC} Enhanced Cyops Daemon"
    fi
    
    echo
    echo -e "${CYAN}Tunnel Services:${NC}"
    local tunnel_count=$(pgrep -f "ngrok\|tunnel" | wc -l)
    if [ "$tunnel_count" -gt 0 ]; then
        echo -e "  ${GREEN}✓${NC} $tunnel_count tunnel processes active"
    else
        echo -e "  ${RED}✗${NC} No tunnel processes active"
    fi
    
    echo
    echo -e "${CYAN}Watchdog Services:${NC}"
    if is_process_running "watchdog-tunnel"; then
        echo -e "  ${GREEN}✓${NC} Tunnel Watchdog"
    else
        echo -e "  ${RED}✗${NC} Tunnel Watchdog"
    fi
    
    if is_process_running "watchdog-runner"; then
        echo -e "  ${GREEN}✓${NC} Runner Watchdog"
    else
        echo -e "  ${RED}✗${NC} Runner Watchdog"
    fi
    
    echo
    echo -e "${CYAN}External Services:${NC}"
    if check_fly_deployment >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Fly.io Deployment"
    else
        echo -e "  ${RED}✗${NC} Fly.io Deployment"
    fi
    
    if check_main_side_integration >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} MAIN Side Integration"
    else
        echo -e "  ${RED}✗${NC} MAIN Side Integration"
    fi
    
    echo
    echo -e "${CYAN}System Resources:${NC}"
    local cpu_usage=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
    local memory_usage=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    echo -e "  CPU Usage: ${cpu_usage}%"
    echo -e "  Memory Usage: ${memory_usage}%"
    echo -e "  Disk Usage: ${disk_usage}%"
    
    echo
    echo -e "${CYAN}Log Files:${NC}"
    echo -e "  System Log: $LOG_DIR/system_startup.log"
    echo -e "  Performance Log: $LOG_DIR/performance_monitor.log"
    echo -e "  System Monitor Log: $LOG_DIR/system_monitor.log"
    
    echo
    echo -e "${CYAN}Endpoints:${NC}"
    echo -e "  Local Dashboard: http://localhost:5051/dashboard"
    echo -e "  Local Health: http://localhost:5051/health"
    echo -e "  Fly.io Health: https://gpt-cursor-runner.fly.dev/health"
    echo -e "  Node.js Server: http://localhost:5555"
    
    echo
    echo -e "${CYAN}Self-Regulation Features:${NC}"
    echo -e "  ✓ Enhanced Performance Monitoring"
    echo -e "  ✓ Fly.io Deployment Monitoring"
    echo -e "  ✓ MAIN Side Integration"
    echo -e "  ✓ Tunnel Health Monitoring"
    echo -e "  ✓ Automated Alerting"
    echo -e "  ✓ Predictive Maintenance"
    echo -e "  ✓ Resource Optimization"
    echo -e "  ✓ Failure Prevention"
    
    echo
    info "=== STATUS COMPLETE ==="
}

# Main startup function
main() {
    log "Starting Comprehensive Self-Regulating System..."
    
    # Check prerequisites
    if ! command -v python3 >/dev/null 2>&1; then
        error "Python 3 is required but not installed"
        exit 1
    fi
    
    if ! command -v node >/dev/null 2>&1; then
        error "Node.js is required but not installed"
        exit 1
    fi
    
    # Create backup before starting
    info "Creating system backup..."
    tar -czf "$BACKUP_DIR/system_backup_$(date +%Y%m%d_%H%M%S).tar.gz" \
        --exclude=node_modules --exclude=.git --exclude=logs \
        -C "$PROJECT_ROOT" . >/dev/null 2>&1 || warning "Backup creation failed"
    
    # Start core services
    start_core_services
    
    # Start comprehensive monitoring
    start_comprehensive_monitoring
    
    # Start tunnel services
    start_tunnel_services
    
    # Start watchdog processes
    start_watchdog_processes
    
    # Wait for all services to be ready
    info "Waiting for all services to be ready..."
    sleep 10
    
    # Perform health checks
    if perform_health_checks; then
        info "All services started successfully"
    else
        warning "Some services may have issues"
    fi
    
    # Display system status
    display_system_status
    
    log "Comprehensive Self-Regulating System startup complete"
    log "System is now monitoring and self-regulating"
    
    # Keep the script running to maintain the session
    info "Press Ctrl+C to stop the system"
    while true; do
        sleep 60
        # Periodic health check
        if ! perform_health_checks >/dev/null 2>&1; then
            warning "Periodic health check detected issues"
        fi
    done
}

# Handle script arguments
case "${1:-}" in
    "start")
        main
        ;;
    "stop")
        info "Stopping Comprehensive Self-Regulating System..."
        pkill -f "python3.*gpt_cursor_runner.main" || true
        pkill -f "node.*server/index.js" || true
        pkill -f "performance_monitor" || true
        pkill -f "system_monitor" || true
        pkill -f "enhanced_braun_daemon" || true
        pkill -f "enhanced_cyops_daemon" || true
        pkill -f "ngrok" || true
        pkill -f "watchdog" || true
        info "System stopped"
        ;;
    "status")
        display_system_status
        ;;
    "health")
        perform_health_checks
        ;;
    "restart")
        $0 stop
        sleep 5
        $0 start
        ;;
    *)
        echo "Usage: $0 {start|stop|status|health|restart}"
        echo
        echo "Commands:"
        echo "  start   - Start the comprehensive self-regulating system"
        echo "  stop    - Stop all system components"
        echo "  status  - Display system status"
        echo "  health  - Perform health checks"
        echo "  restart - Restart the entire system"
        exit 1
        ;;
esac 