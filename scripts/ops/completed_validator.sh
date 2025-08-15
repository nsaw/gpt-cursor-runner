#!/usr/bin/env bash
set -euo pipefail
ROOT='/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches'
SUMR='/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries'
META='/Users/sawyer/gitSync/_GPTsync/meta'
LOG='/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/completed_validator.log'
STATE="$ROOT/.completed/.validated_index"; mkdir -p "$(dirname "$LOG")" "$ROOT/.failed" "$ROOT/.completed"
[ -f "$STATE" ] || : > "$STATE"
contains(){ grep -Fxq "$1" "$STATE" 2>/dev/null; }
mark(){ echo "$1" >> "$STATE"; }
alert(){ mkdir -p "$META"; jq -n --arg p "$1" --arg m "$2" '{ts:(now|todate), patch:$p, error:$m}' > "$META/last_validation_failure.json"; }
for f in $(ls -1t "$ROOT/.completed"/patch-v2.0.*.json 2>/dev/null || true); do base=$(basename "$f"); contains "$base" && continue; sf=$(jq -r '.summaryFile // empty' "$f" 2>/dev/null || echo ''); if [ -z "$sf" ] || [ ! -s "$sf" ]; then mv "$f" "$ROOT/.failed/$base" 2>/dev/null || true; alert "$base" 'missing-or-empty-summary'; mark "$base"; continue; fi; cmds=$(jq -r '.validate.shell[]? // empty' "$f" 2>/dev/null || true); ok=1; if [ -n "$cmds" ]; then while IFS= read -r c; do [ -z "$c" ] && continue; bash -lc "timeout 20s { $c ; }" || { ok=0; echo "FAIL: $base => $c" >> "$LOG"; break; }; done <<< "$cmds"; fi; if [ "$ok" -ne 1 ]; then mv "$f" "$ROOT/.failed/$base" 2>/dev/null || true; alert "$base" 'validate-shell-failed'; mark "$base"; continue; fi; mark "$base"; done
