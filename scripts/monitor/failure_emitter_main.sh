#!/usr/bin/env bash
set -euo pipefail
ROOT='/Users/sawyer/gitSync/.cursor-cache/MAIN/patches'
META='/Users/sawyer/gitSync/_GPTsync/meta'
FJSON="$META/failure_alerts_main.json"
failed=$(ls -1 "$ROOT/.failed"/*.json 2>/dev/null | wc -l | tr -d ' ')
last10=$(ls -1t "$ROOT/.failed"/*.json 2>/dev/null | head -10 | xargs -I{} basename {} 2>/dev/null | jq -R . | jq -s . || echo '[]')
prev=$(jq -r '.failed // 0' "$FJSON" 2>/dev/null || echo 0)
edge=$(( failed > prev ? 1 : 0 ))
jq -n --arg ts "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" --argjson failed "$failed" --argjson rising "$edge" --argjson last10 "$last10" '{ts:$ts,failed:$failed,rising_edge:$rising,last10:$last10}' > "$FJSON"
