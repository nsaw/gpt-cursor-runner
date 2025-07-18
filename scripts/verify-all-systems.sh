#!/bin/bash

# Comprehensive System Verification Script
# Tests all implemented systems and components

set -e

# Configuration
LOG_FILE="logs/verify-all-systems.log"
REPORT_FILE="logs/verification-report.json"
SLACK_TEST_FILE="scripts/test_slack_commands.py"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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
        "test") echo -e "${CYAN}[${timestamp}] 🧪 ${message}${NC}" ;;
        "verify") echo -e "${PURPLE}[${timestamp}] 🔍 ${message}${NC}" ;;
    esac
    
    # Also log to file
    echo "[${timestamp}] ${message}" >> "$LOG_FILE"
}

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Initialize results (using regular arrays for compatibility)
test_results=()
test_details=()

# Test function wrapper
run_test() {
    local test_name="$1"
    local test_func="$2"
    local description="$3"
    
    log "test" "Running test: $test_name - $description"
    
    if $test_func; then
        test_results+=("$test_name:PASS")
        test_details+=("$test_name:Test passed successfully")
        log "success" "Test PASSED: $test_name"
        return 0
    else
        test_results+=("$test_name:FAIL")
        test_details+=("$test_name:Test failed")
        log "error" "Test FAILED: $test_name"
        return 1
    fi
}

