#!/bin/bash
# Monitor and restart Ghost status server if needed
PORT=3222
LOG_FILE="logs/ghost-status-server.log"
DAEMON_SCRIPT="/Users/sawyer/gitSync/gpt-cursor-runner/scripts/watchers/ghost-status-server-daemon.sh"

echo "🔍 Checking Ghost status server on port $PORT at $(date)" >> $LOG_FILE

# Check if status server is running
if ! lsof -i :$PORT >/dev/null 2>&1; then
    echo "❌ Status server not running on port $PORT, starting daemon..." >> $LOG_FILE
    bash $DAEMON_SCRIPT
    sleep 3
    
    # Verify restart
    if lsof -i :$PORT >/dev/null 2>&1; then
        echo "✅ Status server daemon started successfully" >> $LOG_FILE
    else
        echo "❌ Failed to start status server daemon" >> $LOG_FILE
    fi
else
    echo "✅ Status server running on port $PORT" >> $LOG_FILE
fi 
