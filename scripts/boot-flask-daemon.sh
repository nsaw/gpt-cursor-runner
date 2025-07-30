#!/bin/bash
set -euo pipefail

LOCK_FILE="/tmp/flask_5555.pid"
PORT=5555

if [ -f "$LOCK_FILE" ] && ps -p $(cat "$LOCK_FILE") > /dev/null 2>&1; then
  echo "[⚠️ PID LOCK ACTIVE] Flask already running on port $PORT with PID $(cat $LOCK_FILE)"
  exit 0
fi

# Check port availability
if lsof -i :$PORT > /dev/null 2>&1; then
  echo "[❌ PORT $PORT OCCUPIED] Attempting fallback port 5566"
  PORT=5566
fi

nohup python3 -m gpt_cursor_runner.main --port $PORT > logs/python-runner.log 2>&1 &
PID=$!
echo $PID > "$LOCK_FILE"
disown $PID

sleep 5
if curl -s http://localhost:$PORT/health | grep -q 'uptime'; then
  echo "[✅ FLASK DAEMON ACTIVE] Bound to port $PORT, PID $PID"
else
  echo "[❌ FLASK DAEMON FAILED TO RESPOND]"
  exit 1
fi 