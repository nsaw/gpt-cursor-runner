#!/bin/bash

# Consolidated Watchdog for GHOST RUNNER System
# Replaces multiple overlapping watchdog scripts with a single, efficient monitor

LOG_DIR="/Users/sawyer/gitSync/gpt-cursor-runner/logs"
CYOPS_LOG_DIR="/Users/sawyer/gitSync/gpt-cursor-runner/logs"
MAIN_LOG_DIR="/Users/sawyer/gitSync/tm-mobile-cursor/logs"

# Ensure log directories exist
mkdir -p "$LOG_DIR"
mkdir -p "$CYOPS_LOG_DIR"
mkdir -p "$MAIN_LOG_DIR"

# Log function
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_DIR/consolidated-watchdog.log"
}

# Check if process is running
check_process() {
    local process_name="$1"
    pgrep -f "$process_name" > /dev/null 2>&1
}

# Check if port is listening
check_port() {
    local port="$1"
    lsof -i ":$port" > /dev/null 2>&1
}

# Restart process with proper logging
restart_process() {
    local process_name="$1"
    local command="$2"
    local log_file="$3"
    
    log "WARN" "Restarting $process_name..."
    
    # Kill existing process
    { pkill -f "$process_name" 2>/dev/null || true & } >/dev/null 2>&1 & disown || true
    sleep 2
    
    # Start new process
    cd "/Users/sawyer/gitSync/gpt-cursor-runner"
    { nohup bash -c "$command" > "$log_file" 2>&1 & } >/dev/null 2>&1 & disown
    
    sleep 3
    
    if check_process "$process_name"; then
        log "INFO" "$process_name restarted successfully"
        return 0
    else
        log "ERROR" "Failed to restart $process_name"
        return 1
    fi
}

# Monitor CYOPS services
monitor_cyops_services() {
    log "INFO" "Checking CYOPS services..."
    
    # Critical CYOPS services
    local services=(
        "ghost-bridge-watchdog:bash scripts/watchdogs/ghost-bridge-watchdog.sh:$CYOPS_LOG_DIR/ghost-bridge-watchdog.log"
        "ghost-bridge:node scripts/ghost-bridge-extractor.js:$CYOPS_LOG_DIR/ghost-bridge.log"
        "patch-executor:node scripts/patch-executor.js:$CYOPS_LOG_DIR/patch-executor.log"
        "consolidated-daemon:node scripts/consolidated-daemon.js:$CYOPS_LOG_DIR/consolidated-daemon.log"
        "dual-monitor:node scripts/monitor/dualMonitor.js:$CYOPS_LOG_DIR/dual-monitor.log"
    )
    
    for service in "${services[@]}"; do
        IFS=':' read -r name command log_file <<< "$service"
        
        if ! check_process "$name"; then
            restart_process "$name" "$command" "$log_file"
        fi
    done
}

# Monitor MAIN services
monitor_main_services() {
    log "INFO" "Checking MAIN services..."
    
    # Critical MAIN services
    local services=(
        "patch-executor:cd /Users/sawyer/gitSync/tm-mobile-cursor && node scripts/patch-executor.js:$MAIN_LOG_DIR/patch-executor.log"
        "ghost-bridge:cd /Users/sawyer/gitSync/tm-mobile-cursor && node scripts/ghost-bridge.js:$MAIN_LOG_DIR/ghost-bridge.log"
    )
    
    for service in "${services[@]}"; do
        IFS=':' read -r name command log_file <<< "$service"
        
        if ! check_process "$name"; then
            restart_process "$name" "$command" "$log_file"
        fi
    done
}

# Monitor tunnels
monitor_tunnels() {
    log "INFO" "Checking tunnels..."
    
    # Check Cloudflare tunnel
    if ! check_process "cloudflared"; then
        log "WARN" "Cloudflare tunnel not running, restarting..."
        cd "/Users/sawyer/gitSync/gpt-cursor-runner"
        { nohup cloudflared tunnel run --config /Users/sawyer/.cloudflared/config.yml f1545c78-1a94-408f-ba6b-9c4223b4c2bf > "$LOG_DIR/cloudflare-tunnel.log" 2>&1 & } >/dev/null 2>&1 & disown
        sleep 5
    fi
    
    # Check ngrok tunnels (if available)
    if command -v ngrok >/dev/null 2>&1; then
        if ! check_process "ngrok"; then
            log "WARN" "ngrok not running, restarting..."
            cd "/Users/sawyer/gitSync/gpt-cursor-runner"
            { nohup ngrok http 8787 > "$LOG_DIR/ngrok-tunnel.log" 2>&1 & } >/dev/null 2>&1 & disown
            sleep 5
        fi
    fi
}

# Monitor ports
monitor_ports() {
    log "INFO" "Checking critical ports..."
    
    local ports=(
        "5051:ghost-runner"
        "5555:webhook"
        "8787:dual-monitor"
        "8082:expo-dev-server"
    )
    
    for port_info in "${ports[@]}"; do
        IFS=':' read -r port service <<< "$port_info"
        
        if ! check_port "$port"; then
            log "WARN" "Port $port ($service) not listening"
        fi
    done
}

# Health check function
health_check() {
    log "INFO" "Performing health check..."
    
    # Check disk space
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        log "ERROR" "Disk usage critical: ${disk_usage}%"
    elif [ "$disk_usage" -gt 80 ]; then
        log "WARN" "Disk usage high: ${disk_usage}%"
    fi
    
    # Check memory usage
    local mem_usage=$(top -l 1 | grep PhysMem | awk '{print $2}' | sed 's/[^0-9]//g')
    if [ "$mem_usage" -gt 80 ]; then
        log "WARN" "Memory usage high: ${mem_usage}%"
    fi
}

# Main monitoring loop
main() {
    log "INFO" "Starting consolidated watchdog..."
    
    # Initial health check
    health_check
    
    while true; do
        # Monitor all systems
        monitor_cyops_services
        monitor_main_services
        monitor_tunnels
        monitor_ports
        
        # Periodic health check (every 10 cycles)
        if [ $((SECONDS % 300)) -eq 0 ]; then
            health_check
        fi
        
        # Sleep before next check
        sleep 30
    done
}

# Handle signals
trap 'log "INFO" "Consolidated watchdog stopped by signal"; exit 0' SIGINT SIGTERM

# Parse command line arguments
case "${1:-monitor}" in
    "monitor")
        main
        ;;
    "health")
        health_check
        ;;
    "status")
        echo "=== CYOPS Services ==="
        ps aux | grep -E "(ghost-bridge|patch-executor|consolidated-daemon|dual-monitor)" | grep -v grep
        echo ""
        echo "=== MAIN Services ==="
        ps aux | grep -E "(patch-executor|ghost-bridge)" | grep -v grep
        echo ""
        echo "=== Tunnels ==="
        ps aux | grep -E "(cloudflared|ngrok)" | grep -v grep
        ;;
    *)
        echo "Usage: $0 {monitor|health|status}"
        echo "  monitor - Run continuous monitoring (default)"
        echo "  health  - Run health check"
        echo "  status  - Show current status"
        exit 1
        ;;
esac 
