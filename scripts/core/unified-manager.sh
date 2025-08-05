#!/bin/bash
set -euo pipefail

# Unified System Manager
# Addresses all weak spots identified in unified-boot.sh audit
# Compatible with bash 3.2 (macOS default)

LOG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/unified-manager.log"
mkdir -p $(dirname "$LOG")

# Enhanced logging with timestamps
exec 2>> "$LOG"

# Service dependency graph (using functions instead of associative arrays)
get_service_dependencies() {
    local service_name=$1
    case "$service_name" in
        "flask-dashboard") echo "" ;;
        "ghost-runner") echo "" ;;
        "pm2-processes") echo "flask-dashboard,ghost-runner" ;;
        "dashboard-services") echo "pm2-processes" ;;
        "main-project") echo "dashboard-services" ;;
        "watchdogs") echo "main-project" ;;
        "tunnels") echo "watchdogs" ;;
        *) echo "" ;;
    esac
}

# Service configuration (using functions instead of associative arrays)
get_service_config() {
    local service_name=$1
    case "$service_name" in
        # CYOPS Services (PM2)
        "flask-dashboard") echo "pm2:flask-dashboard:dashboard/app.py:8787:http://localhost:8787/:flask-dashboard-watchdog.sh:" ;;
        "ghost-runner") echo "pm2:ghost-runner:scripts/core/ghost-runner.js:5053:http://localhost:5053/health:ghost-runner-watchdog.sh:" ;;
        "ghost-bridge") echo "pm2:ghost-bridge:scripts/core/ghost-bridge.js:5051:http://localhost:5051/health:ghost-bridge-watchdog.sh:" ;;
        "ghost-relay") echo "pm2:ghost-relay:scripts/core/ghost-relay.js:5052:http://localhost:5052/health:ghost-relay-watchdog.sh:" ;;
        "ghost-viewer") echo "pm2:ghost-viewer:scripts/core/ghost-viewer.js:5054:http://localhost:5054/health:ghost-viewer-watchdog.sh:" ;;
        "enhanced-doc-daemon") echo "pm2:enhanced-doc-daemon:scripts/daemons/enhanced-doc-daemon.js:5001:http://localhost:5001/health:enhanced-doc-daemon-watchdog.sh:" ;;
        "summary-monitor") echo "pm2:summary-monitor:scripts/daemons/summary-monitor.js:5002:http://localhost:5002/health:summary-monitor-watchdog.sh:" ;;
        "dual-monitor") echo "pm2:dual-monitor:scripts/monitor/dual-monitor-server.js:5003:http://localhost:5003/health:dual-monitor-watchdog.sh:" ;;
        "dashboard-uplink") echo "pm2:dashboard-uplink:scripts/daemons/dashboard-uplink.js:5004:http://localhost:5004/health:dashboard-uplink-watchdog.sh:" ;;
        "telemetry-orchestrator") echo "pm2:telemetry-orchestrator:scripts/daemons/telemetry-orchestrator.js:5005:http://localhost:5005/health:telemetry-orchestrator-watchdog.sh:" ;;
        "metrics-aggregator-daemon") echo "pm2:metrics-aggregator-daemon:scripts/daemons/metrics-aggregator-daemon.js:5006:http://localhost:5006/health:metrics-aggregator-daemon-watchdog.sh:" ;;
        "alert-engine-daemon") echo "pm2:alert-engine-daemon:scripts/daemons/alert-engine-daemon.js:5007:http://localhost:5007/health:alert-engine-daemon-watchdog.sh:" ;;
        "patch-executor") echo "pm2:patch-executor:scripts/daemons/patch-executor.js:5008:http://localhost:5008/health:patch-executor-watchdog.sh:" ;;
        "autonomous-decision-daemon") echo "pm2:autonomous-decision-daemon:scripts/daemons/autonomous-decision-daemon.js:5009:http://localhost:5009/health:autonomous-decision-daemon-watchdog.sh:" ;;
        
        # Main Project Services
        "MAIN-backend-api") echo "node|simple-server.js|4000|http://localhost:4000/health|backend-watchdog.sh|/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/backend" ;;
        "expo-dev") echo "expo:start --ios --clear:8081:http://localhost:8081:expo-dev-watchdog.sh:/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh" ;;
        "expo-web") echo "expo:start --clear:8088:http://localhost:8088:expo-web-watchdog.sh:/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh" ;;
        "ngrok-tunnel") echo "ngrok:http --url=deciding-externally-caiman.ngrok-free.app 8088:8088::ngrok-watchdog.sh:" ;;
        *) echo "" ;;
    esac
}

