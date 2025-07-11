#!/bin/bash

# Safe Run Script
# Prevents Git and shell subprocesses from blocking the pipeline
# Uses nohup, timeouts, and background execution to ensure non-blocking operation

set -e

# Configuration
TIMEOUT_SECONDS=${TIMEOUT_SECONDS:-30}
LOG_DIR="./logs/safe-run"
PID_FILE_DIR="./logs/safe-run/pids"
MAX_LOG_SIZE_MB=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Generate operation UUID for tracking
OPERATION_UUID=$(uuidgen)
START_TIME=$(date +%s)

# Ensure log directories exist
mkdir -p "$LOG_DIR"
mkdir -p "$PID_FILE_DIR"

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    echo "[$timestamp] [${OPERATION_UUID}] [$level] $message" | tee -a "$LOG_DIR/safe-run.log"
}

# Function to clean up old log files
cleanup_old_logs() {
    find "$LOG_DIR" -name "*.log" -type f -size +${MAX_LOG_SIZE_MB}M -delete 2>/dev/null || true
}

# Function to clean up stale PID files
cleanup_stale_pids() {
    find "$PID_FILE_DIR" -name "*.pid" -type f -mtime +1 -delete 2>/dev/null || true
}

# Function to run command with timeout and background execution
safe_run_command() {
    local command="$1"
    local description="${2:-Unknown command}"
    local timeout="${3:-$TIMEOUT_SECONDS}"
    
    # Generate unique identifier for this command
    local cmd_id=$(echo "$command" | md5sum | cut -d' ' -f1)
    local pid_file="$PID_FILE_DIR/${cmd_id}.pid"
    local log_file="$LOG_DIR/${cmd_id}.log"
    local error_file="$LOG_DIR/${cmd_id}.error"
    
    log "INFO" "🚀 Starting safe execution: $description"
    log "INFO" "📝 Command: $command"
    log "INFO" "⏱️ Timeout: ${timeout}s"
    
    # Clean up any existing PID file
    if [ -f "$pid_file" ]; then
        local old_pid=$(cat "$pid_file")
        if kill -0 "$old_pid" 2>/dev/null; then
            log "WARN" "⚠️ Killing stale process: $old_pid"
            kill -9 "$old_pid" 2>/dev/null || true
        fi
        rm -f "$pid_file"
    fi
    
    # Run command in background with timeout
    (
        # Set up signal handlers
        trap 'exit 143' TERM
        trap 'exit 130' INT
        
        # Execute the command
        eval "$command" > "$log_file" 2> "$error_file" &
        local cmd_pid=$!
        
        # Save PID
        echo $cmd_pid > "$pid_file"
        
        # Wait for command to complete or timeout
        wait $cmd_pid
        local exit_code=$?
        
        # Clean up PID file
        rm -f "$pid_file"
        
        exit $exit_code
    ) &
    
    local wrapper_pid=$!
    
    # Wait for wrapper process with timeout
    if wait $wrapper_pid; then
        # Check if command succeeded
        if [ -f "$log_file" ]; then
            local log_size=$(wc -c < "$log_file")
            if [ $log_size -gt 0 ]; then
                log "INFO" "✅ Command completed successfully"
                cat "$log_file"
            else
                log "WARN" "⚠️ Command completed but no output"
            fi
        else
            log "WARN" "⚠️ Command completed but no log file found"
        fi
        
        # Check for errors
        if [ -f "$error_file" ] && [ -s "$error_file" ]; then
            log "WARN" "⚠️ Command completed with errors:"
            cat "$error_file"
        fi
        
        return 0
    else
        log "ERROR" "❌ Command timed out after ${timeout}s"
        
        # Kill any remaining processes
        if [ -f "$pid_file" ]; then
            local cmd_pid=$(cat "$pid_file")
            if kill -0 "$cmd_pid" 2>/dev/null; then
                log "WARN" "🛑 Killing timed out process: $cmd_pid"
                kill -9 "$cmd_pid" 2>/dev/null || true
            fi
            rm -f "$pid_file"
        fi
        
        return 1
    fi
}

# Function to run Git commands safely
safe_git_command() {
    local git_command="$1"
    local description="${2:-Git command}"
    local timeout="${3:-60}"
    
    log "INFO" "🔧 Executing Git command: $description"
    
    # Add Git-specific safety checks
    if [[ "$git_command" == *"push"* ]] && [[ "$git_command" == *"--force"* ]]; then
        log "ERROR" "❌ Force push detected - blocking for safety"
        return 1
    fi
    
    # Run the Git command
    safe_run_command "$git_command" "$description" "$timeout"
}

