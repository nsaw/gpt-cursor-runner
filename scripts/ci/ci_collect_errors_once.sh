#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
cd "$ROOT"
mkdir -p summaries

JREPORT="summaries/eslint-report.json"
TSCREPORT="summaries/tsc-nb2-report.txt"
OUT="summaries/ci-collect-$(date +%Y%m%d-%H%M%S).json"

# ESLint report (if not present, generate a quick one on JS only)
if [[ ! -f "$JREPORT" ]]; then
  files=()
  while IFS= read -r line; do
    files+=("$line")
  done < <(git ls-files | grep -E '^(scripts/|tools/|bin/).+\.js$' || true)
  if ((${#files[@]}>0)); then
    npx -y eslint --no-eslintrc --config scripts/lint/eslint_nb2_safe.json \
      -f json "${files[@]}" > "$JREPORT" || true
  else
    echo "[]" > "$JREPORT"
  fi
fi

JCOUNT=$(jq 'map(.errorCount + .warningCount) | add // 0' "$JREPORT" 2>/dev/null || echo "0")
if [[ "$JCOUNT" == "" ]]; then
  JCOUNT="0"
fi

# Scoped TSC (only if TS files exist)
if git ls-files | grep -qE '\.ts$'; then
  if npx -y tsc -p tsconfig.nb2.json >/dev/null 2> "$TSCREPORT"; then
    TSC_ERRORS="0"
  else
    TSC_ERRORS=$(grep -cE 'error TS[0-9]+' "$TSCREPORT" || echo "0")
    if [[ "$TSC_ERRORS" == "" ]]; then
      TSC_ERRORS="0"
    fi
  fi
else
  echo "no-ts" > "$TSCREPORT"
  TSC_ERRORS="0"
fi

echo "{\"ts\":\"$(date +%Y-%m-%dT%H:%M:%S%z)\",\"eslint_issues\":$JCOUNT,\"tsc_errors\":$TSC_ERRORS}" > "$OUT"