# Get all service names
get_all_services() {
    echo "flask-dashboard ghost-runner ghost-bridge ghost-relay ghost-viewer enhanced-doc-daemon summary-monitor dual-monitor dashboard-uplink telemetry-orchestrator metrics-aggregator-daemon alert-engine-daemon patch-executor autonomous-decision-daemon MAIN-backend-api expo-dev expo-web ngrok-tunnel"
}

# Non-blocking health check with timeout
health_check() {
    local service_name=$1
    local health_url=$2
    local timeout=${3:-10}
    
    if [ -z "$health_url" ]; then
        return 0
    fi
    
    # Special handling for different service types
    case "$service_name" in
        "MAIN-backend-api")
            # Backend API should return JSON with status
            (
                if curl -s --max-time $timeout "$health_url" | grep -q '"status"'; then
                    echo "✅ $service_name health check passed"
                    exit 0
                else
                    echo "❌ $service_name health check failed - no status field"
                    exit 1
                fi
            ) &
            ;;
        "expo-dev"|"expo-web")
            # Expo services might not have health endpoints, just check if port responds
            (
                if curl -s --max-time $timeout "$health_url" > /dev/null 2>&1; then
                    echo "✅ $service_name health check passed"
                    exit 0
                else
                    echo "❌ $service_name health check failed"
                    exit 1
                fi
            ) &
            ;;
        *)
            # Default health check
            (
                if curl -s --max-time $timeout "$health_url" > /dev/null 2>&1; then
                    echo "✅ $service_name health check passed"
                    exit 0
                else
                    echo "❌ $service_name health check failed"
                    exit 1
                fi
            ) &
            ;;
    esac
    
    local pid=$!
    
    # Wait with timeout
    local wait_time=0
    while [ $wait_time -lt $timeout ] && kill -0 $pid 2>/dev/null; do
        sleep 1
        wait_time=$((wait_time + 1))
    done
    
    # Kill if still running
    if kill -0 $pid 2>/dev/null; then
        echo "⏰ $service_name health check timed out"
        kill -KILL $pid 2>/dev/null || true
        return 1
    fi
    
    # Get exit code
    wait $pid
    return $?
}

# Safe port management
manage_port() {
    local port=$1
    local service_name=$2
    local max_attempts=3
    
    for attempt in $(seq 1 $max_attempts); do
        local pids=$(lsof -ti:$port 2>/dev/null)
        
        if [ -n "$pids" ]; then
            echo "⚠️ Port $port occupied by $service_name (PIDs: $pids), attempt $attempt/$max_attempts"
            
            # Try graceful shutdown first
            echo "$pids" | xargs kill -TERM 2>/dev/null || true
            sleep 5
            
            # Check if processes are still running
            local remaining_pids=$(lsof -ti:$port 2>/dev/null)
            if [ -n "$remaining_pids" ]; then
                echo "⚠️ Graceful shutdown failed, forcing kill"
                echo "$remaining_pids" | xargs kill -KILL 2>/dev/null || true
                sleep 2
            fi
            
            # Final check
            if [ -z "$(lsof -ti:$port 2>/dev/null)" ]; then
                echo "✅ Port $port cleared for $service_name"
                return 0
            fi
        else
            echo "✅ Port $port available for $service_name"
            return 0
        fi
    done
    
    echo "❌ Failed to clear port $port after $max_attempts attempts"
    return 1
}

