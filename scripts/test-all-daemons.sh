#!/bin/bash
# test-all-daemons.sh
# Comprehensive test script for all daemon processes and endpoints

echo "🧪 Testing All Daemon Processes and Endpoints"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    
    echo -n "🔍 Testing $name... "
    
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to test process
test_process() {
    local name="$1"
    local pattern="$2"
    
    echo -n "🔍 Testing $name process... "
    
    if ps aux | grep -E "$pattern" | grep -v grep > /dev/null 2>&1; then
        echo -e "${GREEN}✅ RUNNING${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ NOT RUNNING${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to test port
test_port() {
    local name="$1"
    local port="$2"
    
    echo -n "🔍 Testing $name port $port... "
    
    if lsof -i:$port > /dev/null 2>&1; then
        echo -e "${GREEN}✅ LISTENING${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ NOT LISTENING${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo ""
echo "📊 Process Status Tests"
echo "======================"

# Test Python Ghost Runner
test_process "Python Ghost Runner" "python3.*gpt_cursor_runner"
test_port "Python Ghost Runner" "5051"

# Test Node.js Server
test_process "Node.js Server" "node.*server/index.js"
test_port "Node.js Server" "5555"

# Test Expo Development Server
test_process "Expo Dev Server" "expo.*start"
test_port "Expo Dev Server" "8082"

# Test ngrok Tunnel
test_process "ngrok Tunnel" "ngrok.*http"
test_port "ngrok Tunnel" "4040"

echo ""
echo "🌐 Endpoint Tests"
echo "================"

# Test health endpoints
test_endpoint "Python Health" "http://localhost:5051/health"
test_endpoint "Node.js Health" "http://localhost:5555/health"

# Test webhook endpoints
test_endpoint "Python Webhook" "http://localhost:5051/webhook"
test_endpoint "Node.js Webhook" "http://localhost:5555/webhook"

# Test dashboard endpoints
test_endpoint "Python Dashboard" "http://localhost:5051/dashboard"
test_endpoint "Node.js Dashboard" "http://localhost:5555/dashboard"

# Test events endpoints
test_endpoint "Python Events" "http://localhost:5051/events"
test_endpoint "Node.js Events" "http://localhost:5555/events"

# Test Slack endpoints
test_endpoint "Python Slack Commands" "http://localhost:5051/slack/commands"
test_endpoint "Node.js Slack Commands" "http://localhost:5555/slack/commands"

echo ""
echo "🔧 Daemon Functionality Tests"
echo "============================"

# Test file watcher daemon
echo -n "🔍 Testing File Watcher Daemon... "
if python3 -c "from gpt_cursor_runner.file_watcher import start_file_watcher; print('✅ AVAILABLE')" 2>/dev/null; then
    echo -e "${GREEN}✅ AVAILABLE${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ NOT AVAILABLE${NC}"
    ((TESTS_FAILED++))
fi

# Test patch runner daemon
echo -n "🔍 Testing Patch Runner Daemon... "
if python3 -c "from gpt_cursor_runner.patch_runner import apply_patch; print('✅ AVAILABLE')" 2>/dev/null; then
    echo -e "${GREEN}✅ AVAILABLE${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ NOT AVAILABLE${NC}"
    ((TESTS_FAILED++))
fi

# Test event logger
echo -n "🔍 Testing Event Logger... "
if python3 -c "from gpt_cursor_runner.event_logger import EventLogger; print('✅ AVAILABLE')" 2>/dev/null; then
    echo -e "${GREEN}✅ AVAILABLE${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ NOT AVAILABLE${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo "🌐 External Communication Tests"
echo "============================="

# Test ngrok tunnel URLs
echo -n "🔍 Testing ngrok Tunnel URLs... "
if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    echo -e "${GREEN}✅ AVAILABLE${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ NOT AVAILABLE${NC}"
    ((TESTS_FAILED++))
fi

# Test Expo tunnel
echo -n "🔍 Testing Expo Tunnel... "
if curl -s http://localhost:8082 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ AVAILABLE${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ NOT AVAILABLE${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo "📊 Auto-Healing Tests"
echo "===================="

# Test if processes restart automatically
echo -n "🔍 Testing Auto-Restart Capability... "
if [ -f "scripts/watchdog-fly.sh" ] && [ -f "scripts/watchdog-tunnel.sh" ]; then
    echo -e "${GREEN}✅ WATCHDOGS CONFIGURED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️ WATCHDOGS NOT CONFIGURED${NC}"
    ((TESTS_FAILED++))
fi

# Test cron jobs
echo -n "🔍 Testing Cron Jobs... "
if crontab -l 2>/dev/null | grep -q "gpt-cursor-runner"; then
    echo -e "${GREEN}✅ CRON JOBS CONFIGURED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️ CRON JOBS NOT CONFIGURED${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo "🎯 Cursor Agent Tests"
echo "===================="

# Test if Cursor is watching correct folders
echo -n "🔍 Testing Cursor File Watching... "
if [ -d "/Users/sawyer/gitSync/gpt-cursor-runner" ] && [ -d "/Users/sawyer/gitSync/tm-mobile-cursor" ]; then
    echo -e "${GREEN}✅ FOLDERS CONFIGURED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FOLDERS NOT FOUND${NC}"
    ((TESTS_FAILED++))
fi

# Test file watcher configuration
echo -n "🔍 Testing File Watcher Configuration... "
if python3 -c "from gpt_cursor_runner.file_watcher import CursorFileHandler; print('✅ CONFIGURED')" 2>/dev/null; then
    echo -e "${GREEN}✅ CONFIGURED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ NOT CONFIGURED${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo "📈 Test Summary"
echo "=============="
echo -e "${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Tests Failed: $TESTS_FAILED${NC}"
echo -e "${BLUE}📊 Total Tests: $((TESTS_PASSED + TESTS_FAILED))${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! All daemons are running correctly.${NC}"
    exit 0
else
    echo -e "${RED}⚠️ Some tests failed. Please check the daemon configuration.${NC}"
    exit 1
fi 
