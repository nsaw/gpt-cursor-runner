#!/bin/bash
set -e
LOG=/Users/sawyer/gitSync/gpt-cursor-runner/summaries/_ghost-tunnel-health.log
URL=https://runner.thoughtmarks.app/health
{ gtimeout 30s curl -s -o /dev/null -w "%{http_code}" "$URL" | grep -q '200' || echo "❌ Tunnel down: $URL" >> "$LOG"; } >/dev/null 2>&1 & disown
echo "✅ Tunnel check triggered at $(date)" >> "$LOG"
exit 0 