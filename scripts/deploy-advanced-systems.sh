#!/bin/bash

# Advanced GHOST Systems Deployment Script
# Deploys all advanced components with proper error handling and validation

set -e

echo "🚀 DEPLOYING ADVANCED GHOST SYSTEMS"
echo "=================================="

# Configuration
REAL_TIME_API_PORT=8789
AUTONOMOUS_TRIGGER_PORT=8790
COMPREHENSIVE_DASHBOARD_PORT=3002
TELEMETRY_API_PORT=8788
MAIN_RUNNER_PORT=5051

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if port is available
check_port() {
    local port=$1
    local service=$2
    if lsof -i :$port >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port is already in use by $service${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $port is available${NC}"
        return 0
    fi
}

# Function to start service with validation
start_service() {
    local script=$1
    local port=$2
    local service_name=$3
    
    echo -e "${BLUE}🔧 Starting $service_name...${NC}"
    
    if check_port $port "$service_name"; then
        # Start service in background with proper error handling
        { node scripts/$script & } >/dev/null 2>&1 & disown
        local pid=$!
        
        # Wait a moment for service to start
        sleep 3
        
        # Check if service is running
        if ps -p $pid >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name started successfully (PID: $pid)${NC}"
            return 0
        else
            echo -e "${RED}❌ Failed to start $service_name${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⏭️  Skipping $service_name (port $port already in use)${NC}"
        return 0
    fi
}

# Function to test service health
test_service_health() {
    local port=$1
    local service_name=$2
    local endpoint=${3:-/health}
    
    echo -e "${BLUE}🏥 Testing $service_name health...${NC}"
    
    # Test with curl (non-blocking)
    { curl -s -o /dev/null -w "%{http_code}" http://localhost:$port$endpoint & } >/dev/null 2>&1 & disown
    
    # Wait for response
    sleep 2
    
    # Check if service responded
    if curl -s http://localhost:$port$endpoint >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name health check passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name health check failed${NC}"
        return 1
    fi
}

# Function to run comprehensive tests
run_system_tests() {
    echo -e "${BLUE}🧪 Running comprehensive system tests...${NC}"
    
    # Run the enhanced system test suite
    { node scripts/test-enhanced-system.js & } >/dev/null 2>&1 & disown
    
    # Run advanced systems test
    { node scripts/test-advanced-systems.js & } >/dev/null 2>&1 & disown
    
    echo -e "${GREEN}✅ System tests initiated${NC}"
}

# Main deployment sequence
echo -e "${BLUE}📋 Starting deployment sequence...${NC}"

# 1. Start Real-Time Status API
start_service "real-time-status-api.js" $REAL_TIME_API_PORT "Real-Time Status API"

# 2. Start Autonomous Patch Trigger
start_service "autonomous-patch-trigger.js" $AUTONOMOUS_TRIGGER_PORT "Autonomous Patch Trigger"

# 3. Start Comprehensive Dashboard
start_service "comprehensive-dashboard.js" $COMPREHENSIVE_DASHBOARD_PORT "Comprehensive Dashboard"

# 4. Test service health
echo -e "${BLUE}🏥 Testing service health...${NC}"
sleep 5

if check_port $REAL_TIME_API_PORT "Real-Time Status API"; then
    test_service_health $REAL_TIME_API_PORT "Real-Time Status API"
fi

if check_port $AUTONOMOUS_TRIGGER_PORT "Autonomous Patch Trigger"; then
    test_service_health $AUTONOMOUS_TRIGGER_PORT "Autonomous Patch Trigger"
fi

if check_port $COMPREHENSIVE_DASHBOARD_PORT "Comprehensive Dashboard"; then
    test_service_health $COMPREHENSIVE_DASHBOARD_PORT "Comprehensive Dashboard"
fi

# 5. Run system tests
run_system_tests

# 6. Display system status
echo -e "${BLUE}📊 System Status Summary:${NC}"
echo "=================================="

echo -e "${BLUE}🔍 Checking all service ports...${NC}"
for port in $REAL_TIME_API_PORT $AUTONOMOUS_TRIGGER_PORT $COMPREHENSIVE_DASHBOARD_PORT $TELEMETRY_API_PORT $MAIN_RUNNER_PORT; do
    if lsof -i :$port >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Port $port: ACTIVE${NC}"
    else
        echo -e "${RED}❌ Port $port: INACTIVE${NC}"
    fi
done

# 7. Display access URLs
echo -e "${BLUE}🌐 Service Access URLs:${NC}"
echo "=============================="
echo -e "${GREEN}📊 Comprehensive Dashboard: http://localhost:$COMPREHENSIVE_DASHBOARD_PORT${NC}"
echo -e "${GREEN}📡 Real-Time Status API: http://localhost:$REAL_TIME_API_PORT${NC}"
echo -e "${GREEN}🤖 Autonomous Patch Trigger: http://localhost:$AUTONOMOUS_TRIGGER_PORT${NC}"
echo -e "${GREEN}📊 Telemetry API: http://localhost:$TELEMETRY_API_PORT${NC}"

echo -e "${GREEN}🎉 Advanced GHOST Systems deployment completed!${NC}"
echo "==================================================" 
