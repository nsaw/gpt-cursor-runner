#!/bin/bash
# Daemon script to run Ghost status server persistently
PORT=3222
LOG_FILE="logs/ghost-status-daemon.log"
PID_FILE="logs/ghost-status-server.pid"

echo "🚀 Starting Ghost status server daemon at $(date)" >> $LOG_FILE

# Function to start the server
start_server() {
    echo "📡 Starting status server on port $PORT..." >> $LOG_FILE
    nohup node server/status-server.js > logs/status-server-stdout.log 2> logs/status-server-stderr.log &
    echo $! > $PID_FILE
    echo "✅ Status server started with PID $(cat $PID_FILE)" >> $LOG_FILE
}

# Function to stop the server
stop_server() {
    if [ -f $PID_FILE ]; then
        PID=$(cat $PID_FILE)
        echo "🛑 Stopping status server with PID $PID..." >> $LOG_FILE
        kill $PID 2>/dev/null || true
        rm -f $PID_FILE
        echo "✅ Status server stopped" >> $LOG_FILE
    fi
}

# Check if server is already running
if [ -f $PID_FILE ]; then
    PID=$(cat $PID_FILE)
    if ps -p $PID > /dev/null 2>&1; then
        echo "✅ Status server already running with PID $PID" >> $LOG_FILE
        exit 0
    else
        echo "❌ PID file exists but process not running, cleaning up..." >> $LOG_FILE
        rm -f $PID_FILE
    fi
fi

# Check if port is in use
if lsof -i :$PORT >/dev/null 2>&1; then
    echo "⚠️  Port $PORT is in use, stopping existing process..." >> $LOG_FILE
    stop_server
    sleep 2
fi

# Start the server
start_server

# Verify it's running
sleep 3
if lsof -i :$PORT >/dev/null 2>&1; then
    echo "✅ Status server daemon started successfully" >> $LOG_FILE
else
    echo "❌ Failed to start status server daemon" >> $LOG_FILE
    exit 1
fi 
