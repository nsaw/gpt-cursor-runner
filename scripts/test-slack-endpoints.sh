#!/bin/bash

# Test all Slack slash command endpoints for 200 responses
# Usage: ./scripts/test-slack-endpoints.sh

BASE_URL="https://gpt-cursor-runner.fly.dev/slack/commands"
HEADERS="-H 'Content-Type: application/json'"

echo "🧪 Testing Slack slash command endpoints..."
echo "=========================================="

# Test data
TEST_USER="testuser"
TEST_USER_ID="U123456"
TEST_CHANNEL_ID="C123456"

# Function to test endpoint
test_endpoint() {
    local command=$1
    local description=$2
    
    echo "Testing: $command - $description"
    
    response=$(curl -s -w "%{http_code}" -o /tmp/response_$command \
        $BASE_URL \
        $HEADERS \
        -d "{\"command\":\"$command\",\"user_name\":\"$TEST_USER\",\"text\":\"\",\"user_id\":\"$TEST_USER_ID\",\"channel_id\":\"$TEST_CHANNEL_ID\"}")
    
    if [ "$response" = "200" ]; then
        echo "✅ $command - HTTP 200"
        return 0
    else
        echo "❌ $command - HTTP $response"
        return 1
    fi
}

# Test all known endpoints
declare -A endpoints=(
    ["/status-runner"]="Runner status check"
    ["/dashboard"]="Dashboard display"
    ["/whoami"]="User identity"
    ["/patch-approve"]="Patch approval"
    ["/patch-revert"]="Patch reversion"
    ["/pause-runner"]="Runner pause"
    ["/show-roadmap"]="Roadmap display"
    ["/roadmap"]="Roadmap"
    ["/kill"]="Kill runner"
    ["/toggle-runner-on"]="Start runner"
    ["/toggle-runner-off"]="Stop runner"
    ["/toggle-runner-auto"]="Auto runner toggle"
    ["/theme"]="Theme settings"
    ["/theme-status"]="Theme status"
    ["/theme-fix"]="Theme fix"
    ["/patch-preview"]="Patch preview"
    ["/revert-phase"]="Phase reversion"
    ["/log-phase-status"]="Phase status logging"
    ["/cursor-mode"]="Cursor mode"
    ["/lock-runner"]="Lock runner"
    ["/unlock-runner"]="Unlock runner"
    ["/alert-runner-crash"]="Crash alert"
    ["/proceed"]="Proceed action"
    ["/again"]="Repeat action"
    ["/manual-revise"]="Manual revision"
    ["/manual-append"]="Manual append"
    ["/interrupt"]="Interrupt action"
    ["/troubleshoot"]="Troubleshooting"
    ["/troubleshoot-oversight"]="Oversight troubleshooting"
    ["/send-with"]="Send with options"
    ["/gpt-slack-dispatch"]="GPT Slack dispatch"
    ["/cursor-slack-dispatch"]="Cursor Slack dispatch"
)

# Track results
passed=0
failed=0
failed_commands=()

echo "Starting endpoint tests..."
echo "========================"

for command in "${!endpoints[@]}"; do
    if test_endpoint "$command" "${endpoints[$command]}"; then
        ((passed++))
    else
        ((failed++))
        failed_commands+=("$command")
    fi
done

echo ""
echo "📊 Test Results Summary"
echo "======================"
echo "✅ Passed: $passed"
echo "❌ Failed: $failed"
echo ""

if [ $failed -gt 0 ]; then
    echo "❌ Failed endpoints:"
    for cmd in "${failed_commands[@]}"; do
        echo "  - $cmd"
    done
    echo ""
fi

# Save results to file
echo "Test completed at $(date)" > /tmp/slack-endpoint-test-results.txt
echo "Passed: $passed" >> /tmp/slack-endpoint-test-results.txt
echo "Failed: $failed" >> /tmp/slack-endpoint-test-results.txt
if [ ${#failed_commands[@]} -gt 0 ]; then
    echo "Failed commands: ${failed_commands[*]}" >> /tmp/slack-endpoint-test-results.txt
fi

echo "Results saved to /tmp/slack-endpoint-test-results.txt" 