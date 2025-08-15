#!/bin/bash
# start-ghost-runner-external.sh
# Starts the Ghost Runner with external access for GPT communication

echo "🚀 Starting Ghost Runner with external access..."

# Change to project directory
cd "$(dirname "$0")/.."

# Kill existing processes first
echo "🔄 Killing existing processes..."
./scripts/kill-all-ports.sh

# Set environment variables
export PYTHON_PORT=5051
export NODE_PORT=5555
export EXPO_PORT=8082
export NGROK_PORT=4040
export DAEMON_MODE=true
export WATCHER_ENABLED=true
export PATCH_RUNNER_ENABLED=true
export AUTO_PATCH_ENABLED=true

# Start Python ghost runner daemon
echo "📡 Starting Python ghost runner daemon on port 5051..."
python3 -m gpt_cursor_runner.main --daemon --port 5051 &
PYTHON_PID=$!

# Wait for Python server to start
echo "⏳ Waiting for Python server to start..."
sleep 5

# Start Node.js server daemon
echo "🖥️ Starting Node.js server daemon on port 5555..."
node server/index.js --daemon --port 5555 &
NODE_PID=$!

# Wait for Node.js server to start
echo "⏳ Waiting for Node.js server to start..."
sleep 5

# Start file watcher daemon
echo "👁️ Starting file watcher daemon..."
python3 -m gpt_cursor_runner.file_watcher --daemon &
WATCHER_PID=$!

# Wait for file watcher to start
echo "⏳ Waiting for file watcher to start..."
sleep 3

# Start patch runner daemon
echo "🔧 Starting patch runner daemon..."
python3 -m gpt_cursor_runner.patch_runner --daemon &
PATCH_PID=$!

# Wait for patch runner to start
echo "⏳ Waiting for patch runner to start..."
sleep 3

# Start ngrok tunnels
echo "🌐 Starting ngrok tunnels..."
ngrok http 5051 --log=stdout > /tmp/ngrok-python.log 2>&1 &
NGROK_PYTHON_PID=$!

ngrok http 5555 --log=stdout > /tmp/ngrok-node.log 2>&1 &
NGROK_NODE_PID=$!

# Wait for ngrok to start
echo "⏳ Waiting for ngrok tunnels to start..."
sleep 10

# Start Expo with tunnel
echo "📱 Starting Expo with tunnel..."
cd /Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh
npx expo start --tunnel --port 8082 &
EXPO_PID=$!

# Wait for Expo to start
echo "⏳ Waiting for Expo tunnel to start..."
sleep 8

# Get ngrok URLs
echo "🔍 Getting ngrok tunnel URLs..."
PYTHON_TUNNEL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null || echo "https://python.ngrok.io")
NODE_TUNNEL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[1].public_url' 2>/dev/null || echo "https://node.ngrok.io")

# Health checks
echo "🔍 Running health checks..."

# Check Python server
if curl -s http://localhost:5051/health > /dev/null 2>&1; then
    echo "✅ Python server healthy on port 5051"
else
    echo "❌ Python server failed on port 5051"
fi

# Check Node.js server
if curl -s http://localhost:5555/health > /dev/null 2>&1; then
    echo "✅ Node.js server healthy on port 5555"
else
    echo "❌ Node.js server failed on port 5555"
fi

# Check ngrok tunnels
if curl -s "$PYTHON_TUNNEL/health" > /dev/null 2>&1; then
    echo "✅ Python ngrok tunnel healthy: $PYTHON_TUNNEL"
else
    echo "❌ Python ngrok tunnel failed: $PYTHON_TUNNEL"
fi

if curl -s "$NODE_TUNNEL/health" > /dev/null 2>&1; then
    echo "✅ Node.js ngrok tunnel healthy: $NODE_TUNNEL"
else
    echo "❌ Node.js ngrok tunnel failed: $NODE_TUNNEL"
fi

# Show running processes
echo "📊 Running processes:"
ps aux | grep -E "(gpt_cursor_runner|node server/index.js|ngrok|expo)" | grep -v grep

# Show port usage
echo "🔌 Port usage:"
lsof -i:5051,5555,8081,4040 2>/dev/null || echo "No processes found on ports 5051, 5555, 8081, 4040"

# Show tunnel URLs
echo "🌐 Tunnel URLs:"
echo "📡 Python Ghost Runner: $PYTHON_TUNNEL"
echo "🖥️ Node.js Server: $NODE_TUNNEL"
echo "📱 Expo Tunnel: https://exp.direct/abc123"
echo "🌐 ngrok Dashboard: http://localhost:4040"

# Show external communication endpoints
echo "🎯 External Communication Endpoints:"
echo "🔗 GPT Webhook: $PYTHON_TUNNEL/webhook"
echo "📊 Dashboard: $NODE_TUNNEL/dashboard"
echo "📡 Events: $PYTHON_TUNNEL/events"
echo "🔧 Slack Commands: $NODE_TUNNEL/slack/commands"

echo "🎉 Ghost Runner started with external access!"
echo ""
echo "📋 Next Steps:"
echo "1. Configure GPT to use webhook: $PYTHON_TUNNEL/webhook"
echo "2. Test Slack commands: $NODE_TUNNEL/slack/commands"
echo "3. Monitor dashboard: $NODE_TUNNEL/dashboard"
echo "4. View ngrok dashboard: http://localhost:4040"
echo ""
echo "🛑 To stop all services: ./scripts/kill-all-ports.sh" 
