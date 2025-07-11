#!/bin/bash

# Retry Patch Delivery Script v1.0
# Tracks failed patches and escalates after 3 failures, triggering GitHub fallback
# Part of the hardened fallback pipeline for GHOST↔DEV reliability

set -e

# Configuration
LOG_DIR="./logs/watchdogs"
LOG_FILE="$LOG_DIR/patch-retry.log"
FAILED_PATCHES_FILE="$LOG_DIR/failed-patches.json"
MAX_RETRIES=3
ESCALATION_THRESHOLD=3
DASHBOARD_WEBHOOK="https://gpt-cursor-runner.fly.dev/slack/commands"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Generate operation UUID for tracking
OPERATION_UUID=$(uuidgen)
START_TIME=$(date +%s)

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    echo "[$timestamp] [${OPERATION_UUID}] [$level] $message" | tee -a "$LOG_FILE"
}

# Notify dashboard of retry actions
notify_dashboard() {
    local message="$1"
    local level="${2:-INFO}"
    
    curl -s --max-time 10 -X POST "$DASHBOARD_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{
            \"command\": \"/alert-runner-crash\",
            \"text\": \"[PATCH-RETRY] ${level}: ${message}\",
            \"user_name\": \"patch-retry\",
            \"channel_id\": \"infrastructure\"
        }" >> "$LOG_FILE" 2>&1 || log "WARN" "Dashboard notification failed"
}

# Initialize failed patches tracking
init_failed_patches() {
    if [ ! -f "$FAILED_PATCHES_FILE" ]; then
        echo '{"failed_patches": {}, "escalation_count": 0}' > "$FAILED_PATCHES_FILE"
        log "INFO" "✅ Initialized failed patches tracking file"
    fi
}

# Get failed patches data
get_failed_patches_data() {
    if [ -f "$FAILED_PATCHES_FILE" ]; then
        cat "$FAILED_PATCHES_FILE"
    else
        echo '{"failed_patches": {}, "escalation_count": 0}'
    fi
}

# Update failed patches data
update_failed_patches_data() {
    local data="$1"
    echo "$data" > "$FAILED_PATCHES_FILE"
}

# Record patch failure
record_patch_failure() {
    local patch_id="$1"
    local error_message="$2"
    
    log "INFO" "📝 Recording patch failure: $patch_id"
    
    local data=$(get_failed_patches_data)
    local failed_patches=$(echo "$data" | jq -r '.failed_patches')
    
    # Get current failure count for this patch
    local current_count=$(echo "$failed_patches" | jq -r ".$patch_id.failure_count // 0")
    local new_count=$((current_count + 1))
    
    # Update failed patches
    local updated_failed_patches=$(echo "$failed_patches" | jq -r ".$patch_id = {
        \"failure_count\": $new_count,
        \"last_failure\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\",
        \"error_message\": \"$error_message\"
    }")
    
    # Update data
    local updated_data=$(echo "$data" | jq -r ".failed_patches = $updated_failed_patches")
    update_failed_patches_data "$updated_data"
    
    log "INFO" "✅ Recorded failure for patch $patch_id (count: $new_count)"
    
    # Check if escalation is needed
    if [ $new_count -ge $ESCALATION_THRESHOLD ]; then
        log "WARN" "⚠️ Patch $patch_id reached escalation threshold ($new_count failures)"
        escalate_patch_failure "$patch_id" "$error_message"
    fi
}

# Escalate patch failure
escalate_patch_failure() {
    local patch_id="$1"
    local error_message="$2"
    
    log "WARN" "🚨 Escalating patch failure: $patch_id"
    notify_dashboard "Escalating patch failure: $patch_id" "WARNING"
    
    # Update escalation count
    local data=$(get_failed_patches_data)
    local escalation_count=$(echo "$data" | jq -r '.escalation_count // 0')
    local new_escalation_count=$((escalation_count + 1))
    
    local updated_data=$(echo "$data" | jq -r ".escalation_count = $new_escalation_count")
    update_failed_patches_data "$updated_data"
    
    # Trigger GitHub fallback
    trigger_github_fallback "$patch_id" "$error_message"
}

