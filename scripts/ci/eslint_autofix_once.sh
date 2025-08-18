#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
cd "$ROOT"
mkdir -p summaries
OUT="summaries/eslint-autofix-$(date +%Y%m%d-%H%M%S).md"

# Collect JS files in safe areas only (avoid TypeScript parser needs)
files=()
while IFS= read -r line; do
  files+=("$line")
done < <(git ls-files | grep -E '^(scripts/|tools/|bin/).+\.js$' || true)

if ((${#files[@]}==0)); then
  echo "# ESLint Autofix (JS) — SKIP" > "$OUT"
  echo "- No JS files in scripts/tools/bin" >> "$OUT"
  exit 0
fi

npx -y eslint --no-eslintrc --config scripts/lint/eslint_nb2_safe.json \
  --fix "${files[@]}" || true

# Report remaining issues (non-blocking)
npx -y eslint --no-eslintrc --config scripts/lint/eslint_nb2_safe.json \
  -f json "${files[@]}" > "summaries/eslint-report.json" || true

REMAIN=$(jq 'map(.errorCount + .warningCount) | add // 0' summaries/eslint-report.json 2>/dev/null || echo 0)

{
  echo "# ESLint Autofix (JS) — Completed"
  echo "- Files targeted: ${#files[@]}"
  echo "- Remaining issues (errors+warnings): ${REMAIN}"
} > "$OUT"
