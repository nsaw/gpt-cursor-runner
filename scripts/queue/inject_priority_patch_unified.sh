#!/usr/bin/env bash
set -euo pipefail
TS(){ /bin/date -u +%Y-%m-%dT%H:%M:%S.%3NZ; }
AGENT=${AGENT:-${1:-CYOPS}}; SRC=${2:-}
[ -n "$SRC" ] && [ -f "$SRC" ] || { echo 'usage: AGENT=CYOPS|MAIN inject_priority_patch_unified.sh /path/to/patch.json' >&2; exit 2; }
IFS='|' read ROOT SUMR < <('/Users/sawyer/gitSync/gpt-cursor-runner/scripts/lib/agent_common.sh' "$AGENT")
IDX="$ROOT/INDEX.md"; LOCK="$ROOT/.priority_lock.json"; base=$(basename "$SRC"); DST="$ROOT/$base"
cp -f "$SRC" "$DST"
TZ=UTC touch -t 197001010000 "$DST"
printf '{"ts":"%s","patch":"%s","agent":"%s"}\n' "$(TS)" "$base" "$AGENT" > "$LOCK"
{ echo "- $base"; [ -f "$IDX" ] && grep -v "^-$base$" "$IDX" || true; } > "$IDX.tmp" && mv "$IDX.tmp" "$IDX"
echo "injected ($AGENT): $base"
