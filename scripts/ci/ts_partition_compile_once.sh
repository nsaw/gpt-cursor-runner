#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
cd "$ROOT"
mkdir -p summaries
OUT="summaries/tsc-partition-$(date +%Y%m%d-%H%M%S).json"
LOG="summaries/tsc-partition.log"
: > "$LOG"

# Collect TS sources (scripts/ only to keep scope safe)
TSFILES=()
while IFS= read -r line; do
  TSFILES+=("$line")
done < <(git ls-files 'scripts/**/*.ts' | grep -vE '\.d\.ts$' || true)

COUNT=${#TSFILES[@]}
if (( COUNT == 0 )); then
  echo '{"chunks":0,"files":0,"errors":0}' > "$OUT"
  exit 0
fi

# Simple approach for small number of files
if timeout 30s npx -y tsc --noEmit --skipLibCheck --pretty false "${TSFILES[@]}" >> "$LOG" 2>&1; then
  status="ok"
  errs=0
else
  status="fail"
  errs=$(grep -cE '^error TS[0-9]+' "$LOG" 2>/dev/null || echo "0")
fi

# Write result
echo "{\"chunks\":1,\"files\":$COUNT,\"errors\":$errs}" > "$OUT"
