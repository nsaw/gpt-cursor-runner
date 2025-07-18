#!/bin/bash

# Slack Relay Pipeline Repair Script
# Audits, evaluates, and repairs the Slack portion of the ghost relay pipeline

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WEBHOOK_URL="https://gpt-cursor-runner.fly.dev/slack/commands"
LOG_FILE="./logs/slack-relay-repair.log"

# Logging function
log() {
    local level="${1:-INFO}"
    local message="${2:-No message}"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    echo -e "${BLUE}[${timestamp}] [${level}]${NC} ${message}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Ensure log directory exists
mkdir -p ./logs

# Header
echo "=========================================="
echo "Slack Relay Pipeline Repair"
echo "tm-mobile-cursor Ghost Relay System"
echo "=========================================="
echo

# Phase 1: Audit Current State
log "INFO" "🔍 Phase 1: Auditing current Slack relay state..."

# Check webhook configurations
log "INFO" "Checking webhook configurations..."
webhook_issues=0

for script in "scripts/watchdog-runner.sh" "scripts/watchdog-health-check.sh" "scripts/watchdog-tunnel.sh"; do
    if [ -f "$script" ]; then
        if grep -q "DASHBOARD_WEBHOOK=" "$script"; then
            webhook_url=$(grep "DASHBOARD_WEBHOOK=" "$script" | cut -d'"' -f2)
            if [ "$webhook_url" = "$WEBHOOK_URL" ]; then
                success "Webhook URL correctly configured in $script"
            else
                warning "Webhook URL mismatch in $script: $webhook_url"
                webhook_issues=$((webhook_issues + 1))
            fi
        else
            error "No webhook configuration found in $script"
            webhook_issues=$((webhook_issues + 1))
        fi
    else
        error "Script not found: $script"
        webhook_issues=$((webhook_issues + 1))
    fi
done

# Check notification functions
log "INFO" "Checking notification functions..."
notification_issues=0

for script in "scripts/watchdog-runner.sh" "scripts/watchdog-health-check.sh" "scripts/watchdog-tunnel.sh"; do
    if [ -f "$script" ]; then
        has_notify=$(grep -c "notify_dashboard" "$script" || echo "0")
        has_curl=$(grep -c "curl" "$script" || echo "0")
        
        if [ "$has_notify" -gt 0 ] && [ "$has_curl" -gt 0 ]; then
            success "Notification functions present in $script"
        else
            warning "Missing notification components in $script"
            notification_issues=$((notification_issues + 1))
        fi
    fi
done

# Test connectivity
log "INFO" "Testing webhook connectivity..."
connectivity_test=$(curl -s --max-time 10 -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d '{"command":"/status-runner","text":"[SLACK-RELAY-REPAIR] Connectivity test","user_name":"tm-mobile-cursor","channel_id":"infrastructure"}' \
    -w "%{http_code}" -o /dev/null)

if [ "$connectivity_test" = "200" ]; then
    success "Webhook connectivity test successful"
    connectivity_issues=0
else
    error "Webhook connectivity test failed (HTTP $connectivity_test)"
    connectivity_issues=1
fi

# Phase 2: Repair Issues
log "INFO" "🔧 Phase 2: Repairing identified issues..."

repairs_made=0

# Repair webhook configurations
if [ $webhook_issues -gt 0 ]; then
    log "INFO" "Repairing webhook configurations..."
    
    for script in "scripts/watchdog-runner.sh" "scripts/watchdog-health-check.sh" "scripts/watchdog-tunnel.sh"; do
        if [ -f "$script" ]; then
            # Check if webhook URL is correct
            if ! grep -q "DASHBOARD_WEBHOOK=\"$WEBHOOK_URL\"" "$script"; then
                # Replace incorrect webhook URL
                sed -i.bak "s|DASHBOARD_WEBHOOK=\"[^\"]*\"|DASHBOARD_WEBHOOK=\"$WEBHOOK_URL\"|g" "$script"
                
                # Add webhook URL if missing
                if ! grep -q "DASHBOARD_WEBHOOK=" "$script"; then
                    # Find a good insertion point
                    if grep -q "CHECK_INTERVAL=" "$script"; then
                        sed -i.bak "/CHECK_INTERVAL=/a\\
DASHBOARD_WEBHOOK=\"$WEBHOOK_URL\"" "$script"
                    fi
                fi
                
                success "Repaired webhook configuration in $script"
                repairs_made=$((repairs_made + 1))
            fi
        fi
    done
fi

# Create Slack relay script if missing
if [ ! -f "scripts/slack-relay.sh" ]; then
    log "INFO" "Creating Slack relay script..."
    
    cat > scripts/slack-relay.sh << 'EOF'
#!/bin/bash

# Slack Relay Script for tm-mobile-cursor
# Handles Slack notifications and webhook communication

WEBHOOK_URL="https://gpt-cursor-runner.fly.dev/slack/commands"
LOG_FILE="./logs/slack-relay.log"

log() {
    local level="${1:-INFO}"
    local message="${2:-No message}"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    echo "[$timestamp] [${level}] ${message}" | tee -a "$LOG_FILE"
}

send_slack_notification() {
    local command="${1:-/status-runner}"
    local text="${2:-No message}"
    local username="${3:-tm-mobile-cursor}"
    local channel="${4:-infrastructure}"
    
    local payload="{
        \"command\": \"${command}\",
        \"text\": \"${text}\",
        \"user_name\": \"${username}\",
        \"channel_id\": \"${channel}\"
    }"
    
    log "INFO" "Sending Slack notification: ${command}"
    
    local response=$(curl -s --max-time 10 -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "${payload}")
    
    if [ $? -eq 0 ]; then
        log "INFO" "Slack notification sent successfully"
        echo "${response}"
    else
        log "ERROR" "Failed to send Slack notification"
        return 1
    fi
}

