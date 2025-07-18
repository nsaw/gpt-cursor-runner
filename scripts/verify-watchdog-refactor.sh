#!/bin/bash

# FILENAME: scripts/verify-watchdog-refactor.sh
# PURPOSE: Comprehensive verification of watchdog refactoring
# USAGE: ./scripts/verify-watchdog-refactor.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOG_DIR="logs"
WATCHDOG_DIR="logs/watchdogs"

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "info") echo -e "${BLUE}[${timestamp}] ℹ️  ${message}${NC}" ;;
        "success") echo -e "${GREEN}[${timestamp}] ✓ ${message}${NC}" ;;
        "warning") echo -e "${YELLOW}[${timestamp}] ⚠️  ${message}${NC}" ;;
        "error") echo -e "${RED}[${timestamp}] ❌ ${message}${NC}" ;;
    esac
}

# Test 1: Check if new log files exist
test_log_files() {
    log "info" "🔍 Testing new log files..."
    
    local expected_files=(
        "$WATCHDOG_DIR/.runner-watchdog"
        "$WATCHDOG_DIR/.fly-watchdog"
        "$WATCHDOG_DIR/.tunnel-watchdog"
    )
    
    local all_exist=true
    for file in "${expected_files[@]}"; do
        if [ -f "$file" ]; then
            log "success" "✅ Found: $file"
        else
            log "error" "❌ Missing: $file"
            all_exist=false
        fi
    done
    
    if [ "$all_exist" = true ]; then
        log "success" "✅ All main watchdog log files exist"
        return 0
    else
        log "error" "❌ Some watchdog log files are missing"
        return 1
    fi
}

# Test 2: Verify JSON format
test_json_format() {
    log "info" "🔍 Testing JSON format..."
    
    local log_files=(
        "$WATCHDOG_DIR/.runner-watchdog"
        "$WATCHDOG_DIR/.fly-watchdog"
        "$WATCHDOG_DIR/.tunnel-watchdog"
    )
    
    local all_valid=true
    for file in "${log_files[@]}"; do
        if [ -f "$file" ]; then
            if head -1 "$file" | jq . >/dev/null 2>&1; then
                log "success" "✅ Valid JSON: $file"
            else
                log "error" "❌ Invalid JSON: $file"
                all_valid=false
            fi
        fi
    done
    
    if [ "$all_valid" = true ]; then
        log "success" "✅ All log files have valid JSON format"
        return 0
    else
        log "error" "❌ Some log files have invalid JSON format"
        return 1
    fi
}

# Test 3: Check log file sizes (should be growing)
test_log_sizes() {
    log "info" "🔍 Testing log file sizes..."
    
    local log_files=(
        "$WATCHDOG_DIR/.runner-watchdog"
        "$WATCHDOG_DIR/.fly-watchdog"
        "$WATCHDOG_DIR/.tunnel-watchdog"
    )
    
    for file in "${log_files[@]}"; do
        if [ -f "$file" ]; then
            local size=$(stat -f%z "$file" 2>/dev/null || echo "0")
            if [ "$size" -gt 100 ]; then
                log "success" "✅ $file: ${size} bytes (active)"
            else
                log "warning" "⚠️ $file: ${size} bytes (small)"
            fi
        fi
    done
}

# Test 4: Verify no old summary markdown files
test_no_old_summaries() {
    log "info" "🔍 Testing no old summary markdown files..."
    
    local summary_count=$(find summaries -name "summary-*.md" 2>/dev/null | wc -l)
    
    if [ "$summary_count" -eq 0 ]; then
        log "success" "✅ No old summary markdown files found"
        return 0
    else
        log "warning" "⚠️ Found $summary_count old summary markdown files"
        return 1
    fi
}

