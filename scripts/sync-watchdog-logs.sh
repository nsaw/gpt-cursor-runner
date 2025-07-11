#!/bin/bash

# Watchdog Log Forwarding Script
# Syncs local watchdog logs to DEV runner dashboard

set -e

# Configuration
DEV_ENDPOINT="https://gpt-cursor-runner.fly.dev/api/logs/sync"
PROJECT_NAME="gpt-cursor-runner"
LOG_DIR="./logs"
SUMMARY_FILE="$LOG_DIR/log-forward-summary.txt"
MAX_RETRIES=3
RETRY_DELAY=5

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
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    echo "[$timestamp] [$level] $message" | tee -a "$SUMMARY_FILE"
}

# Generate operation UUID
OPERATION_UUID=$(uuidgen)

log "INFO" "🔄 Starting log sync operation: $OPERATION_UUID"
log "INFO" "📁 Project: $PROJECT_NAME"
log "INFO" "🎯 Target: $DEV_ENDPOINT"

# Check if log directory exists
if [ ! -d "$LOG_DIR" ]; then
    log "ERROR" "❌ Log directory not found: $LOG_DIR"
    exit 1
fi

# Collect log files
log "INFO" "📋 Collecting log files from $LOG_DIR"

LOG_FILES=()
if [ -f "$LOG_DIR/patch-watchdog.log" ]; then
    LOG_FILES+=("patch-watchdog.log")
fi
if [ -f "$LOG_DIR/patch-watchdog-stdout.log" ]; then
    LOG_FILES+=("patch-watchdog-stdout.log")
fi
if [ -f "$LOG_DIR/patch-watchdog-stderr.log" ]; then
    LOG_FILES+=("patch-watchdog-stderr.log")
fi

if [ ${#LOG_FILES[@]} -eq 0 ]; then
    log "WARN" "⚠️  No log files found in $LOG_DIR"
    exit 0
fi

log "INFO" "📦 Found ${#LOG_FILES[@]} log files: ${LOG_FILES[*]}"

# Create temporary payload
TEMP_PAYLOAD=$(mktemp)
cat > "$TEMP_PAYLOAD" << EOF
{
  "operation_uuid": "$OPERATION_UUID",
  "project_name": "$PROJECT_NAME",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",
  "agent_hostname": "$(hostname)",
  "agent_user": "$(whoami)",
  "agent_cwd": "$(pwd)",
  "log_files": {
EOF

# Add each log file to payload
for i in "${!LOG_FILES[@]}"; do
    local_file="$LOG_DIR/${LOG_FILES[$i]}"
    log_content=$(base64 -w 0 < "$local_file")
    file_size=$(wc -c < "$local_file")
    last_modified=$(stat -f "%m" "$local_file" 2>/dev/null || stat -c "%Y" "$local_file" 2>/dev/null)
    
    echo "    \"${LOG_FILES[$i]}\": {" >> "$TEMP_PAYLOAD"
    echo "      \"content\": \"$log_content\"," >> "$TEMP_PAYLOAD"
    echo "      \"size\": $file_size," >> "$TEMP_PAYLOAD"
    echo "      \"last_modified\": $last_modified," >> "$TEMP_PAYLOAD"
    echo "      \"encoding\": \"base64\"" >> "$TEMP_PAYLOAD"
    echo "    }" >> "$TEMP_PAYLOAD"
    
    if [ $i -lt $((${#LOG_FILES[@]} - 1)) ]; then
        echo "," >> "$TEMP_PAYLOAD"
    fi
done

echo "  }" >> "$TEMP_PAYLOAD"
echo "}" >> "$TEMP_PAYLOAD"

log "INFO" "📤 Preparing to send $(wc -c < "$TEMP_PAYLOAD") bytes to DEV"

# Retry logic for sending logs
attempt=1
success=false

while [ $attempt -le $MAX_RETRIES ] && [ "$success" = false ]; do
    log "INFO" "🚀 Attempt $attempt/$MAX_RETRIES: Sending logs to DEV"
    
    # Send logs to DEV endpoint
    response=$(curl -s -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "User-Agent: WatchdogLogSync/1.0" \
        -H "X-Operation-UUID: $OPERATION_UUID" \
        -H "X-Project-Name: $PROJECT_NAME" \
        --data-binary @"$TEMP_PAYLOAD" \
        "$DEV_ENDPOINT" 2>/dev/null)
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        log "INFO" "✅ Successfully synced logs to DEV (HTTP $http_code)"
        log "INFO" "📊 Response: $response_body"
        success=true
    else
        log "WARN" "⚠️  Failed to sync logs (HTTP $http_code): $response_body"
        
        if [ $attempt -lt $MAX_RETRIES ]; then
            log "INFO" "⏳ Retrying in $RETRY_DELAY seconds..."
            sleep $RETRY_DELAY
            RETRY_DELAY=$((RETRY_DELAY * 2))  # Exponential backoff
        fi
    fi
    
    attempt=$((attempt + 1))
done

# Cleanup
rm -f "$TEMP_PAYLOAD"

if [ "$success" = true ]; then
    log "INFO" "🎉 Log sync operation completed successfully"
    exit 0
else
    log "ERROR" "❌ Log sync failed after $MAX_RETRIES attempts"
    exit 1
fi 