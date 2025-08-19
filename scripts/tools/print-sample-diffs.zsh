#!/bin/zsh
# Show unified diffs for the first N migrated files against their .bak
set -euo pipefail
N=${1:-5}
REPORT="/Users/sawyer/gitSync/gpt-cursor-runner/validations/migrate-nb-report.json"
if [[ ! -f "$REPORT" ]]; then
  echo "No migrate-nb-report.json at $REPORT"; exit 0
fi
node scripts/g2o/print_sample_diffs_once.js "$REPORT" "$N" | while read -r f; do
  [[ -f "$f.bak" ]] || { echo "(no .bak) $f"; continue; }
  echo "\n--- DIFF: $f";
  diff -u "$f.bak" "$f" || true
done