# Function to run shell commands safely
safe_shell_command() {
    local shell_command="$1"
    local description="${2:-Shell command}"
    local timeout="${3:-30}"
    
    log "INFO" "🐚 Executing shell command: $description"
    
    # Add shell-specific safety checks
    if [[ "$shell_command" == *"rm -rf"* ]] && [[ "$shell_command" == *"/"* ]]; then
        log "ERROR" "❌ Dangerous rm command detected - blocking for safety"
        return 1
    fi
    
    # Run the shell command
    safe_run_command "$shell_command" "$description" "$timeout"
}

# Function to run npm/yarn commands safely
safe_npm_command() {
    local npm_command="$1"
    local description="${2:-NPM command}"
    local timeout="${3:-120}"
    
    log "INFO" "📦 Executing NPM command: $description"
    
    # Run the NPM command
    safe_run_command "$npm_command" "$description" "$timeout"
}

# Function to run Python commands safely
safe_python_command() {
    local python_command="$1"
    local description="${2:-Python command}"
    local timeout="${3:-60}"
    
    log "INFO" "🐍 Executing Python command: $description"
    
    # Run the Python command
    safe_run_command "$python_command" "$description" "$timeout"
}

# Function to check if a command is running
is_command_running() {
    local cmd_id="$1"
    local pid_file="$PID_FILE_DIR/${cmd_id}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            return 0  # Running
        else
            # Clean up stale PID file
            rm -f "$pid_file"
        fi
    fi
    return 1  # Not running
}

# Function to kill a running command
kill_command() {
    local cmd_id="$1"
    local pid_file="$PID_FILE_DIR/${cmd_id}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log "INFO" "🛑 Killing process: $pid"
            kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$pid_file"
        return 0
    else
        log "WARN" "⚠️ No PID file found for command: $cmd_id"
        return 1
    fi
}

# Function to list running commands
list_running_commands() {
    log "INFO" "📋 Listing running commands:"
    
    if [ -d "$PID_FILE_DIR" ]; then
        for pid_file in "$PID_FILE_DIR"/*.pid; do
            if [ -f "$pid_file" ]; then
                local cmd_id=$(basename "$pid_file" .pid)
                local pid=$(cat "$pid_file")
                
                if kill -0 "$pid" 2>/dev/null; then
                    log "INFO" "  ✅ $cmd_id (PID: $pid)"
                else
                    log "WARN" "  ⚠️ $cmd_id (stale PID: $pid)"
                    rm -f "$pid_file"
                fi
            fi
        done
    else
        log "INFO" "  No running commands found"
    fi
}

# Function to clean up all running commands
cleanup_all_commands() {
    log "INFO" "🧹 Cleaning up all running commands"
    
    if [ -d "$PID_FILE_DIR" ]; then
        for pid_file in "$PID_FILE_DIR"/*.pid; do
            if [ -f "$pid_file" ]; then
                local cmd_id=$(basename "$pid_file" .pid)
                kill_command "$cmd_id"
            fi
        done
    fi
    
    cleanup_old_logs
    cleanup_stale_pids
}

# Main command handling
case "${1:-help}" in
    git)
        shift
        safe_git_command "$*" "Git command" "${TIMEOUT_SECONDS:-60}"
        ;;
    shell)
        shift
        safe_shell_command "$*" "Shell command" "${TIMEOUT_SECONDS:-30}"
        ;;
    npm)
        shift
        safe_npm_command "$*" "NPM command" "${TIMEOUT_SECONDS:-120}"
        ;;
    python)
        shift
        safe_python_command "$*" "Python command" "${TIMEOUT_SECONDS:-60}"
        ;;
    run)
        shift
        safe_run_command "$*" "Custom command" "${TIMEOUT_SECONDS:-30}"
        ;;
    status)
        list_running_commands
        ;;
    kill)
        shift
        kill_command "$1"
        ;;
    cleanup)
        cleanup_all_commands
        ;;
    help|*)
        echo "Safe Run Script - Non-blocking command execution"
        echo ""
        echo "Usage: $0 {git|shell|npm|python|run} [command]"
        echo "       $0 {status|kill|cleanup|help}"
        echo ""
        echo "Commands:"
        echo "  git <command>     - Run Git command safely"
        echo "  shell <command>   - Run shell command safely"
        echo "  npm <command>     - Run NPM command safely"
        echo "  python <command>  - Run Python command safely"
        echo "  run <command>     - Run custom command safely"
        echo "  status            - List running commands"
        echo "  kill <cmd_id>     - Kill running command"
        echo "  cleanup           - Clean up all running commands"
        echo "  help              - Show this help"
        echo ""
        echo "Environment variables:"
        echo "  TIMEOUT_SECONDS  - Command timeout (default: 30)"
        echo ""
        echo "Examples:"
        echo "  $0 git 'push origin main'"
        echo "  $0 shell 'npm install'"
        echo "  $0 npm 'run build'"
        echo "  $0 python 'main.py'"
        echo "  $0 run 'long-running-script.sh'"
        exit 1
        ;;
esac
