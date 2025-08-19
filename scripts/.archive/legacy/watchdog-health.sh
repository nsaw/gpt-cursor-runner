#!/bin/bash

# ***REMOVED*** 2.0 Health Watchdog
# Monitors system health and provides health status

LOG_FILE="logs/watchdog-health.log"
HEARTBEAT_FILE="summaries/_heartbeat/.health-watchdog.json"

# Create directories if they don't exist
mkdir -p logs
mkdir -p summaries/_heartbeat

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [HEALTH-WATCHDOG] $1" | tee -a "$LOG_FILE"
}

write_heartbeat() {
    local status="healthy"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Check if key services are running
    if ! pgrep -f "node.*server" > /dev/null; then
        status="degraded"
        log "WARNING: Node.js server not detected"
    fi
    
    if ! pgrep -f "python.*main.py" > /dev/null; then
        status="degraded"
        log "WARNING: Python Flask server not detected"
    fi
    
    # Check disk space
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        status="critical"
        log "CRITICAL: Disk usage at ${disk_usage}%"
    fi
    
    # Check memory usage
    local mem_usage=$(top -l 1 | grep PhysMem | awk '{print $2}' | sed 's/[^0-9]//g')
    if [ "$mem_usage" -gt 80 ]; then
        status="warning"
        log "WARNING: Memory usage at ${mem_usage}%"
    fi
    
    # Write heartbeat
    cat > "$HEARTBEAT_FILE" << EOF
{
    "service": "health-watchdog",
    "status": "$status",
    "timestamp": "$timestamp",
    "disk_usage": "$disk_usage%",
    "memory_usage": "${mem_usage}%",
    "node_server": "$(pgrep -f 'node.*server' | wc -l | tr -d ' ')",
    "flask_server": "$(pgrep -f 'python.*main.py' | wc -l | tr -d ' ')"
}
EOF
    
    log "Heartbeat written: $status"
}

# Main loop
log "Health watchdog started"

while true; do
    write_heartbeat
    sleep 30
done 
