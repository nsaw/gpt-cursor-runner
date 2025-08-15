#!/usr/bin/env bash
set -euo pipefail
SUMS='/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries'
META='/Users/sawyer/gitSync/_GPTsync/meta'
LOG='/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/p0_fail_halt.log'
interval=10
: > "$LOG"
while true; do
  if grep -E -q '(FAIL|NO_GO)' "$SUMS"/summary-*.md 2>/dev/null; then
    printf '{"ts":"%s","phase":"P0","halt":true,"reason":"summary FAIL/NO_GO"}\n' "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" > "$META/queue_halt.P0_FAIL.json"
    echo "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ) HALT set" >> "$LOG"
  fi
  sleep "$interval"
done