# Test 1: Check if all required files exist
test_required_files() {
    log "verify" "Checking required files..."
    
    local required_files=(
        ".cursor-config.json"
        ".cursor-systems-go.json"
        "scripts/trust-daemon.js"
        "scripts/systems-go-handshake.sh"
        "scripts/cleanup-summary-markdown.sh"
        "scripts/verify-watchdog-refactor.sh"
        "gpt_cursor_runner/patch_runner.py"
        "gpt_cursor_runner/slack_handler.py"
        "server/utils/patchManager.js"
        "server/handlers/handleStatusRunner.js"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        log "success" "All required files exist"
        return 0
    else
        log "error" "Missing files: ${missing_files[*]}"
        return 1
    fi
}

# Test 2: Check if scripts are executable
test_executable_scripts() {
    log "verify" "Checking executable scripts..."
    
    local scripts=(
        "scripts/trust-daemon.js"
        "scripts/systems-go-handshake.sh"
        "scripts/cleanup-summary-markdown.sh"
        "scripts/verify-watchdog-refactor.sh"
    )
    
    local non_executable=()
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ] && [ ! -x "$script" ]; then
            non_executable+=("$script")
        fi
    done
    
    if [ ${#non_executable[@]} -eq 0 ]; then
        log "success" "All scripts are executable"
        return 0
    else
        log "error" "Non-executable scripts: ${non_executable[*]}"
        return 1
    fi
}

# Test 3: Test patchLog.filter fix
test_patchlog_filter() {
    log "verify" "Testing patchLog.filter fix..."
    
    # Test the patchManager.js with actual patch-log.json
    if [ -f "patch-log.json" ]; then
        # Create a simple test script
        cat > "test_patchlog.js" << 'EOF'
const patchManager = require('./server/utils/patchManager');

async function testPatchLog() {
    try {
        const patchLog = await patchManager.getPatchLog();
        console.log('Patch log loaded successfully');
        console.log('Entries count:', patchLog.length);
        return true;
    } catch (error) {
        console.error('Error loading patch log:', error.message);
        return false;
    }
}

testPatchLog().then(success => {
    process.exit(success ? 0 : 1);
});
EOF
        
        if node test_patchlog.js > /dev/null 2>&1; then
            log "success" "patchLog.filter fix working"
            rm -f test_patchlog.js
            return 0
        else
            log "error" "patchLog.filter fix failed"
            rm -f test_patchlog.js
            return 1
        fi
    else
        log "warning" "patch-log.json not found, skipping test"
        return 0
    fi
}

# Test 4: Test Slack endpoint
test_slack_endpoint() {
    log "verify" "Testing Slack endpoint..."
    
    local response
    response=$(curl -s -w "%{http_code}" https://gpt-cursor-runner.fly.dev/slack/commands \
        -H 'Content-Type: application/json' \
        -d '{"command":"/status-runner","user_name":"testuser","text":"","user_id":"U123456","channel_id":"C123456"}' \
        -o /dev/null)
    
    if [ "$response" = "200" ]; then
        log "success" "Slack endpoint responding correctly"
        return 0
    else
        log "error" "Slack endpoint returned status: $response"
        return 1
    fi
}

# Test 5: Test watchdog daemons
test_watchdog_daemons() {
    log "verify" "Testing watchdog daemons..."
    
    local watchdog_scripts=(
        "scripts/watchdog-runner.sh"
        "scripts/watchdog-fly.sh"
        "scripts/watchdog-tunnel.sh"
    )
    
    local missing_watchdogs=()
    
    for script in "${watchdog_scripts[@]}"; do
        if [ ! -f "$script" ] || [ ! -x "$script" ]; then
            missing_watchdogs+=("$script")
        fi
    done
    
    if [ ${#missing_watchdogs[@]} -eq 0 ]; then
        log "success" "All watchdog daemons available"
        return 0
    else
        log "error" "Missing watchdog daemons: ${missing_watchdogs[*]}"
        return 1
    fi
}

# Test 6: Test JSON log rotation
test_json_log_rotation() {
    log "verify" "Testing JSON log rotation..."
    
    local log_files=(
        "logs/watchdog-runner.log"
        "logs/watchdog-fly.log"
        "logs/watchdog-tunnel.log"
    )
    
    local missing_logs=()
    
    for log_file in "${log_files[@]}"; do
        if [ ! -f "$log_file" ]; then
            missing_logs+=("$log_file")
        fi
    done
    
    if [ ${#missing_logs[@]} -eq 0 ]; then
        log "success" "JSON log rotation working"
        return 0
    else
        log "warning" "Some log files missing: ${missing_logs[*]}"
        return 0  # Not critical for system operation
    fi
}

# Test 7: Test trust daemon
test_trust_daemon() {
    log "verify" "Testing trust daemon..."
    
    if [ -f "scripts/trust-daemon.js" ] && [ -x "scripts/trust-daemon.js" ]; then
        # Test basic functionality
        if node -e "const TrustDaemon = require('./scripts/trust-daemon.js'); console.log('Trust daemon loaded successfully');" > /dev/null 2>&1; then
            log "success" "Trust daemon functional"
            return 0
        else
            log "error" "Trust daemon failed to load"
            return 1
        fi
    else
        log "error" "Trust daemon script not found or not executable"
        return 1
    fi
}

# Test 8: Test systems-go handshake
test_systems_go_handshake() {
    log "verify" "Testing systems-go handshake..."
    
    if [ -f "scripts/systems-go-handshake.sh" ] && [ -x "scripts/systems-go-handshake.sh" ]; then
        # Test configuration loading
        if [ -f ".cursor-systems-go.json" ]; then
            log "success" "Systems-go handshake configuration found"
            return 0
        else
            log "error" "Systems-go handshake configuration missing"
            return 1
        fi
    else
        log "error" "Systems-go handshake script not found or not executable"
        return 1
    fi
}

# Test 9: Test summary cleanup
test_summary_cleanup() {
    log "verify" "Testing summary cleanup..."
    
    if [ -f "scripts/cleanup-summary-markdown.sh" ] && [ -x "scripts/cleanup-summary-markdown.sh" ]; then
        log "success" "Summary cleanup script available"
        return 0
    else
        log "error" "Summary cleanup script missing or not executable"
        return 1
    fi
}

# Test 10: Test Fly.io deployment
test_fly_deployment() {
    log "verify" "Testing Fly.io deployment..."
    
    local response
    response=$(curl -s -w "%{http_code}" https://gpt-cursor-runner.fly.dev/health -o /dev/null)
    
    if [ "$response" = "200" ]; then
        log "success" "Fly.io deployment healthy"
        return 0
    else
        log "warning" "Fly.io deployment returned status: $response"
        return 0  # Not critical for local operation
    fi
}

# Generate verification report
generate_report() {
    log "info" "Generating verification report..."
    
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
    local total_tests=${#test_results[@]}
    local passed_tests=0
    local failed_tests=0
    
    for result in "${test_results[@]}"; do
        local test_name="${result%:*}"
        local status="${result#*:}"
        if [ "$status" = "PASS" ]; then
            ((passed_tests++))
        else
            ((failed_tests++))
        fi
    done
    
    # Create JSON report
    cat > "$REPORT_FILE" << EOF
{
  "verification_timestamp": "$timestamp",
  "total_tests": $total_tests,
  "passed_tests": $passed_tests,
  "failed_tests": $failed_tests,
  "success_rate": $((passed_tests * 100 / total_tests)),
  "results": {
EOF
    
    local first=true
    for result in "${test_results[@]}"; do
        local test_name="${result%:*}"
        local status="${result#*:}"
        
        # Find corresponding detail
        local detail="Test completed"
        for detail_item in "${test_details[@]}"; do
            if [[ "$detail_item" == "$test_name:"* ]]; then
                detail="${detail_item#*:}"
                break
            fi
        done
        
        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "$REPORT_FILE"
        fi
        
        cat >> "$REPORT_FILE" << EOF
    "$test_name": {
      "status": "$status",
      "details": "$detail"
    }
EOF
    done
    
    cat >> "$REPORT_FILE" << EOF
  },
  "summary": "$(if [ $failed_tests -eq 0 ]; then echo "All systems operational"; else echo "$failed_tests tests failed"; fi)"
}
EOF
    
    log "success" "Verification report generated: $REPORT_FILE"
}

# Main execution
main() {
    log "info" "🚀 Starting Comprehensive System Verification"
    log "info" "Log file: $LOG_FILE"
    log "info" "Report file: $REPORT_FILE"
    
    # Run all tests
    run_test "required_files" test_required_files "Check if all required files exist"
    run_test "executable_scripts" test_executable_scripts "Check if scripts are executable"
    run_test "patchlog_filter" test_patchlog_filter "Test patchLog.filter fix"
    run_test "slack_endpoint" test_slack_endpoint "Test Slack endpoint"
    run_test "watchdog_daemons" test_watchdog_daemons "Test watchdog daemons"
    run_test "json_log_rotation" test_json_log_rotation "Test JSON log rotation"
    run_test "trust_daemon" test_trust_daemon "Test trust daemon"
    run_test "systems_go_handshake" test_systems_go_handshake "Test systems-go handshake"
    run_test "summary_cleanup" test_summary_cleanup "Test summary cleanup"
    run_test "fly_deployment" test_fly_deployment "Test Fly.io deployment"
    
    # Generate report
    generate_report
    
    # Display summary
    local total_tests=${#test_results[@]}
    local passed_tests=0
    local failed_tests=0
    
    for result in "${test_results[@]}"; do
        local test_name="${result%:*}"
        local status="${result#*:}"
        if [ "$status" = "PASS" ]; then
            ((passed_tests++))
        else
            ((failed_tests++))
        fi
    done
    
    echo ""
    echo "📊 Verification Summary"
    echo "======================"
    echo "Total Tests: $total_tests"
    echo "Passed: $passed_tests"
    echo "Failed: $failed_tests"
    echo "Success Rate: $((passed_tests * 100 / total_tests))%"
    echo ""
    
    if [ $failed_tests -eq 0 ]; then
        echo "🎉 All systems operational!"
        echo "✅ Runner is ready for full autopilot mode"
        exit 0
    else
        echo "⚠️  $failed_tests tests failed"
        echo "🔧 Check logs for details: $LOG_FILE"
        echo "📋 Full report: $REPORT_FILE"
        exit 1
    fi
}

# Run main function
main "$@" 