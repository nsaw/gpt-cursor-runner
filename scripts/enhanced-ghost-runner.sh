#!/bin/bash

# Enhanced Ghost Runner v2.0
# Intelligent patch and summary routing based on project targets
# Supports multiple project types and environment-based configuration

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
PID_FILE="$LOG_DIR/ghost-runner.pid"
CHECK_INTERVAL=30
MAX_RETRIES=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${BLUE}[$timestamp] INFO:${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[$timestamp] WARN:${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[$timestamp] ERROR:${NC} $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[$timestamp] SUCCESS:${NC} $message"
            ;;
    esac
}

# Get project information using enhanced path router
get_project_info() {
    local info=$(node "$SCRIPT_DIR/enhanced-path-router.js" project-info)
    echo "$info"
}

# Get target paths for specific target
get_target_paths() {
    local target=${1:-default}
    local paths=$(node "$SCRIPT_DIR/enhanced-path-router.js" target-paths "$target")
    echo "$paths"
}

# Write patch to appropriate target
write_patch() {
    local patch_data="$1"
    local target=${2:-default}
    local result=$(node "$SCRIPT_DIR/enhanced-path-router.js" write-patch "$target" "$patch_data")
    echo "$result"
}

# Write summary to appropriate target
write_summary() {
    local summary_data="$1"
    local target=${2:-default}
    local result=$(node "$SCRIPT_DIR/enhanced-path-router.js" write-summary "$target" "$summary_data")
    echo "$result"
}

# Determine appropriate target based on content analysis
determine_target() {
    local content="$1"
    local content_type="$2"
    
    # Analyze content to determine target
    if [[ "$content" == *"mobile-native-fresh"* ]] || [[ "$content" == *"React Native"* ]] || [[ "$content" == *"Expo"* ]]; then
        echo "mobile-native-fresh"
    elif [[ "$content" == *"server"* ]] || [[ "$content" == *"API"* ]] || [[ "$content" == *"Express"* ]]; then
        echo "server"
    elif [[ "$content" == *"Python"* ]] || [[ "$content" == *"gpt_cursor_runner"* ]]; then
        echo "python"
    else
        echo "default"
    fi
}

# Process incoming patch
process_patch() {
    local patch_file="$1"
    local patch_content=$(cat "$patch_file")
    local target=$(determine_target "$patch_content" "patch")
    
    log "INFO" "Processing patch: $patch_file"
    log "INFO" "Determined target: $target"
    
    # Get target paths
    local target_paths=$(get_target_paths "$target")
    log "INFO" "Target paths: $target_paths"
    
    # Write patch to appropriate location
    local result=$(write_patch "$patch_content" "$target")
    log "SUCCESS" "Patch written: $result"
    
    echo "$result"
}

# Process incoming summary
process_summary() {
    local summary_file="$1"
    local summary_content=$(cat "$summary_file")
    local target=$(determine_target "$summary_content" "summary")
    
    log "INFO" "Processing summary: $summary_file"
    log "INFO" "Determined target: $target"
    
    # Get target paths
    local target_paths=$(get_target_paths "$target")
    log "INFO" "Target paths: $target_paths"
    
    # Write summary to appropriate location
    local result=$(write_summary "$summary_content" "$target")
    log "SUCCESS" "Summary written: $result"
    
    echo "$result"
}

# Monitor for new files and route them appropriately
monitor_and_route() {
    local watch_dir="$1"
    local file_type="$2"
    
    log "INFO" "Starting monitor for $file_type files in $watch_dir"
    
    # Create watch directory if it doesn't exist
    mkdir -p "$watch_dir"
    
    # Monitor directory for new files
    inotifywait -m -e create --format '%w%f' "$watch_dir" | while read file; do
        if [[ "$file" == *".json" ]] && [[ "$file_type" == "patch" ]]; then
            log "INFO" "New patch detected: $file"
            process_patch "$file"
        elif [[ "$file" == *".md" ]] && [[ "$file_type" == "summary" ]]; then
            log "INFO" "New summary detected: $file"
            process_summary "$file"
        fi
    done
}

# Start ghost runner daemon
start_daemon() {
    log "INFO" "Starting Enhanced Ghost Runner Daemon..."
    
    # Get project information
    local project_info=$(get_project_info)
    log "INFO" "Project info: $project_info"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Write PID file
    echo $$ > "$PID_FILE"
    log "SUCCESS" "Ghost runner daemon started with PID: $$"
    
    # Start monitoring for patches and summaries
    (
        monitor_and_route "$PROJECT_ROOT/patches" "patch" &
        monitor_and_route "$PROJECT_ROOT/summaries" "summary" &
        wait
    )
}

# Stop ghost runner daemon
stop_daemon() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        log "INFO" "Stopping ghost runner daemon (PID: $pid)..."
        kill "$pid" 2>/dev/null || true
        rm -f "$PID_FILE"
        log "SUCCESS" "Ghost runner daemon stopped"
    else
        log "WARN" "No PID file found"
    fi
}

# Check daemon status
check_status() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log "SUCCESS" "Ghost runner daemon is running (PID: $pid)"
            return 0
        else
            log "ERROR" "Ghost runner daemon is not running (stale PID file)"
            rm -f "$PID_FILE"
            return 1
        fi
    else
        log "WARN" "Ghost runner daemon is not running (no PID file)"
        return 1
    fi
}

# Test routing functionality
test_routing() {
    log "INFO" "Testing enhanced routing functionality..."
    
    # Test project info
    local project_info=$(get_project_info)
    log "INFO" "Project info: $project_info"
    
    # Test target paths
    local target_paths=$(get_target_paths "default")
    log "INFO" "Default target paths: $target_paths"
    
    # Test patch writing
    local test_patch='{"test": true, "timestamp": "'$(date -Iseconds)'", "target": "test"}'
    local patch_result=$(write_patch "$test_patch" "default")
    log "SUCCESS" "Test patch written: $patch_result"
    
    # Test summary writing
    local test_summary="# Test Summary\n\nThis is a test summary for enhanced routing."
    local summary_result=$(write_summary "$test_summary" "default")
    log "SUCCESS" "Test summary written: $summary_result"
    
    log "SUCCESS" "Enhanced routing test completed successfully"
}

# Main function
main() {
    local command="${1:-start}"
    
    case $command in
        "start")
            start_daemon
            ;;
        "stop")
            stop_daemon
            ;;
        "restart")
            stop_daemon
            sleep 2
            start_daemon
            ;;
        "status")
            check_status
            ;;
        "test")
            test_routing
            ;;
        "info")
            get_project_info
            ;;
        *)
            echo "Usage: $0 [start|stop|restart|status|test|info]"
            echo ""
            echo "Commands:"
            echo "  start   - Start the enhanced ghost runner daemon"
            echo "  stop    - Stop the enhanced ghost runner daemon"
            echo "  restart - Restart the enhanced ghost runner daemon"
            echo "  status  - Check daemon status"
            echo "  test    - Test routing functionality"
            echo "  info    - Show project information"
            ;;
    esac
}

# Run main function with all arguments
main "$@" 