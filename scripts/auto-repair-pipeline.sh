#!/bin/bash

# Auto-Repair Pipeline for Patch Delivery Watchdog
# Handles patch recovery, resend logic, and escalation
# ENHANCED: Added exponential backoff, better validation, dashboard notifications

PATCH_UUID="$1"
ERROR_TYPE="$2"
RETRY_COUNT="$3"

LOG_FILE="./logs/patch-auto-repair.log"
ESCALATION_LOG="./logs/patch-escalation-report.log"
DASHBOARD_WEBHOOK="https://gpt-cursor-runner.fly.dev/slack/commands"

# Generate operation UUID for tracking
OPERATION_UUID=$(uuidgen)
START_TIME=$(date +%s)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${OPERATION_UUID}] $1" | tee -a "$LOG_FILE"
}

notify_dashboard() {
    local message="$1"
    local level="${2:-INFO}"
    
    curl -s -X POST "$DASHBOARD_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{
            \"command\": \"/alert-runner-crash\",
            \"text\": \"[AUTO-REPAIR] ${level}: ${message}\",
            \"user_name\": \"auto-repair-pipeline\",
            \"channel_id\": \"patch-recovery\"
        }" >> "$LOG_FILE" 2>&1
}

# Calculate exponential backoff delay
calculate_backoff() {
    local retry_count=$1
    local base_delay=2
    local max_delay=60
    local delay=$((base_delay * (2 ** retry_count)))
    
    if [ $delay -gt $max_delay ]; then
        delay=$max_delay
    fi
    
    echo $delay
}

log "🔧 Auto-repair pipeline triggered for patch: $PATCH_UUID (operation: $OPERATION_UUID)"

# Notify dashboard of repair attempt
notify_dashboard "Starting auto-repair for patch $PATCH_UUID (attempt $((RETRY_COUNT + 1)))" "INFO"

# Check if patch exists in quarantine
QUARANTINE_FILE="./quarantine/.failed-patches/${PATCH_UUID}.json"

if [ ! -f "$QUARANTINE_FILE" ]; then
    log "❌ Patch $PATCH_UUID not found in quarantine"
    notify_dashboard "Patch $PATCH_UUID not found in quarantine - cannot repair" "ERROR"
    exit 1
fi

# Read patch data with validation
PATCH_DATA=$(cat "$QUARANTINE_FILE" 2>/dev/null)
if [ $? -ne 0 ]; then
    log "❌ Failed to read patch data for $PATCH_UUID"
    notify_dashboard "Failed to read patch data for $PATCH_UUID" "ERROR"
    exit 1
fi

ORIGINAL_CHECKSUM=$(echo "$PATCH_DATA" | jq -r '.checksum')
ERROR_MSG=$(echo "$PATCH_DATA" | jq -r '.error')

log "📦 Recovering patch $PATCH_UUID (checksum: $ORIGINAL_CHECKSUM)"

# Enhanced validation
if [ "$ORIGINAL_CHECKSUM" = "null" ] || [ -z "$ORIGINAL_CHECKSUM" ]; then
    log "❌ Invalid checksum for patch $PATCH_UUID"
    notify_dashboard "Invalid checksum for patch $PATCH_UUID - marking as corrupted" "ERROR"
    echo "PATCH_CORRUPTED" > "/tmp/patch-${PATCH_UUID}-status"
    exit 1
fi

# Validate patch structure
if ! echo "$PATCH_DATA" | jq -e '.originalData' >/dev/null 2>&1; then
    log "❌ Invalid patch structure for $PATCH_UUID"
    notify_dashboard "Invalid patch structure for $PATCH_UUID" "ERROR"
    echo "PATCH_CORRUPTED" > "/tmp/patch-${PATCH_UUID}-status"
    exit 1
fi

# Check retry count with exponential backoff
if [ "$RETRY_COUNT" -ge 3 ]; then
    log "🚨 Patch $PATCH_UUID exceeded max retries - escalating"
    notify_dashboard "Patch $PATCH_UUID exceeded max retries - escalating to GPT/DEV" "CRITICAL"
    
    ESCALATION_REPORT=$(cat <<EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "uuid": "$PATCH_UUID",
    "operation_uuid": "$OPERATION_UUID",
    "error": "$ERROR_MSG",
    "retryCount": $RETRY_COUNT,
    "escalationLevel": "CRITICAL",
    "action": "ESCALATE_TO_GPT_DEV",
    "total_repair_time": $(( $(date +%s) - START_TIME ))
}
EOF
)
    
    echo "$ESCALATION_REPORT" >> "$ESCALATION_LOG"
    log "📋 Escalation logged to $ESCALATION_LOG"
    
    echo "ESCALATED" > "/tmp/patch-${PATCH_UUID}-status"
    exit 1
fi

# Calculate backoff delay
BACKOFF_DELAY=$(calculate_backoff $RETRY_COUNT)
log "⏰ Applying exponential backoff: ${BACKOFF_DELAY}s delay"
sleep $BACKOFF_DELAY