# Service startup with dependency management
start_service() {
    local service_name=$1
    local config=$(get_service_config "$service_name")
    
    if [ -z "$config" ]; then
        echo "❌ Unknown service: $service_name"
        return 1
    fi
    
    IFS=':' read -r service_type service_id command port health_url watchdog_script working_dir <<< "$config"
    
    echo "🚀 Starting $service_name..."
    
    # Check dependencies
    local dependencies=$(get_service_dependencies "$service_name")
    if [ -n "$dependencies" ]; then
        IFS=',' read -ra deps <<< "$dependencies"
        for dep in "${deps[@]}"; do
            if ! is_service_healthy "$dep"; then
                echo "❌ Dependency $dep not healthy, cannot start $service_name"
                return 1
            fi
        done
    fi
    
    # Manage port if specified
    if [ -n "$port" ]; then
        if ! manage_port "$port" "$service_name"; then
            echo "❌ Cannot start $service_name - port $port unavailable"
            return 1
        fi
    fi
    
    # Start service based on type
    case "$service_type" in
        "python3"|"node"|"yarn"|"expo"|"ngrok")
            start_direct_service "$service_name" "$service_type" "$command" "$port" "$health_url" "$working_dir"
            ;;
        "pm2")
            start_pm2_service "$service_name" "$service_id" "$command" "$port" "$health_url"
            ;;
        *)
            echo "❌ Unknown service type: $service_type"
            return 1
            ;;
    esac
    
    # Start watchdog if specified
    if [ -n "$watchdog_script" ] && [ -f "scripts/watchdogs/$watchdog_script" ]; then
        echo "🛡️ Starting watchdog for $service_name..."
        nohup bash "scripts/watchdogs/$watchdog_script" >> "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/${service_name}-watchdog.log" 2>&1 &
        echo $! > "pids/${service_name}-watchdog.pid"
    fi
}

# Start direct service (non-PM2)
start_direct_service() {
    local service_name=$1
    local service_type=$2
    local command=$3
    local port=$4
    local health_url=$5
    local working_dir=$6
    
    local start_cmd=""
    
    # Build start command
    if [ -n "$working_dir" ]; then
        start_cmd="cd '$working_dir' && "
    fi
    
    case "$service_type" in
        "python3"|"node")
            start_cmd+="nohup $service_type $command >> /Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/${service_name}.log 2>&1 & echo \$! > pids/${service_name}.pid"
            ;;
        "yarn")
            start_cmd+="nohup yarn $command >> /Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/${service_name}.log 2>&1 & echo \$! > pids/${service_name}.pid"
            ;;
        "expo")
            start_cmd+="nohup npx expo $command >> /Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/${service_name}.log 2>&1 & echo \$! > pids/${service_name}.pid"
            ;;
        "ngrok")
            start_cmd+="nohup ngrok $command >> /Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/${service_name}.log 2>&1 & echo \$! > pids/${service_name}.pid"
            ;;
    esac
    
    # Execute start command
    eval "$start_cmd"
    
    # Wait for service to start
    sleep 5
    
    # Health check
    if [ -n "$health_url" ]; then
        if health_check "$service_name" "$health_url" 30; then
            echo "✅ $service_name started successfully"
            return 0
        else
            echo "❌ $service_name failed health check"
            return 1
        fi
    else
        echo "✅ $service_name started (no health check)"
        return 0
    fi
}

# Start PM2 service
start_pm2_service() {
    local service_name=$1
    local service_id=$2
    local script_path=$3
    local port=$4
    local health_url=$5
    
    # Check if already running
    if pm2 describe "$service_id" > /dev/null 2>&1; then
        echo "⚠️ $service_name already running in PM2"
        return 0
    fi
    
    # Start PM2 service
    if [ -f "$script_path" ]; then
        pm2 start "$script_path" --name "$service_id" --silent
        sleep 3
        
        # Health check
        if [ -n "$health_url" ]; then
            if health_check "$service_name" "$health_url" 30; then
                echo "✅ $service_name started successfully in PM2"
                return 0
            else
                echo "❌ $service_name failed health check"
                pm2 delete "$service_id" --silent 2>/dev/null || true
                return 1
            fi
        else
            echo "✅ $service_name started in PM2 (no health check)"
            return 0
        fi
    else
        echo "❌ Script not found: $script_path"
        return 1
    fi
}

