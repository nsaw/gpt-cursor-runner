#!/usr/bin/env bash
set -euo pipefail
ROOT="/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs"
MAX=$((5*1024*1024))
for f in "$ROOT"/*.log; do
  [ -f "$f" ] || continue
  size=$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f" 2>/dev/null || echo 0)
  if [ "$size" -gt "$MAX" ]; then
    mv "$f" "$f.$(date +%Y%m%d%H%M%S)"
    : > "$f"
    echo "Rotated: $f"
  fi
done
