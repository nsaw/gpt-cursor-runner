#!/bin/zsh
# Show unified diffs for the first N migrated files against their .bak
set -euo pipefail
N=${1:-5}
REPORT="/Users/sawyer/gitSync/gpt-cursor-runner/validations/migrate-nb-report.json"
if [[ ! -f "$REPORT" ]]; then
  echo "No migrate-nb-report.json at $REPORT"; exit 0
fi
node -e '
const fs=require("fs");
const rep=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
for(const f of (rep.files||[]).slice(0,Number(process.argv[2]||5))){
  console.log(f);
}
' "$REPORT" "$N" | while read -r f; do
  [[ -f "$f.bak" ]] || { echo "(no .bak) $f"; continue; }
  echo "\n--- DIFF: $f";
  diff -u "$f.bak" "$f" || true
done
