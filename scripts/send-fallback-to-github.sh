#!/bin/bash

# FILENAME: scripts/send-fallback-to-github.sh
# PURPOSE: Manual trigger for GitHub fallback bridge when GHOST is down
# USAGE: ./scripts/send-fallback-to-github.sh [patch_id] [target_file] [description]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FALLBACK_URL="${FALLBACK_URL:-http://localhost:5051/fallback/trigger}"
LOG_FILE="logs/fallback-bridge.log"
SUMMARY_DIR="summaries"
WATCHDOG_LOG="logs/.fallback-watchdog"

# Default values
PATCH_ID="${1:-fallback-$(date +%Y%m%d_%H%M%S)}"
TARGET_FILE="${2:-README.md}"
DESCRIPTION="${3:-Manual fallback trigger via shell script}"

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
    
    # Also log to file
    echo "[${timestamp}] ${message}" >> "$LOG_FILE"
}

# Rotate log function (replaces markdown summaries)
log_rotate() {
    local event_type="$1"
    local title="$2"
    local content="$3"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    # Create log entry as JSON for structured logging
    local log_entry=$(cat <<EOF
{"timestamp":"$timestamp","event_type":"$event_type","title":"$title","watchdog":"fallback","content":"$content","operation_uuid":"$(uuidgen)"}
EOF
)
    
    # Append to log file
    echo "$log_entry" >> "$WATCHDOG_LOG"
    
    # Rotate log if older than 48 hours (2 days)
    if [ -f "$WATCHDOG_LOG" ]; then
        local log_age=$(($(date +%s) - $(stat -f %m "$WATCHDOG_LOG" 2>/dev/null || echo 0)))
        local max_age=172800  # 48 hours in seconds
        
        if [ $log_age -gt $max_age ]; then
            # Create backup and truncate
            mv "$WATCHDOG_LOG" "${WATCHDOG_LOG}.$(date +%Y%m%d_%H%M%S).bak" 2>/dev/null || true
            touch "$WATCHDOG_LOG"
            log "INFO" "🔄 Log rotated: ${WATCHDOG_LOG}.$(date +%Y%m%d_%H%M%S).bak"
        fi
    fi
    
    echo "📝 Log entry written: $event_type"
}

# Create logs directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$SUMMARY_DIR"

# Validate inputs
if [ -z "$PATCH_ID" ]; then
    log "error" "Patch ID is required"
    exit 1
fi

if [ -z "$TARGET_FILE" ]; then
    log "error" "Target file is required"
    exit 1
fi

log "info" "🚨 Manual fallback trigger initiated"
log "info" "Patch ID: $PATCH_ID"
log "info" "Target File: $TARGET_FILE"
log "info" "Description: $DESCRIPTION"
log "info" "Fallback URL: $FALLBACK_URL"

# Prepare payload
PAYLOAD=$(cat <<EOF
{
  "patch_id": "$PATCH_ID",
  "target_file": "$TARGET_FILE",
  "description": "$DESCRIPTION",
  "source": "manual-shell",
  "patch_content": "{\"pattern\": \"## Manual Fallback\", \"replacement\": \"## Manual Fallback\\n\\n✅ Applied via manual shell trigger\"}"
}
EOF
)

log "info" "📤 Sending fallback trigger to GitHub..."

# Send the request
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$FALLBACK_URL")

# Extract status code and response body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

log "info" "📥 Response received (HTTP $HTTP_CODE)"

if [ "$HTTP_CODE" -eq 200 ]; then
    log "success" "✅ Fallback trigger sent successfully"
    
    # Parse response for operation ID
    OPERATION_ID=$(echo "$RESPONSE_BODY" | grep -o '"operation_id":"[^"]*"' | cut -d'"' -f4)
    SUMMARY_FILE=$(echo "$RESPONSE_BODY" | grep -o '"summary_file":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$OPERATION_ID" ]; then
        log "success" "Operation ID: $OPERATION_ID"
    fi
    
    if [ -n "$SUMMARY_FILE" ]; then
        log "success" "Summary file: $SUMMARY_FILE"
    fi
    
    # Log successful fallback trigger
    local summary_content="Operation ID: ${OPERATION_ID:-unknown}, Patch ID: $PATCH_ID, Target File: $TARGET_FILE, Source: manual-shell, HTTP Response: $HTTP_CODE, Status: Successfully triggered GitHub Actions workflow, Fallback URL: $FALLBACK_URL, Response: $RESPONSE_BODY"
    log_rotate "success" "Manual Fallback Trigger Success" "$summary_content"
    
    log "success" "📄 Fallback trigger logged to: $WATCHDOG_LOG"
    
else
    log "error" "❌ Fallback trigger failed (HTTP $HTTP_CODE)"
    log "error" "Response: $RESPONSE_BODY"
    
    # Log failed fallback trigger
    local error_content="Patch ID: $PATCH_ID, Target File: $TARGET_FILE, Source: manual-shell, HTTP Status: $HTTP_CODE, Description: $DESCRIPTION, Fallback URL: $FALLBACK_URL, Error Response: $RESPONSE_BODY"
    log_rotate "error" "Manual Fallback Trigger Failed" "$error_content"
    
    log "error" "📄 Error logged to: $WATCHDOG_LOG"
    exit 1
fi

log "success" "🎉 Manual fallback trigger completed" 