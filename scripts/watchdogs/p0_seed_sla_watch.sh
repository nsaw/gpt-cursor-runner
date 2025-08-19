#!/usr/bin/env bash
set -euo pipefail
SEED='patch-v2.0.000(P0.00.01)_seed-tarignore.json'
SUMS='/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries'
META='/Users/sawyer/gitSync/_GPTsync/meta'
LOG='/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/p0_seed_sla.log'
SLA_SECONDS=${SLA_SECONDS:-900}
START_MARKER="$META/p0_seed_start.ts"
: > "$LOG"
if [ ! -f "$START_MARKER" ]; then date -u +%s > "$START_MARKER"; fi
while true; do
  if [ -f "$META/queue_halt.P0_FAIL.json" ]; then sleep 10; continue; fi
  if [ -s "$SUMS/summary-$SEED.md" ] || [ -s "$SUMS/summary-${SEED%.json}.md" ]; then echo "$(date -u +%FT%T.%3NZ) seed-summary-detected" >> "$LOG"; exit 0; fi
  if [ -f "$META/p0_gate.GREEN" ]; then echo "$(date -u +%FT%T.%3NZ) P0 already GREEN; exiting" >> "$LOG"; exit 0; fi
  start=$(cat "$START_MARKER" 2>/dev/null || echo 0)
  now=$(date -u +%s)
  elapsed=$((now - start))
  if [ "$elapsed" -ge "$SLA_SECONDS" ]; then printf '{"ts":"%s","phase":"P0","halt":true,"reason":"seed summary SLA exceeded (%ss)"}\n' "$(date -u +%FT%T.%3NZ)" "$elapsed" > "$META/queue_halt.P0_FAIL.json"; echo "$(date -u +%FT%T.%3NZ) HALT seed SLA exceeded ($elapsed s)" >> "$LOG"; exit 0; fi
  sleep 10
done