# Trigger GitHub fallback
trigger_github_fallback() {
    local patch_id="$1"
    local error_message="$2"
    
    log "INFO" "🔄 Triggering GitHub fallback for patch: $patch_id"
    notify_dashboard "Triggering GitHub fallback for patch: $patch_id" "INFO"
    
    # Call the GitHub fallback script
    if [ -f "./scripts/send-fallback-to-github.sh" ]; then
        log "INFO" "🔧 Executing send-fallback-to-github.sh"
        
        # Create fallback data
        local fallback_data="{
            \"patch_id\": \"$patch_id\",
            \"error_message\": \"$error_message\",
            \"escalation_reason\": \"patch_delivery_failure\",
            \"retry_count\": $ESCALATION_THRESHOLD,
            \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\"
        }"
        
        # Execute fallback script
        echo "$fallback_data" | ./scripts/send-fallback-to-github.sh >> "$LOG_DIR/github-fallback.log" 2>&1
        local fallback_exit=$?
        
        if [ $fallback_exit -eq 0 ]; then
            log "INFO" "✅ GitHub fallback triggered successfully"
            notify_dashboard "GitHub fallback triggered successfully for patch: $patch_id" "SUCCESS"
        else
            log "ERROR" "❌ GitHub fallback failed (exit: $fallback_exit)"
            notify_dashboard "GitHub fallback failed for patch: $patch_id" "ERROR"
        fi
    else
        log "ERROR" "❌ GitHub fallback script not found: ./scripts/send-fallback-to-github.sh"
        notify_dashboard "GitHub fallback script not found" "ERROR"
    fi
}

# Check for stuck patches
check_stuck_patches() {
    log "INFO" "🔍 Checking for stuck patches"
    
    if [ -d "./patches" ]; then
        local stuck_patches=$(find ./patches -name "*.json" -mtime +1 2>/dev/null)
        local stuck_count=0
        
        for patch_file in $stuck_patches; do
            if [ -f "$patch_file" ]; then
                local patch_name=$(basename "$patch_file")
                local patch_id="${patch_name%.json}"
                
                log "WARN" "⚠️ Found stuck patch: $patch_id"
                record_patch_failure "$patch_id" "patch_stuck_for_over_24_hours"
                stuck_count=$((stuck_count + 1))
            fi
        done
        
        if [ $stuck_count -gt 0 ]; then
            log "WARN" "⚠️ Found $stuck_count stuck patches"
        else
            log "INFO" "✅ No stuck patches found"
        fi
    fi
}

# Check patch delivery health
check_patch_delivery_health() {
    log "INFO" "🔍 Checking patch delivery health"
    
    # Check patch queue
    if [ -d "./patches" ]; then
        local total_patches=$(find ./patches -name "*.json" 2>/dev/null | wc -l)
        local recent_patches=$(find ./patches -name "*.json" -mtime -1 2>/dev/null | wc -l)
        
        log "INFO" "📊 Patch queue status: $total_patches total, $recent_patches recent"
        
        if [ $total_patches -gt 10 ]; then
            log "WARN" "⚠️ Large patch queue detected ($total_patches patches)"
        fi
    fi
    
    # Check quarantine
    if [ -d "./quarantine" ]; then
        local quarantined_patches=$(find ./quarantine -name "*.json" 2>/dev/null | wc -l)
        
        if [ $quarantined_patches -gt 0 ]; then
            log "WARN" "⚠️ Found $quarantined_patches quarantined patches"
        fi
    fi
    
    # Check failed patches tracking
    local data=$(get_failed_patches_data)
    local failed_count=$(echo "$data" | jq -r '.failed_patches | length')
    local escalation_count=$(echo "$data" | jq -r '.escalation_count // 0')
    
    log "INFO" "📊 Failed patches tracking: $failed_count failed, $escalation_count escalations"
    
    if [ $escalation_count -gt 5 ]; then
        log "WARN" "⚠️ High escalation count detected ($escalation_count)"
        notify_dashboard "High patch escalation count detected: $escalation_count" "WARNING"
    fi
}