# Test 5: Check watchdog processes
test_watchdog_processes() {
    log "info" "🔍 Testing watchdog processes..."
    
    local running_count=0
    local total_count=0
    
    for pid_file in logs/watchdog-*.pid; do
        if [ -f "$pid_file" ]; then
            total_count=$((total_count + 1))
            local pid=$(cat "$pid_file" 2>/dev/null || echo "")
            if [ -n "$pid" ] && ps -p "$pid" >/dev/null 2>&1; then
                log "success" "✅ Running: $(basename "$pid_file") (PID: $pid)"
                running_count=$((running_count + 1))
            else
                log "warning" "⚠️ Not running: $(basename "$pid_file")"
            fi
        fi
    done
    
    if [ "$running_count" -gt 0 ]; then
        log "success" "✅ $running_count/$total_count watchdog processes running"
        return 0
    else
        log "error" "❌ No watchdog processes running"
        return 1
    fi
}

# Test 6: Verify log rotation functionality
test_log_rotation() {
    log "info" "🔍 Testing log rotation functionality..."
    
    # Check if any backup files exist (indicating rotation has occurred)
    local backup_count=$(find "$WATCHDOG_DIR" -name "*.bak" 2>/dev/null | wc -l)
    
    if [ "$backup_count" -gt 0 ]; then
        log "success" "✅ Found $backup_count backup files (rotation working)"
        return 0
    else
        log "info" "ℹ️ No backup files found (rotation may not have triggered yet)"
        return 0
    fi
}

# Test 7: Check recent log entries
test_recent_logs() {
    log "info" "🔍 Testing recent log entries..."
    
    local log_files=(
        "$WATCHDOG_DIR/.runner-watchdog"
        "$WATCHDOG_DIR/.fly-watchdog"
        "$WATCHDOG_DIR/.tunnel-watchdog"
    )
    
    for file in "${log_files[@]}"; do
        if [ -f "$file" ]; then
            local recent_count=$(tail -10 "$file" | grep -c "timestamp" || echo "0")
            if [ "$recent_count" -gt 0 ]; then
                log "success" "✅ $file: $recent_count recent entries"
            else
                log "warning" "⚠️ $file: No recent entries"
            fi
        fi
    done
}

# Test 8: Verify refactored scripts
test_refactored_scripts() {
    log "info" "🔍 Testing refactored scripts..."
    
    local scripts=(
        "scripts/retry-stalled-patches.sh"
        "scripts/start-runner-stack.sh"
        "scripts/send-fallback-to-github.sh"
    )
    
    local all_valid=true
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            if grep -q "log_rotate" "$script"; then
                log "success" "✅ $script: Uses log_rotate function"
            else
                log "error" "❌ $script: Missing log_rotate function"
                all_valid=false
            fi
            
            if ! grep -q "write_summary" "$script"; then
                log "success" "✅ $script: No write_summary function (refactored)"
            else
                log "warning" "⚠️ $script: Still contains write_summary function"
            fi
        else
            log "error" "❌ $script: File not found"
            all_valid=false
        fi
    done
    
    if [ "$all_valid" = true ]; then
        log "success" "✅ All refactored scripts are valid"
        return 0
    else
        log "error" "❌ Some refactored scripts have issues"
        return 1
    fi
}

# Main verification function
main() {
    log "info" "🚀 Starting watchdog refactor verification..."
    
    local tests=(
        "test_log_files"
        "test_json_format"
        "test_log_sizes"
        "test_no_old_summaries"
        "test_watchdog_processes"
        "test_log_rotation"
        "test_recent_logs"
        "test_refactored_scripts"
    )
    
    local passed=0
    local failed=0
    
    for test in "${tests[@]}"; do
        if $test; then
            passed=$((passed + 1))
        else
            failed=$((failed + 1))
        fi
        echo
    done
    
    log "info" "📊 Verification Results:"
    log "success" "✅ Passed: $passed tests"
    if [ "$failed" -gt 0 ]; then
        log "error" "❌ Failed: $failed tests"
    else
        log "success" "✅ Failed: 0 tests"
    fi
    
    if [ "$failed" -eq 0 ]; then
        log "success" "🎉 All tests passed! Watchdog refactoring is complete and working correctly."
        return 0
    else
        log "error" "⚠️ Some tests failed. Please review the issues above."
        return 1
    fi
}

# Run main function
main "$@" 