#!/bin/bash
# ghost-heartbeat: detects drift in summary .md updates
target='/Users/sawyer/gitSync/gpt-cursor-runner/.last-md-write.log'
if [ ! -f "$target" ]; then echo "No heartbeat file"; exit 1; fi
last_time=$(cut -d':' -f2 "$target")
now=$(date +%s)
diff=$(echo "$now - ${last_time%%.*}" | bc)
if [ "$diff" -gt 300 ]; then echo "⛔ Heartbeat stale: $diff seconds"; exit 2; else echo "✅ Heartbeat OK: $diff seconds ago"; fi 
