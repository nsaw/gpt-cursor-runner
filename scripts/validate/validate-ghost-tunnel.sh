#!/bin/bash
set -e
LOG=/Users/sawyer/gitSync/gpt-cursor-runner/summaries/_ghost-tunnel-health.log
URL=https://runner.thoughtmarks.app/health
# MIGRATED: { gtimeout 30s curl -s -o /dev/null -w "%{http_code}" "$URL" | grep -q '200' || echo "❌ Tunnel down: $URL" >> "$LOG"; } >/dev/null 2>&1 & disown
node scripts/nb.js --ttl 30s --label curl --log validations/logs/curl.log --status validations/status -- curl -s -o /dev/null -w "%{http_code}" "$URL"
echo "✅ Tunnel check triggered at $(date)" >> "$LOG"
exit 0 
