#!/bin/bash

# Combined startup script for Fly.io deployment
# Runs both Python runner and Node.js backend in the same container
# Includes persistent daemon functionality and process management

echo "🚀 Starting combined Python runner + Node.js backend..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Start log watcher in background
echo "📊 Starting log watcher..."
tail -f logs/ghost-dispatch.log > /dev/null &
LOG_WATCHER_PID=$!

# Start watchdog in background
echo "🛡️ Starting watchdog daemon..."
./watchdog.sh &
WATCHDOG_PID=$!

# Start patch watchdog in background
echo "🔒 Starting patch watchdog daemon..."
node scripts/patch-watchdog.js &
PATCH_WATCHDOG_PID=$!

# Start Python runner in background on port 5053 (separate from Node.js)
echo "🐍 Starting Python runner on port 5053..."
PYTHON_PORT=5053 python3 -m gpt_cursor_runner.main &
PYTHON_PID=$!

# Wait a moment for Python to start
sleep 5

# Start Node.js backend on port 5051 (Fly.io expected port)
echo "🟢 Starting Node.js backend on port 5051..."
PORT=5051 npm run dev &
NODE_PID=$!

# Autoload Fly log daemon via launchd plist (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
  FLYLOG_PLIST="$HOME/Library/LaunchAgents/com.gpt.flylog.plist"
  FLYLOG_LABEL="com.gpt.flylog"
  if ! launchctl list | grep -q "$FLYLOG_LABEL"; then
    echo "🟢 Loading Fly log daemon plist: $FLYLOG_PLIST"
    if launchctl load "$FLYLOG_PLIST" 2>/dev/null; then
      echo "✅ Fly log daemon plist loaded"
    else
      echo "⚠️  Failed to load Fly log plist. (Dry-run fallback)"
      echo "[DRY-RUN] Would have run: launchctl load $FLYLOG_PLIST" >> logs/flylog-plist-dryrun.log
    fi
  else
    echo "✅ Fly log daemon already running via launchd"
  fi
fi

# Function to cleanup processes on exit
cleanup() {
    echo "🛑 Shutting down services..."
    kill $PYTHON_PID $NODE_PID $LOG_WATCHER_PID $WATCHDOG_PID $PATCH_WATCHDOG_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Log startup completion
echo "✅ All services started successfully"
echo "📊 Python Runner PID: $PYTHON_PID (port 5053)"
echo "📊 Node.js Backend PID: $NODE_PID (port 5051)"
echo "📊 Log Watcher PID: $LOG_WATCHER_PID"
echo "📊 Watchdog PID: $WATCHDOG_PID"
echo "🔒 Patch Watchdog PID: $PATCH_WATCHDOG_PID"
echo "🌐 Dashboard: https://gpt-cursor-runner.fly.dev/dashboard"
echo "🔗 Health Check: https://gpt-cursor-runner.fly.dev/health"

# Wait for all processes
wait $PYTHON_PID $NODE_PID $LOG_WATCHER_PID $WATCHDOG_PID $PATCH_WATCHDOG_PID 