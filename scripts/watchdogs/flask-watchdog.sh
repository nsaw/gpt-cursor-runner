#!/bin/bash

WATCHDOG_LOG="logs/python-watchdog.log"
LOCKFILE="pids/python-watchdog.lock"
PIDFILE="pids/python-runner.pid"
MAX_FAILS=5
FAIL_COUNT=0

mkdir -p logs pids

if [ -f "$LOCKFILE" ]; then
  echo "🛑 Lockfile found — exiting to avoid loop." >> "$WATCHDOG_LOG"
  exit 1
fi

touch "$LOCKFILE"
echo "🐍 [Flask Watchdog] Launched: $(date)" >> "$WATCHDOG_LOG"

while true; do
  if ! lsof -i :5555 >/dev/null 2>&1; then
    FAIL_COUNT=$((FAIL_COUNT+1))
    echo "🔁 [Watchdog] Restarting Flask (fail count: $FAIL_COUNT)" >> "$WATCHDOG_LOG"

    if [ "$FAIL_COUNT" -gt "$MAX_FAILS" ]; then
      echo "❌ [Watchdog] Max failures reached — stopping." >> "$WATCHDOG_LOG"
      rm -f "$LOCKFILE"
      exit 1
    fi

    kill $(cat "$PIDFILE" 2>/dev/null) 2>/dev/null || true
    sleep 1
    export PYTHON_PORT=5555
    source .venv/bin/activate
    nohup python3 -m gpt_cursor_runner.main >> logs/python-runner.log 2>&1 & echo $! > "$PIDFILE"
    echo "✅ [Watchdog] Restarted Flask. PID: $(cat "$PIDFILE")" >> "$WATCHDOG_LOG"
    sleep $((5 * FAIL_COUNT))
  else
    FAIL_COUNT=0
  fi
  sleep 10
done

rm -f "$LOCKFILE" 