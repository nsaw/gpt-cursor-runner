#!/bin/bash

# Runner Stack Startup Script
# Safely starts fly.io, tunnel, ghost relay, and dashboard with health checks

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOGS_DIR="$PROJECT_ROOT/logs/startup"
SUMMARIES_DIR="$PROJECT_ROOT/summaries"

# Ensure directories exist
mkdir -p "$LOGS_DIR"
mkdir -p "$SUMMARIES_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Generate summary filename
generate_summary_filename() {
    local timestamp=$(date +'%Y%m%d_%H%M%S')
    echo "startup-healthcheck-${timestamp}"
}

# Rotate log function (replaces write_summary)
log_rotate() {
    local event_type="$1"
    local title="$2"
    local content="$3"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    local log_file="$LOGS_DIR/.startup-watchdog"
    
    # Create log entry as JSON for structured logging
    local log_entry=$(cat <<EOF
{"timestamp":"$timestamp","event_type":"$event_type","title":"$title","watchdog":"startup","content":"$content","operation_uuid":"$(uuidgen)"}
EOF
)
    
    # Append to log file
    echo "$log_entry" >> "$log_file"
    
    # Rotate log if older than 48 hours (2 days)
    if [ -f "$log_file" ]; then
        local log_age=$(($(date +%s) - $(stat -f %m "$log_file" 2>/dev/null || echo 0)))
        local max_age=172800  # 48 hours in seconds
        
        if [ $log_age -gt $max_age ]; then
            # Create backup and truncate
            mv "$log_file" "${log_file}.$(date +%Y%m%d_%H%M%S).bak" 2>/dev/null || true
            touch "$log_file"
            log "INFO" "🔄 Log rotated: ${log_file}.$(date +%Y%m%d_%H%M%S).bak"
        fi
    fi
    
    echo "📝 Log entry written: $event_type"
}

# Check if port is available
check_port() {
    local port="$1"
    local service_name="$2"
    
    if lsof -i ":$port" >/dev/null 2>&1; then
        warning "Port $port is occupied by:"
        lsof -i ":$port"
        return 1
    else
        success "Port $port is available for $service_name"
        return 0
    fi
}

