#!/bin/bash
# start-fly-deployment.sh
# Starts the system configured for Fly.io deployment
# No local Python/Node.js servers - uses Fly.io endpoints

echo "🚀 Starting system with Fly.io deployment..."

# Change to project directory
cd "$(dirname "$0")/.."

# Kill any existing local processes
echo "🔄 Cleaning up local processes..."
./scripts/kill-all-ports.sh

# Set environment variables for Fly.io deployment
export FLY_DEPLOYMENT=true
export RUNNER_URL="https://gpt-cursor-runner.fly.dev"
export WEBHOOK_URL="https://gpt-cursor-runner.fly.dev/webhook"
export DASHBOARD_URL="https://gpt-cursor-runner.fly.dev/dashboard"
export HEALTH_URL="https://gpt-cursor-runner.fly.dev/health"

# Check Fly.io deployment status
echo "🔍 Checking Fly.io deployment status..."
if command -v fly &> /dev/null; then
    fly status --app gpt-cursor-runner > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Fly.io deployment is running"
    else
        echo "❌ Fly.io deployment is not running"
        echo "🔄 Deploying to Fly.io..."
        fly deploy --app gpt-cursor-runner
    fi
else
    echo "⚠️ Fly.io CLI not installed"
fi

# Health checks for Fly.io endpoints
echo "🔍 Running health checks..."

# Check Python ghost-runner health
if curl -s "$HEALTH_URL" > /dev/null 2>&1; then
    echo "✅ Python ghost-runner healthy on Fly.io"
else
    echo "❌ Python ghost-runner health check failed"
fi

# Check webhook endpoint
if curl -s -X POST -H "Content-Type: application/json" \
    -d '{"id": "health_check", "role": "system", "content": "health check"}' \
    "$WEBHOOK_URL" > /dev/null 2>&1; then
    echo "✅ Webhook endpoint responding"
else
    echo "❌ Webhook endpoint failed"
fi

# Start local development services (if needed)
echo "🖥️ Starting local development services..."

# Start Expo for mobile development
if [ -d "/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh" ]; then
    echo "📱 Starting Expo development server..."
    cd /Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh
    npx expo start --tunnel --port 8082 &
    EXPO_PID=$!
    cd - > /dev/null
    echo "✅ Expo started with PID $EXPO_PID"
else
    echo "⚠️ tm-mobile-cursor directory not found"
fi

# Start monitoring systems
echo "👁️ Starting monitoring systems..."

# Start file watcher (if needed for local development)
if [ -f "gpt_cursor_runner/file_watcher.py" ]; then
    echo "📁 Starting file watcher..."
    python3 -m gpt_cursor_runner.file_watcher --daemon &
    WATCHER_PID=$!
    echo "✅ File watcher started with PID $WATCHER_PID"
fi

# Start patch runner (if needed for local development)
if [ -f "gpt_cursor_runner/patch_runner.py" ]; then
    echo "🔧 Starting patch runner..."
    python3 -m gpt_cursor_runner.patch_runner --daemon &
    PATCH_PID=$!
    echo "✅ Patch runner started with PID $PATCH_PID"
fi

# Display system status
echo ""
echo "🎯 System Status:"
echo "📡 Fly.io Deployment: $RUNNER_URL"
echo "🔗 Webhook Endpoint: $WEBHOOK_URL"
echo "📊 Dashboard: $DASHBOARD_URL"
echo "❤️ Health Check: $HEALTH_URL"

# Show running processes
echo ""
echo "📊 Running processes:"
ps aux | grep -E "(expo|file_watcher|patch_runner)" | grep -v grep

# Show port usage
echo ""
echo "🔌 Port usage:"
lsof -i:8081 2>/dev/null || echo "No processes found on port 8081"

echo ""
echo "🎉 System started with Fly.io deployment!"
echo "📋 Next Steps:"
echo "1. Configure GPT to use webhook: $WEBHOOK_URL"
echo "2. Monitor dashboard: $DASHBOARD_URL"
echo "3. Check health: $HEALTH_URL"
echo "4. View Fly.io logs: fly logs -a gpt-cursor-runner"
echo ""
echo "🛑 To stop all services: ./scripts/kill-all-ports.sh" 
