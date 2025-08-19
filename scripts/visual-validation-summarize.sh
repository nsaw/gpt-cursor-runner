#!/usr/bin/env bash
set -euo pipefail
TS(){ /bin/date -u +%Y-%m-%dT%H:%M:%S.%3NZ; }
META='/Users/sawyer/gitSync/_GPTsync/meta'; OUT="$META/visual_validation.json"
PNG='/Users/sawyer/gitSync/.cursor-cache/ROOT/.screenshots/g2o-monitor.png'
mkdir -p "$META"
STATUS='FAIL'; [ -s "$PNG" ] && STATUS='PASS'
printf '{"ts":"%s","status":"%s","screenshot":"%s"}\n' "$(TS)" "$STATUS" "$PNG" > "$OUT"
echo "[visual] $STATUS -> $OUT"
