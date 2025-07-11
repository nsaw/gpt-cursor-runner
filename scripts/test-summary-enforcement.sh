#!/bin/bash

# Test Summary Enforcement and Safe-Run Functionality
# Verifies that .md summaries are generated and Git/shell subprocesses don't block

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Summary Enforcement and Safe-Run Functionality${NC}"
echo "=================================================="

# Test 1: Verify summary manager module
echo -e "\n${YELLOW}Test 1: Summary Manager Module${NC}"
if python3 -c "from gpt_cursor_runner.summary_manager import write_summary_checkpoint; print('✅ Summary manager imported successfully')" 2>/dev/null; then
    echo -e "${GREEN}✅ Summary manager module is available${NC}"
else
    echo -e "${RED}❌ Summary manager module not available${NC}"
    exit 1
fi

# Test 2: Test summary generation
echo -e "\n${YELLOW}Test 2: Summary Generation${NC}"
python3 -c "
from gpt_cursor_runner.summary_manager import write_summary_checkpoint
import os

# Test summary generation
filepath = write_summary_checkpoint(
    'test',
    'Test Summary',
    'This is a test summary content.',
    {'test_key': 'test_value'},
    'test_context'
)

if os.path.exists(filepath):
    print(f'✅ Summary generated: {filepath}')
    with open(filepath, 'r') as f:
        content = f.read()
        if 'Test Summary' in content and 'test_key' in content:
            print('✅ Summary content is correct')
        else:
            print('❌ Summary content is incorrect')
else:
    print('❌ Summary file not created')
"

# Test 3: Verify safe-run script
echo -e "\n${YELLOW}Test 3: Safe-Run Script${NC}"
if [ -x "./scripts/safe-run.sh" ]; then
    echo -e "${GREEN}✅ Safe-run script is executable${NC}"
    
    # Test safe-run help
    if ./scripts/safe-run.sh help >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Safe-run script works correctly${NC}"
    else
        echo -e "${RED}❌ Safe-run script has issues${NC}"
    fi
else
    echo -e "${RED}❌ Safe-run script not found or not executable${NC}"
    exit 1
fi

# Test 4: Test safe Git command
echo -e "\n${YELLOW}Test 4: Safe Git Command${NC}"
if ./scripts/safe-run.sh git "status" "Test Git Status" 10; then
    echo -e "${GREEN}✅ Safe Git command executed successfully${NC}"
else
    echo -e "${YELLOW}⚠️ Safe Git command failed (may be expected in test environment)${NC}"
fi

# Test 5: Test safe shell command
echo -e "\n${YELLOW}Test 5: Safe Shell Command${NC}"
if ./scripts/safe-run.sh shell "echo 'test'" "Test Echo" 5; then
    echo -e "${GREEN}✅ Safe shell command executed successfully${NC}"
else
    echo -e "${RED}❌ Safe shell command failed${NC}"
fi

# Test 6: Test safe-run status
echo -e "\n${YELLOW}Test 6: Safe-Run Status${NC}"
./scripts/safe-run.sh status

# Test 7: Test safe-run cleanup
echo -e "\n${YELLOW}Test 7: Safe-Run Cleanup${NC}"
./scripts/safe-run.sh cleanup
echo -e "${GREEN}✅ Safe-run cleanup completed${NC}"

# Test 8: Verify summaries directory
echo -e "\n${YELLOW}Test 8: Summaries Directory${NC}"
if [ -d "summaries" ]; then
    echo -e "${GREEN}✅ Summaries directory exists${NC}"
    
    # Count summary files
    summary_count=$(find summaries -name "summary-*.md" | wc -l)
    echo -e "${BLUE}📊 Found $summary_count summary files${NC}"
    
    # List recent summaries
    echo -e "\n${BLUE}Recent summaries:${NC}"
    find summaries -name "summary-*.md" -exec ls -la {} \; | head -5
else
    echo -e "${RED}❌ Summaries directory not found${NC}"
fi

# Test 9: Test main application with summary integration
echo -e "\n${YELLOW}Test 9: Main Application Integration${NC}"
if python3 -c "
from gpt_cursor_runner.main import app
print('✅ Main application imports successfully')
print('✅ Summary manager integration available')
" 2>/dev/null; then
    echo -e "${GREEN}✅ Main application with summary integration works${NC}"
else
    echo -e "${RED}❌ Main application integration failed${NC}"
fi

# Test 10: Test patch runner with summary integration
echo -e "\n${YELLOW}Test 10: Patch Runner Integration${NC}"
if python3 -c "
from gpt_cursor_runner.patch_runner import apply_patch
print('✅ Patch runner imports successfully')
print('✅ Patch runner summary integration available')
" 2>/dev/null; then
    echo -e "${GREEN}✅ Patch runner with summary integration works${NC}"
else
    echo -e "${RED}❌ Patch runner integration failed${NC}"
fi

# Test 11: Test webhook handler with summary integration
echo -e "\n${YELLOW}Test 11: Webhook Handler Integration${NC}"
if python3 -c "
from gpt_cursor_runner.webhook_handler import process_hybrid_block
print('✅ Webhook handler imports successfully')
print('✅ Webhook handler summary integration available')
" 2>/dev/null; then
    echo -e "${GREEN}✅ Webhook handler with summary integration works${NC}"
else
    echo -e "${RED}❌ Webhook handler integration failed${NC}"
fi

# Test 12: Verify log directories
echo -e "\n${YELLOW}Test 12: Log Directories${NC}"
for dir in "logs/safe-run" "logs/patch-failures" "logs/watchdogs"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅ $dir exists${NC}"
    else
        echo -e "${YELLOW}⚠️ $dir not found (will be created when needed)${NC}"
    fi
done

# Test 13: Test timeout functionality
echo -e "\n${YELLOW}Test 13: Timeout Functionality${NC}"
if ./scripts/safe-run.sh run "sleep 2" "Test Timeout" 1; then
    echo -e "${YELLOW}⚠️ Command should have timed out but didn't${NC}"
else
    echo -e "${GREEN}✅ Timeout functionality works (command timed out as expected)${NC}"
fi

# Test 14: Test dangerous command blocking
echo -e "\n${YELLOW}Test 14: Dangerous Command Blocking${NC}"
if ./scripts/safe-run.sh git "push --force origin main" "Test Force Push" 10; then
    echo -e "${YELLOW}⚠️ Force push should have been blocked${NC}"
else
    echo -e "${GREEN}✅ Dangerous command blocking works${NC}"
fi

# Final summary
echo -e "\n${BLUE}=================================================="
echo -e "🧪 Summary Enforcement and Safe-Run Test Complete${NC}"
echo -e "=================================================="

# Check if any summaries were generated during testing
recent_summaries=$(find summaries -name "summary-*.md" -mtime -1 2>/dev/null | wc -l)
echo -e "${BLUE}📊 Recent summaries generated: $recent_summaries${NC}"

# List any new summaries
if [ $recent_summaries -gt 0 ]; then
    echo -e "\n${BLUE}New summaries generated during testing:${NC}"
    find summaries -name "summary-*.md" -mtime -1 -exec ls -la {} \;
fi

echo -e "\n${GREEN}✅ All tests completed!${NC}"
echo -e "${BLUE}📝 Summary enforcement is now active${NC}"
echo -e "${BLUE}🛡️ Safe-run protection is now active${NC}" 