# Check if service is healthy
is_service_healthy() {
    local service_name=$1
    local config=$(get_service_config "$service_name")
    
    if [ -z "$config" ]; then
        return 1
    fi
    
    IFS=':' read -r service_type service_id command port health_url watchdog_script working_dir <<< "$config"
    
    # Check PM2 services
    if [ "$service_type" = "pm2" ]; then
        if pm2 describe "$service_id" > /dev/null 2>&1; then
            local status=$(pm2 jlist | jq -r ".[] | select(.name == \"$service_id\") | .pm2_env.status")
            if [ "$status" = "online" ]; then
                return 0
            fi
        fi
        return 1
    fi
    
    # Check direct services with PID file
    if [ -f "pids/${service_name}.pid" ] && [ "$service_name" != "MAIN-backend-api" ]; then
        local pid=$(cat "pids/${service_name}.pid")
        if ps -p "$pid" > /dev/null 2>&1; then
            # Health check if available
            if [ -n "$health_url" ]; then
                health_check "$service_name" "$health_url" 5 > /dev/null 2>&1
                return $?
            else
                return 0
            fi
        fi
    fi
    
    # Enhanced port-based detection for services without PID files
    if [ -n "$port" ]; then
        # Check if port is in use
        if lsof -i ":$port" > /dev/null 2>&1; then
            # For services with health URLs, check health
            if [ -n "$health_url" ]; then
                health_check "$service_name" "$health_url" 5 > /dev/null 2>&1
                return $?
            else
                # For services without health URLs, check process matching
                case "$service_name" in
                    "expo-dev"|"expo-web")
                        # Check for Expo processes
                        if ps aux | grep -E "(expo|metro)" | grep -v grep | grep -q "$port"; then
                            return 0
                        fi
                        ;;
                    "ngrok-tunnel")
                        # Check for ngrok processes
                        if ps aux | grep "ngrok" | grep -v grep > /dev/null 2>&1; then
                            return 0
                        fi
                        ;;
                    "MAIN-backend-api")
                        # Check for node processes on the port
                        if lsof -i ":$port" | grep -q "node"; then
                            return 0
                        fi
                        ;;
                    *)
                        # Default: if port is in use, consider healthy
                        return 0
                        ;;
                esac
            fi
        fi
    fi
    
    # Process-based detection for services without ports
    case "$service_name" in
        "ngrok-tunnel")
            if ps aux | grep "ngrok" | grep -v grep > /dev/null 2>&1; then
                return 0
            fi
            ;;
        "expo-dev"|"expo-web")
            if ps aux | grep -E "(expo|metro)" | grep -v grep > /dev/null 2>&1; then
                return 0
            fi
            ;;
    esac
    
    return 1
}

# Stop service
stop_service() {
    local service_name=$1
    local config=$(get_service_config "$service_name")
    
    if [ -z "$config" ]; then
        echo "❌ Unknown service: $service_name"
        return 1
    fi
    
    IFS=':' read -r service_type service_id command port health_url watchdog_script working_dir <<< "$config"
    
    echo "🛑 Stopping $service_name..."
    
    # Stop watchdog first
    if [ -f "pids/${service_name}-watchdog.pid" ]; then
        local watchdog_pid=$(cat "pids/${service_name}-watchdog.pid")
        kill -TERM "$watchdog_pid" 2>/dev/null || true
        rm -f "pids/${service_name}-watchdog.pid"
    fi
    
    # Stop service based on type
    case "$service_type" in
        "pm2")
            pm2 delete "$service_id" --silent 2>/dev/null || true
            ;;
        *)
            if [ -f "pids/${service_name}.pid" ]; then
                local pid=$(cat "pids/${service_name}.pid")
                kill -TERM "$pid" 2>/dev/null || true
                sleep 2
                kill -KILL "$pid" 2>/dev/null || true
                rm -f "pids/${service_name}.pid"
            fi
            ;;
    esac
    
    echo "✅ $service_name stopped"
}

# Restart service
restart_service() {
    local service_name=$1
    
    echo "🔄 Restarting $service_name..."
    stop_service "$service_name"
    sleep 2
    start_service "$service_name"
}

# Monitor all services
monitor_services() {
    echo "📊 Service Status Monitor"
    echo "========================"
    
    local all_healthy=true
    
    for service_name in $(get_all_services); do
        if is_service_healthy "$service_name"; then
            echo "✅ $service_name: HEALTHY"
        else
            echo "❌ $service_name: UNHEALTHY"
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = true ]; then
        echo "🎉 All services are healthy!"
        return 0
    else
        echo "⚠️ Some services are unhealthy"
        return 1
    fi
}

# Auto-recovery for failed services
auto_recovery() {
    echo "🔧 Auto-Recovery Mode"
    echo "===================="
    
    local recovered_count=0
    
    for service_name in $(get_all_services); do
        if ! is_service_healthy "$service_name"; then
            echo "🔄 Attempting recovery for $service_name..."
            if restart_service "$service_name"; then
                echo "✅ $service_name recovered successfully"
                recovered_count=$((recovered_count + 1))
            else
                echo "❌ Failed to recover $service_name"
            fi
        fi
    done
    
    echo "📊 Recovery Summary: $recovered_count services recovered"
}

