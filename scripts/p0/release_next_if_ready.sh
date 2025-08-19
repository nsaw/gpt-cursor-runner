#!/usr/bin/env bash
set -euo pipefail
TS(){ /bin/date -u +%Y-%m-%dT%H:%M:%S.%3NZ; }
PATCH_DIR='/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches'
META='/Users/sawyer/gitSync/_GPTsync/meta'
LOG='/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/p0_baton.log'
mkdir -p "$META" "$(dirname "$LOG")"
HALT="$META/p0_halt.json"; TTL="$META/p0_ttl_override.json"
plain_count=$(find "$PATCH_DIR" -maxdepth 1 -type f -name 'patch-*.json' | wc -l | tr -d ' ')
allow_override=false
if [ -s "$TTL" ] && jq -e '.allow==true' "$TTL" >/dev/null 2>&1; then allow_override=true; fi
action="noop"
if [ "$plain_count" -eq 0 ] && { [ ! -s "$HALT" ] || [ "$allow_override" = true ]; }; then
  CAND=$(find "$PATCH_DIR/.hold" -type f -name 'patch-*.json' | sort | head -n1 || true)
  if [ -n "$CAND" ]; then mv -f "$CAND" "$PATCH_DIR/$(basename "$CAND")" && action="released_from_hold"; else action="no_candidate"; fi
elif [ -s "$HALT" ] && [ "$allow_override" != true ]; then action="halt_active"; fi
printf '{"ts":"%s","action":"%s","plain_count":%s,"override":%s}\n' "$(TS)" "$action" "$plain_count" "$allow_override" > "$META/p0_manual_baton_status.json"
echo "$(TS) $action plain=$plain_count override=$allow_override" >> "$LOG"