test_connectivity() {
    log "INFO" "Testing Slack relay connectivity..."
    send_slack_notification "/status-runner" "[SLACK-RELAY-TEST] Connectivity test from tm-mobile-cursor" "tm-mobile-cursor"
}

case "${1}" in
    "send")
        send_slack_notification "${2}" "${3}" "${4}" "${5}"
        ;;
    "test")
        test_connectivity
        ;;
    *)
        echo "Usage: $0 [send|test] [command] [text] [username] [channel]"
        echo "  send: Send a Slack notification"
        echo "  test: Test connectivity"
        exit 1
        ;;
esac
EOF

    chmod +x scripts/slack-relay.sh
    success "Created Slack relay script: scripts/slack-relay.sh"
    repairs_made=$((repairs_made + 1))
fi

# Phase 3: Verification
log "INFO" "🔍 Phase 3: Verifying repairs..."

# Test the new relay script
if [ -f "scripts/slack-relay.sh" ]; then
    log "INFO" "Testing new Slack relay script..."
    test_output=$(./scripts/slack-relay.sh test 2>&1)
    if [ $? -eq 0 ]; then
        success "Slack relay script test successful"
    else
        warning "Slack relay script test failed: $test_output"
    fi
fi

# Final connectivity test
log "INFO" "Performing final connectivity test..."
final_test=$(curl -s --max-time 10 -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d '{"command":"/status-runner","text":"[SLACK-RELAY-REPAIR] Final verification test","user_name":"tm-mobile-cursor","channel_id":"infrastructure"}' \
    -w "%{http_code}" -o /dev/null)

if [ "$final_test" = "200" ]; then
    success "Final connectivity test successful"
else
    error "Final connectivity test failed (HTTP $final_test)"
fi

# Summary
echo
echo "=========================================="
echo "Slack Relay Pipeline Repair Summary"
echo "=========================================="
echo

if [ $webhook_issues -eq 0 ] && [ $notification_issues -eq 0 ] && [ $connectivity_issues -eq 0 ]; then
    success "All Slack relay components are operational!"
    echo
    echo "✅ Webhook configurations: OK"
    echo "✅ Notification functions: OK"
    echo "✅ Connectivity: OK"
    echo "✅ Repairs made: $repairs_made"
else
    warning "Some issues remain:"
    echo
    echo "Webhook issues: $webhook_issues"
    echo "Notification issues: $notification_issues"
    echo "Connectivity issues: $connectivity_issues"
    echo "Repairs made: $repairs_made"
fi

echo
echo "📊 Status:"
echo "• Webhook URL: $WEBHOOK_URL"
echo "• Relay script: scripts/slack-relay.sh"
echo "• Log file: $LOG_FILE"
echo

# Exit with appropriate code
if [ $webhook_issues -eq 0 ] && [ $notification_issues -eq 0 ] && [ $connectivity_issues -eq 0 ]; then
    exit 0
else
    exit 1
fi 