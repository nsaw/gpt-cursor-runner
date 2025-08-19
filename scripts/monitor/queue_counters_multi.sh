#!/usr/bin/env bash
set -euo pipefail
META='/Users/sawyer/gitSync/_GPTsync/meta'
CROOT='/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches'
MROOT='/Users/sawyer/gitSync/.cursor-cache/MAIN/patches'
metrics(){ local R="$1"; local SUM; SUM=${2:-}; local q r g m f c now; q=$(ls -1 "$R"/patch-*.json 2>/dev/null | wc -l | tr -d ' '); g=0; m=0; for p in "$R/.completed"/*.json; do [ -f "$p" ] || continue; s=$(jq -r '.summaryFile // empty' "$p" 2>/dev/null || echo ''); if [ -n "$s" ] && [ -s "$s" ]; then g=$((g+1)); else m=$((m+1)); fi; done; f=$(ls -1 "$R/.failed"/*.json 2>/dev/null | wc -l | tr -d ' '); c=$(ls -1 "$R/.corrupt"/*.json 2>/dev/null | wc -l | tr -d ' '); echo "$q|$g|$m|$f|$c"; }
read cq cg cm cf cc < <(IFS='|' metrics "$CROOT")
read mq mg mm mf mc < <(IFS='|' metrics "$MROOT")
now=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
jq -n --arg ts "$now" --argjson cyops '{"queued_root":'$cq',"completed_good":'$cg',"completed_missing":'$cm',"failed":'$cf',"corrupt":'$cc'}' --argjson main '{"queued_root":'$mq',"completed_good":'$mg',"completed_missing":'$mm',"failed":'$mf',"corrupt":'$mc'}' '{ts:$ts, cyops:$cyops, main:$main, combined:{queued_root:($cyops.queued_root+$main.queued_root), completed_good:($cyops.completed_good+$main.completed_good), completed_missing:($cyops.completed_missing+$main.completed_missing), failed:($cyops.failed+$main.failed), corrupt:($cyops.corrupt+$main.corrupt)}}' > "$META/queue_counters.json"
