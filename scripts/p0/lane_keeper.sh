#!/usr/bin/env bash
set -euo pipefail
TS(){ /bin/date -u +%Y-%m-%dT%H:%M:%S.%3NZ; }
PATCH_DIR='/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches'
META='/Users/sawyer/gitSync/_GPTsync/meta'
LOG='/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/p0_lane_keeper.log'
mkdir -p "$META" "$(dirname "$LOG")"
mapfile -t PLAINS < <(find "$PATCH_DIR" -maxdepth 1 -type f -name 'patch-*.json' | sort)
plain_count=${#PLAINS[@]:-0}
moved=()
if [ "$plain_count" -gt 1 ]; then
  mkdir -p "$PATCH_DIR/.hold"
  for ((i=0; i<plain_count-1; i++)); do f="${PLAINS[$i]}"; bn=$(basename "$f"); mv -f "$f" "$PATCH_DIR/.hold/$bn" || true; moved+=("$bn"); done
fi
printf '{"ts":"%s","plain_count":%s,"moved":[%s]}' "$(TS)" "$(find "$PATCH_DIR" -maxdepth 1 -type f -name 'patch-*.json' | wc -l | tr -d ' ')" "$(printf '"%s",' "${moved[@]}" | sed 's/,$//')" > "$META/p0_lane_state.json"
echo "$(TS) plains=$(jq -r '.plain_count' "$META/p0_lane_state.json" 2>/dev/null || echo NA) moved=${#moved[@]}" >> "$LOG"