# Attempt repair based on error type with enhanced logic
case "$ERROR_TYPE" in
    "TIMEOUT")
        log "⏰ Handling timeout for patch $PATCH_UUID"
        notify_dashboard "Handling timeout for patch $PATCH_UUID" "INFO"
        # Enhanced timeout recovery with connection testing
        if ! curl -s --max-time 5 https://gpt-cursor-runner.fly.dev/health >/dev/null; then
            log "❌ Runner endpoint unreachable - network issue"
            notify_dashboard "Runner endpoint unreachable for patch $PATCH_UUID" "WARNING"
        fi
        ;;
    "NETWORK_ERROR")
        log "🌐 Handling network error for patch $PATCH_UUID"
        notify_dashboard "Handling network error for patch $PATCH_UUID" "INFO"
        # Test network connectivity
        if ! ping -c 1 gpt-cursor-runner.fly.dev >/dev/null 2>&1; then
            log "❌ Network connectivity issue detected"
            notify_dashboard "Network connectivity issue for patch $PATCH_UUID" "WARNING"
        fi
        ;;
    "SLACK_ERROR")
        log "💬 Handling Slack error for patch $PATCH_UUID"
        notify_dashboard "Handling Slack error for patch $PATCH_UUID" "INFO"
        # Test Slack webhook
        if ! curl -s --max-time 5 "$DASHBOARD_WEBHOOK" >/dev/null; then
            log "❌ Slack webhook unreachable"
            notify_dashboard "Slack webhook unreachable for patch $PATCH_UUID" "WARNING"
        fi
        ;;
    *)
        log "❓ Unknown error type: $ERROR_TYPE for patch $PATCH_UUID"
        notify_dashboard "Unknown error type $ERROR_TYPE for patch $PATCH_UUID" "WARNING"
        ;;
esac

# Enhanced patch validation before resend
log "🔍 Validating patch integrity before resend..."
VALIDATED_CHECKSUM=$(echo "$PATCH_DATA" | jq -r '.originalData' | sha256sum | cut -d' ' -f1)

if [ "$VALIDATED_CHECKSUM" != "$ORIGINAL_CHECKSUM" ]; then
    log "❌ Checksum mismatch for patch $PATCH_UUID - quarantine"
    notify_dashboard "Checksum mismatch for patch $PATCH_UUID - marking as corrupted" "ERROR"
    echo "PATCH_CORRUPTED" > "/tmp/patch-${PATCH_UUID}-status"
    exit 1
fi

log "✅ Patch integrity validated successfully"

# Prepare resend with enhanced retry metadata
RESEND_DATA=$(echo "$PATCH_DATA" | jq --arg retry "$RETRY_COUNT" \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg operation "$OPERATION_UUID" \
    --arg backoff "$BACKOFF_DELAY" \
    '. + {
    retryMetadata: {
        retryCount: $retry,
        retryTimestamp: $timestamp,
        operationUuid: $operation,
        backoffDelay: $backoff,
        originalError: .error
    }
}')

# Attempt resend with timeout
log "🔄 Resending patch $PATCH_UUID (attempt $((RETRY_COUNT + 1)))"

# Send to dashboard for processing with timeout
RESPONSE=$(timeout 30 curl -s -X POST https://gpt-cursor-runner.fly.dev/slack/commands \
    -H "Content-Type: application/json" \
    -d "{
        \"command\": \"/patch-approve\",
        \"text\": \"auto-repair-resend:$PATCH_UUID:$OPERATION_UUID\",
        \"user_name\": \"auto-repair-pipeline\",
        \"channel_id\": \"patch-recovery\"
    }")

RESEND_EXIT_CODE=$?

if [ $RESEND_EXIT_CODE -eq 0 ] && echo "$RESPONSE" | grep -q "✅"; then
    log "✅ Patch $PATCH_UUID resend successful"
    notify_dashboard "Patch $PATCH_UUID resend successful" "SUCCESS"
    echo "RESEND_SUCCESS" > "/tmp/patch-${PATCH_UUID}-status"
    
    # Clean up quarantine file
    rm -f "$QUARANTINE_FILE"
    
    # Log success metrics
    TOTAL_TIME=$(( $(date +%s) - START_TIME ))
    log "📊 Repair metrics: ${TOTAL_TIME}s total time, ${RETRY_COUNT} retries, ${BACKOFF_DELAY}s backoff"
else
    log "❌ Patch $PATCH_UUID resend failed (exit code: $RESEND_EXIT_CODE)"
    notify_dashboard "Patch $PATCH_UUID resend failed - will retry" "WARNING"
    echo "RESEND_FAILED" > "/tmp/patch-${PATCH_UUID}-status"
fi

log "🔧 Auto-repair pipeline completed for patch $PATCH_UUID (operation: $OPERATION_UUID)" 