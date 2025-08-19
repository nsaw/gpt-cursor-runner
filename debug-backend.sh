#!/bin/bash

echo "🔍 Debugging backend-api detection..."

# Test 1: Check if port is in use
echo "1. Checking if port 4000 is in use..."
if lsof -i :4000 > /dev/null 2>&1; then
    echo "✅ Port 4000 is in use"
    lsof -i :4000
else
    echo "❌ Port 4000 is not in use"
fi

# Test 2: Check if node process is on the port
echo ""
echo "2. Checking if node process is on port 4000..."
if lsof -i :4000 | grep -q "node"; then
    echo "✅ Node process found on port 4000"
else
    echo "❌ No node process found on port 4000"
fi

# Test 3: Check health endpoint
echo ""
echo "3. Testing health endpoint..."
if curl -s --max-time 5 "http://localhost:4000/health" | grep -q '"status"'; then
    echo "✅ Health endpoint responding with status field"
else
    echo "❌ Health endpoint not responding or missing status field"
fi

# Test 4: Check PID file
echo ""
echo "4. Checking PID file..."
if [ -f "pids/backend-api.pid" ]; then
    echo "✅ PID file exists"
    cat pids/backend-api.pid
    if ps -p $(cat pids/backend-api.pid) > /dev/null 2>&1; then
        echo "✅ Process in PID file is running"
    else
        echo "❌ Process in PID file is not running"
    fi
else
    echo "❌ PID file does not exist"
fi

echo ""
echo "🔍 Debug complete" 
