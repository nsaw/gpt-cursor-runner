#!/bin/bash

MAX_DAEMONS=5
DAEMONS_RUNNING=$(pgrep -f daemon | wc -l)

if [ "$DAEMONS_RUNNING" -gt "$MAX_DAEMONS" ]; then
  echo "[ABORT] Too many daemons running ($DAEMONS_RUNNING > $MAX_DAEMONS). Killing overflow."
  pkill -f patch-executor.js
  pkill -f realtime-monitor.js
  pkill -f live-patch-status.js
  pkill -f ghost-bridge.js
  pkill -f summary-monitor.js
fi

# Launch only essential daemons
nohup node scripts/live-patch-status.js &
nohup node scripts/ghost-bridge.js &
nohup node scripts/patch-executor.js & 