#!/bin/bash
# start-main.sh
# Starts the MAIN project (gpt-cursor-runner) with port management

echo "🚀 Starting MAIN project..."

# Change to project directory
cd "$(dirname "$0")/.."

# Kill existing processes first
echo "🔄 Killing existing processes..."
./scripts/kill-ports-main.sh

# Set environment variables
export PYTHON_PORT=5051
export PORT=5555
export RUNNER_DEV_PORT=5051
export RUNNER_PORT=5555
export DEBUG_MODE=true
export LOG_LEVEL=INFO

# Start Python ghost runner
echo "📡 Starting Python ghost runner on port 5051..."
python3 -m gpt_cursor_runner.main &
PYTHON_PID=$!

# Wait for Python server to start
echo "⏳ Waiting for Python server to start..."
sleep 5

# Start Node.js server
echo "🖥️ Starting Node.js server on port 5555..."
node server/index.js &
NODE_PID=$!

# Wait for Node.js server to start
echo "⏳ Waiting for Node.js server to start..."
sleep 5

# Health checks
echo "🔍 Running health checks..."

# Check Python server
if curl -s http://localhost:5051/health > /dev/null 2>&1; then
    echo "✅ Python server healthy on port 5051"
else
    echo "❌ Python server failed on port 5051"
    echo "📋 Python server logs:"
    ps -p $PYTHON_PID >/dev/null 2>&1 && echo "Process still running" || echo "Process not found"
fi

# Check Node.js server
if curl -s http://localhost:5555/health > /dev/null 2>&1; then
    echo "✅ Node.js server healthy on port 5555"
else
    echo "❌ Node.js server failed on port 5555"
    echo "📋 Node.js server logs:"
    ps -p $NODE_PID >/dev/null 2>&1 && echo "Process still running" || echo "Process not found"
fi

# Show running processes
echo "📊 Running processes:"
ps aux | grep -E "(gpt_cursor_runner|server/index.js)" | grep -v grep

# Show port usage
echo "🔌 Port usage:"
lsof -i:5051,5555 2>/dev/null || echo "No processes found on ports 5051, 5555"

echo "🎉 MAIN project started successfully!"
echo "📡 Python Ghost Runner: http://localhost:5051"
echo "🖥️ Node.js Server: http://localhost:5555"
echo "📊 Dashboard: http://localhost:5555/dashboard"
echo "🔗 Health Check: http://localhost:5051/health" 
