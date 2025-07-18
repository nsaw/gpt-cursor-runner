#!/bin/bash

# Start Trust Daemon wrapper script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/../logs"
PID_FILE="$LOG_DIR/trust-daemon.pid"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Kill existing daemon if running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "🛑 Stopping existing trust daemon (PID: $OLD_PID)"
        kill "$OLD_PID"
        sleep 1
    fi
    rm -f "$PID_FILE"
fi

# Start the daemon
echo "🛡️  Starting Trust Daemon..."
nohup node "$SCRIPT_DIR/trust-daemon.js" start > "$LOG_DIR/trust-daemon.log" 2>&1 &
DAEMON_PID=$!

# Save PID
echo "$DAEMON_PID" > "$PID_FILE"

# Wait a moment and check if it started successfully
sleep 2
if kill -0 "$DAEMON_PID" 2>/dev/null; then
    echo "✅ Trust Daemon started successfully (PID: $DAEMON_PID)"
    echo "📄 Logs: $LOG_DIR/trust-daemon.log"
    echo "📄 PID: $PID_FILE"
else
    echo "❌ Failed to start Trust Daemon"
    rm -f "$PID_FILE"
    exit 1
fi 