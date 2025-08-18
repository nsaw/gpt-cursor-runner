#!/usr/bin/env bash
# Inserts 'declare const console: any;' at top of TS files in scripts/ that use console but lack a declare.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
cd "$ROOT"
mkdir -p summaries
OUT="summaries/nb2-fix-ts-console-$(date +%Y%m%d-%H%M%S).md"

files=()
while IFS= read -r line; do
  files+=("$line")
done < <(git ls-files 'scripts/**/*.ts' | grep -vE '\.d\.ts$' || true)

fixed=0
total=${#files[@]}
for f in "${files[@]}"; do
  grep -q 'console\.' "$f" || continue
  grep -q 'declare const console: any;' "$f" && continue
  # Insert after shebang or at top
  if head -n1 "$f" | grep -q '^#!/'; then
    { head -n1 "$f"; echo 'declare const console: any;'; tail -n +2 "$f"; } > "$f.tmp" && mv "$f.tmp" "$f"
  else
    { echo 'declare const console: any;'; cat "$f"; } > "$f.tmp" && mv "$f.tmp" "$f"
  fi
  fixed=$((fixed+1))
done

{
  echo "# NB-2.0 TS console declare — Completed"
  echo "- scanned: $total"
  echo "- inserted: $fixed"
} > "$OUT"
