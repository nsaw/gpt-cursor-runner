#!/bin/bash

# Auto Apply Cursor Patches Script
# Monitors patches directory and applies patches with summary generation

cd /Users/sawyer/gitSync/gpt-cursor-runner

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to log patch application (replaces generate_summary)
log_rotate() {
    local patch_id="$1"
    local target_file="$2"
    local success="$3"
    local message="$4"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    local log_file="./logs/.patch-application"
    
    # Create log entry as JSON for structured logging
    local log_entry=$(cat <<EOF
{"timestamp":"$timestamp","patch_id":"$patch_id","target_file":"$target_file","success":"$success","message":"$message","operation":"auto-apply"}
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
            echo "$(date): Log rotated: ${log_file}.$(date +%Y%m%d_%H%M%S).bak"
        fi
    fi
    
    echo "$(date): Log entry written for patch $patch_id"
}

# Check for new patches
if [ -d "patches" ] && [ "$(ls -A patches/*.json 2>/dev/null)" ]; then
    echo "$(date): Found patches, applying..."
    
    # Apply patches with force-root
    python3 scripts/apply_all_patches.py --force-root=/Users/sawyer/gitSync/gpt-cursor-runner > logs/auto-apply.log 2>&1
    
    # Archive completed patches
    ./scripts/archive-completed-patches.sh >> logs/auto-apply.log 2>&1
    
    # Check patch log for results
    if [ -f "patch-log.json" ]; then
        # Extract latest patch result
        latest_result=$(tail -1 patch-log.json 2>/dev/null | jq -r '.entries[-1] // empty')
        if [ -n "$latest_result" ]; then
            patch_id=$(echo "$latest_result" | jq -r '.patch_id // "unknown"')
            target_file=$(echo "$latest_result" | jq -r '.target_file // "unknown"')
            success=$(echo "$latest_result" | jq -r '.success // false')
            message=$(echo "$latest_result" | jq -r '.message // "No message"')
            
            # Log patch application
            log_rotate "$patch_id" "$target_file" "$success" "$message"
            
            echo "$(date): Patch $patch_id applied with status: $success"
        fi
    fi
else
    echo "$(date): No new patches found"
fi

echo "$(date): Auto-apply cursor patches check completed" 