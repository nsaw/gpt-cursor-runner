#!/bin/bash

# Archive Completed Patches Script
# Moves processed patches to patches/.archive/ with timestamp

cd /Users/sawyer/gitSync/gpt-cursor-runner

# Create archive directory if it doesn't exist
mkdir -p patches/.archive

# Function to log archive operation (replaces archive summary generation)
log_rotate() {
    local archive_count="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    local log_file="./logs/.patch-archive"
    
    # Create log entry as JSON for structured logging
    local log_entry=$(cat <<EOF
{"timestamp":"$timestamp","archive_count":"$archive_count","operation":"patch-archive","archive_location":"patches/.archive/"}
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
    
    echo "$(date): Archive log entry written for $archive_count patches"
}

# Function to archive a patch
archive_patch() {
    local patch_file="$1"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local archive_name="$(basename "$patch_file" .json)_archived_${timestamp}.json"
    
    # Move to archive with timestamp
    mv "$patch_file" "patches/.archive/$archive_name"
    echo "$(date): Archived $patch_file to patches/.archive/$archive_name"
}

# Function to check if patch was processed
is_patch_processed() {
    local patch_file="$1"
    local patch_id=$(basename "$patch_file" .json)
    
    # Check if patch appears in patch-log.json
    if [ -f "patch-log.json" ]; then
        if grep -q "\"patch_id\": \"$patch_id\"" patch-log.json 2>/dev/null; then
            return 0  # Patch was processed
        fi
    fi
    
    return 1  # Patch not processed
}

# Function to check if patch was successful
is_patch_successful() {
    local patch_file="$1"
    local patch_id=$(basename "$patch_file" .json)
    
    # Check if patch was successful in patch-log.json
    if [ -f "patch-log.json" ]; then
        if grep -A 10 "\"patch_id\": \"$patch_id\"" patch-log.json | grep -q "\"success\": true" 2>/dev/null; then
            return 0  # Patch was successful
        fi
    fi
    
    return 1  # Patch was not successful
}

echo "$(date): Starting patch archive process..."

# Process all JSON patches in patches directory
for patch_file in patches/*.json; do
    if [ -f "$patch_file" ]; then
        echo "Checking patch: $patch_file"
        
        # Skip if it's the archive directory itself
        if [[ "$patch_file" == "patches/.archive"* ]]; then
            continue
        fi
        
        # Check if patch was processed
        if is_patch_processed "$patch_file"; then
            echo "  ✅ Patch was processed"
            
            # Check if patch was successful
            if is_patch_successful "$patch_file"; then
                echo "  ✅ Patch was successful - archiving"
                archive_patch "$patch_file"
            else
                echo "  ⚠️  Patch was processed but failed - archiving anyway"
                archive_patch "$patch_file"
            fi
        else
            echo "  ⏳ Patch not yet processed - skipping"
        fi
    fi
done

# Log archive operation
archive_count=$(find patches/.archive -name "*.json" | wc -l)
log_rotate "$archive_count"

echo "$(date): Patch archive process completed"
echo "📁 Archive location: patches/.archive/"
echo "📊 Total archived: $archive_count patches" 