# Resource monitoring
monitor_resources() {
    echo "📈 Resource Monitor"
    echo "=================="
    
    # Memory usage
    local total_memory=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
    local free_memory=$((total_memory * 4096 / 1024 / 1024))
    echo "💾 Free Memory: ${free_memory}MB"
    
    # Disk usage
    local disk_usage=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
    echo "💿 Disk Usage: ${disk_usage}%"
    
    # Process count
    local process_count=$(ps aux | wc -l)
    echo "🔄 Process Count: $process_count"
    
    # Port usage
    local port_count=$(lsof -i -P | grep LISTEN | wc -l)
    echo "🌐 Active Ports: $port_count"
}

# Main management functions
start_all() {
    echo "🚀 Starting all services..."
    
    # Start services in dependency order
    local services=("flask-dashboard" "ghost-runner" "pm2-processes" "dashboard-services" "main-project" "watchdogs" "tunnels")
    
    for service_group in "${services[@]}"; do
        case "$service_group" in
            "pm2-processes")
                echo "📦 Starting PM2 processes..."
                for service in $(get_all_services); do
                    local config=$(get_service_config "$service")
                    IFS=':' read -r service_type service_id command port health_url watchdog_script working_dir <<< "$config"
                    if [ "$service_type" = "pm2" ]; then
                        start_service "$service"
                    fi
                done
                ;;
            "dashboard-services")
                echo "📊 Starting dashboard services..."
                # Dashboard services are already started as PM2 processes
                ;;
            "main-project")
                echo "📱 Starting main project services..."
                start_service "MAIN-backend-api"
                start_service "expo-dev"
                start_service "ngrok-tunnel"
                start_service "expo-web"
                ;;
            "watchdogs")
                echo "🛡️ Starting watchdogs..."
                # Watchdogs are started automatically with services
                ;;
            "tunnels")
                echo "🌐 Starting tunnels..."
                # Tunnels are handled by individual services
                ;;
            *)
                if [ -n "$(get_service_config "$service_group")" ]; then
                    start_service "$service_group"
                fi
                ;;
        esac
    done
    
    echo "✅ All services started"
}

stop_all() {
    echo "🛑 Stopping all services..."
    
    # Stop in reverse dependency order
    for service_name in $(get_all_services); do
        stop_service "$service_name"
    done
    
    echo "✅ All services stopped"
}

restart_all() {
    echo "🔄 Restarting all services..."
    stop_all
    sleep 5
    start_all
}

# Main command handler
case "${1:-}" in
    "start")
        start_all
        ;;
    "stop")
        stop_all
        ;;
    "restart")
        restart_all
        ;;
    "status"|"monitor")
        monitor_services
        ;;
    "recover"|"auto-recovery")
        auto_recovery
        ;;
    "resources")
        monitor_resources
        ;;
    "start-service")
        if [ -z "${2:-}" ]; then
            echo "Usage: $0 start-service <service-name>"
            exit 1
        fi
        start_service "$2"
        ;;
    "stop-service")
        if [ -z "${2:-}" ]; then
            echo "Usage: $0 stop-service <service-name>"
            exit 1
        fi
        stop_service "$2"
        ;;
    "restart-service")
        if [ -z "${2:-}" ]; then
            echo "Usage: $0 restart-service <service-name>"
            exit 1
        fi
        restart_service "$2"
        ;;
    "health")
        if [ -z "${2:-}" ]; then
            echo "Usage: $0 health <service-name>"
            exit 1
        fi
        if is_service_healthy "$2"; then
            echo "✅ $2 is healthy"
            exit 0
        else
            echo "❌ $2 is unhealthy"
            exit 1
        fi
        ;;
    "list")
        echo "Available services:"
        for service in $(get_all_services); do
            echo "  - $service"
        done
        ;;
    *)
        echo "Unified System Manager"
        echo "====================="
        echo ""
        echo "Usage: $0 <command> [service-name]"
        echo ""
        echo "Commands:"
        echo "  start              - Start all services"
        echo "  stop               - Stop all services"
        echo "  restart            - Restart all services"
        echo "  status|monitor     - Monitor all services"
        echo "  recover            - Auto-recovery for failed services"
        echo "  resources          - Monitor system resources"
        echo "  start-service      - Start specific service"
        echo "  stop-service       - Stop specific service"
        echo "  restart-service    - Restart specific service"
        echo "  health             - Check service health"
        echo "  list               - List all available services"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 start-service flask-dashboard"
        echo "  $0 health ghost-runner"
        echo "  $0 monitor"
        exit 1
        ;;
esac 