# Retry specific patch
retry_patch() {
    local patch_id="$1"
    
    log "INFO" "🔄 Retrying patch: $patch_id"
    notify_dashboard "Retrying patch: $patch_id" "INFO"
    
    # Check if patch exists
    local patch_file="./patches/$patch_id.json"
    if [ ! -f "$patch_file" ]; then
        log "ERROR" "❌ Patch file not found: $patch_file"
        return 1
    fi
    
    # Attempt to process the patch
    local retry_output
    retry_output=$(python3 -m gpt_cursor_runner.patch_runner --process "$patch_file" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log "INFO" "✅ Patch retry successful: $patch_id"
        
        # Remove from failed patches tracking
        local data=$(get_failed_patches_data)
        local failed_patches=$(echo "$data" | jq -r ".failed_patches | del(.$patch_id)")
        local updated_data=$(echo "$data" | jq -r ".failed_patches = $failed_patches")
        update_failed_patches_data "$updated_data"
        
        return 0
    else
        log "ERROR" "❌ Patch retry failed: $patch_id - $retry_output"
        record_patch_failure "$patch_id" "retry_failed: $retry_output"
        return 1
    fi
}

# Clean up old failed patches
cleanup_old_failures() {
    log "INFO" "🧹 Cleaning up old failed patches"
    
    local data=$(get_failed_patches_data)
    local failed_patches=$(echo "$data" | jq -r '.failed_patches')
    local cleaned_patches=$(echo "$failed_patches" | jq -r 'to_entries | map(select(.value.last_failure < "'$(date -d '7 days ago' -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'")) | from_entries')
    
    local updated_data=$(echo "$data" | jq -r ".failed_patches = $cleaned_patches")
    update_failed_patches_data "$updated_data"
    
    log "INFO" "✅ Cleaned up old failed patches"
}

# Generate retry report
generate_retry_report() {
    log "INFO" "📊 Generating retry report"
    
    local data=$(get_failed_patches_data)
    local failed_count=$(echo "$data" | jq -r '.failed_patches | length')
    local escalation_count=$(echo "$data" | jq -r '.escalation_count // 0')
    
    local report="{
        \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\",
        \"operation_uuid\": \"$OPERATION_UUID\",
        \"failed_patches_count\": $failed_count,
        \"escalation_count\": $escalation_count,
        \"max_retries\": $MAX_RETRIES,
        \"escalation_threshold\": $ESCALATION_THRESHOLD
    }"
    
    echo "$report" > "$LOG_DIR/retry-report.json"
    log "INFO" "✅ Retry report generated"
}

# Main retry sequence
run_retry_sequence() {
    log "INFO" "🚀 Starting patch retry sequence"
    notify_dashboard "Starting patch retry sequence" "INFO"
    
    # Initialize tracking
    init_failed_patches
    
    # Check for stuck patches
    check_stuck_patches
    
    # Check delivery health
    check_patch_delivery_health
    
    # Clean up old failures
    cleanup_old_failures
    
    # Generate report
    generate_retry_report
    
    log "INFO" "✅ Patch retry sequence completed"
}

# Main execution
main() {
    log "INFO" "🚀 Starting patch retry script (operation: $OPERATION_UUID)"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Check command line arguments
    case "${1:-run}" in
        run)
            run_retry_sequence
            ;;
        retry)
            if [ -n "$2" ]; then
                retry_patch "$2"
            else
                log "ERROR" "❌ Patch ID required for retry command"
                exit 1
            fi
            ;;
        report)
            generate_retry_report
            ;;
        cleanup)
            cleanup_old_failures
            ;;
        *)
            echo "Usage: $0 {run|retry <patch_id>|report|cleanup}"
            echo "  run     - Run the full retry sequence"
            echo "  retry   - Retry a specific patch"
            echo "  report  - Generate retry report"
            echo "  cleanup - Clean up old failures"
            exit 1
            ;;
    esac
    
    log "INFO" "✅ Patch retry script completed"
}

# Run main function
main "$@" 