# Kill process on port if needed
kill_port_process() {
    local port="$1"
    local service_name="$2"
    
    log "Killing process on port $port for $service_name..."
    
    local pids=$(lsof -ti ":$port" 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
        for pid in $pids; do
            log "Killing PID $pid on port $port"
            kill -9 "$pid" 2>/dev/null || true
        done
        sleep 2
        success "Killed processes on port $port"
    else
        log "No processes found on port $port"
    fi
}

# Check if service is running
is_service_running() {
    local service_name="$1"
    local pid_file="$2"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file" 2>/dev/null || echo "")
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# Start Fly.io runner
start_fly_runner() {
    local log_file="$LOGS_DIR/fly-startup.log"
    
    log "Starting Fly.io runner..."
    
    # Check if fly.io is already running
    if is_service_running "fly" "$PROJECT_ROOT/logs/fly-log-daemon.pid"; then
        success "Fly.io runner already running"
        return 0
    fi
    
    # Start fly.io runner
    if "$SCRIPT_DIR/start-fly-log-daemon.sh" > "$log_file" 2>&1; then
        success "Fly.io runner started successfully"
        return 0
    else
        error "Failed to start Fly.io runner"
        return 1
    fi
}

# Start tunnel
start_tunnel() {
    local log_file="$LOGS_DIR/tunnel-startup.log"
    
    log "Starting tunnel service..."
    
    # Check if tunnel is already running
    if is_service_running "tunnel" "$PROJECT_ROOT/logs/watchdog-tunnel.pid"; then
        success "Tunnel already running"
        return 0
    fi
    
    # Start tunnel via safe-run
    if "$SCRIPT_DIR/safe-run.sh" "$SCRIPT_DIR/watchdog-tunnel.sh" > "$log_file" 2>&1; then
        success "Tunnel started successfully"
        return 0
    else
        error "Failed to start tunnel"
        return 1
    fi
}

# Start ghost relay
start_ghost_relay() {
    local log_file="$LOGS_DIR/ghost-startup.log"
    local pid_file="$PROJECT_ROOT/logs/ghost-relay.pid"
    
    log "Starting ghost relay on port 5051..."
    
    # Check if ghost relay is already running
    if is_service_running "ghost" "$pid_file"; then
        success "Ghost relay already running"
        return 0
    fi
    
    # Start ghost relay
    if python3 -m gpt_cursor_runner.main > "$log_file" 2>&1 & echo $! > "$pid_file"; then
        success "Ghost relay started successfully (PID: $(cat "$pid_file"))"
        return 0
    else
        error "Failed to start ghost relay"
        return 1
    fi
}

# Start Node dashboard (if enabled)
start_dashboard() {
    local log_file="$LOGS_DIR/dashboard-startup.log"
    local pid_file="$PROJECT_ROOT/logs/dashboard.pid"
    
    log "Starting Node dashboard on port 5555..."
    
    # Check if dashboard is already running
    if is_service_running "dashboard" "$pid_file"; then
        success "Dashboard already running"
        return 0
    fi
    
    # Check if package.json exists and has start script
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        if jq -e '.scripts.start' "$PROJECT_ROOT/package.json" >/dev/null 2>&1; then
            # Start dashboard
            if cd "$PROJECT_ROOT" && npm start > "$log_file" 2>&1 & echo $! > "$pid_file"; then
                success "Dashboard started successfully (PID: $(cat "$pid_file"))"
                return 0
            else
                error "Failed to start dashboard"
                return 1
            fi
        else
            warning "No start script found in package.json, skipping dashboard"
            return 0
        fi
    else
        warning "No package.json found, skipping dashboard"
        return 0
    fi
}

# Health check for services
health_check() {
    local summary_content=""
    local all_healthy=true
    
    log "Performing health checks..."
    
    # Check Fly.io
    if is_service_running "fly" "$PROJECT_ROOT/logs/fly-log-daemon.pid"; then
        success "✓ Fly.io runner: HEALTHY"
        summary_content+="- **Fly.io runner:** HEALTHY\n"
    else
        error "✗ Fly.io runner: UNHEALTHY"
        summary_content+="- **Fly.io runner:** UNHEALTHY\n"
        all_healthy=false
    fi
    
    # Check tunnel
    if is_service_running "tunnel" "$PROJECT_ROOT/logs/watchdog-tunnel.pid"; then
        success "✓ Tunnel: HEALTHY"
        summary_content+="- **Tunnel:** HEALTHY\n"
    else
        error "✗ Tunnel: UNHEALTHY"
        summary_content+="- **Tunnel:** UNHEALTHY\n"
        all_healthy=false
    fi
    
    # Check ghost relay
    if is_service_running "ghost" "$PROJECT_ROOT/logs/ghost-relay.pid"; then
        success "✓ Ghost relay: HEALTHY"
        summary_content+="- **Ghost relay:** HEALTHY\n"
    else
        error "✗ Ghost relay: UNHEALTHY"
        summary_content+="- **Ghost relay:** UNHEALTHY\n"
        all_healthy=false
    fi
    
    # Check dashboard
    if is_service_running "dashboard" "$PROJECT_ROOT/logs/dashboard.pid"; then
        success "✓ Dashboard: HEALTHY"
        summary_content+="- **Dashboard:** HEALTHY\n"
    else
        warning "⚠ Dashboard: NOT RUNNING (optional)"
        summary_content+="- **Dashboard:** NOT RUNNING (optional)\n"
    fi
    
    # Check port availability
    if check_port 5051 "ghost relay" >/dev/null 2>&1; then
        success "✓ Port 5051: AVAILABLE"
        summary_content+="- **Port 5051:** AVAILABLE\n"
    else
        error "✗ Port 5051: OCCUPIED"
        summary_content+="- **Port 5051:** OCCUPIED\n"
        all_healthy=false
    fi
    
    if check_port 5555 "dashboard" >/dev/null 2>&1; then
        success "✓ Port 5555: AVAILABLE"
        summary_content+="- **Port 5555:** AVAILABLE\n"
    else
        error "✗ Port 5555: OCCUPIED"
        summary_content+="- **Port 5555:** OCCUPIED\n"
        all_healthy=false
    fi
    
    local status="HEALTHY"
    if [[ "$all_healthy" == "false" ]]; then
        status="UNHEALTHY"
    fi
    
    return 0
}

# Main startup logic
main() {
    local summary_file=$(generate_summary_filename)
    local startup_log="$LOGS_DIR/startup.log"
    local summary_content=""
    local services_started=0
    local services_failed=0
    
    log "Starting runner stack startup sequence..."
    
    # Redirect all output to startup log
    exec > >(tee -a "$startup_log")
    exec 2>&1
    
    log "=== RUNNER STACK STARTUP ==="
    log "Timestamp: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
    log "Project root: $PROJECT_ROOT"
    
    # Check and clear ports if needed
    log "Checking port availability..."
    
    if ! check_port 5051 "ghost relay"; then
        log "Port 5051 is occupied, attempting to clear..."
        kill_port_process 5051 "ghost relay"
    fi
    
    if ! check_port 5555 "dashboard"; then
        log "Port 5555 is occupied, attempting to clear..."
        kill_port_process 5555 "dashboard"
    fi
    
    # Start services
    log "Starting services..."
    
    if start_fly_runner; then
        services_started=$((services_started + 1))
        summary_content+="- **Fly.io runner:** STARTED\n"
    else
        services_failed=$((services_failed + 1))
        summary_content+="- **Fly.io runner:** FAILED\n"
    fi
    
    if start_tunnel; then
        services_started=$((services_started + 1))
        summary_content+="- **Tunnel:** STARTED\n"
    else
        services_failed=$((services_failed + 1))
        summary_content+="- **Tunnel:** FAILED\n"
    fi
    
    if start_ghost_relay; then
        services_started=$((services_started + 1))
        summary_content+="- **Ghost relay:** STARTED\n"
    else
        services_failed=$((services_failed + 1))
        summary_content+="- **Ghost relay:** FAILED\n"
    fi
    
    if start_dashboard; then
        services_started=$((services_started + 1))
        summary_content+="- **Dashboard:** STARTED\n"
    else
        summary_content+="- **Dashboard:** SKIPPED (optional)\n"
    fi
    
    # Wait a moment for services to stabilize
    log "Waiting for services to stabilize..."
    sleep 5
    
    # Perform health check
    health_check
    
    # Generate summary
    summary_content="**Services started:** $services_started\n"
    summary_content+="**Services failed:** $services_failed\n\n"
    summary_content+="## Service Status\n\n"
    
    local status="COMPLETED"
    if [[ $services_failed -gt 0 ]]; then
        status="PARTIAL_FAILURE"
    fi
    
    log_rotate "INFO" "Startup Summary" "$summary_content"
    
    log "=== STARTUP COMPLETED ==="
    log "Services started: $services_started"
    log "Services failed: $services_failed"
    log "Summary written to: $LOGS_DIR/.startup-watchdog"
    log "Startup log: $startup_log"
    
    if [[ $services_failed -eq 0 ]]; then
        success "All services started successfully!"
        exit 0
    else
        error "Some services failed to start. Check logs for details."
        exit 1
    fi
}

# Run main function
main "$@" 