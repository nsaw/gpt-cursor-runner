#!/usr/bin/env bash
# Enforce nb.js usage in docs/rules; fail on legacy timeout/disown
set -euo pipefail
ROOT="${1:-$(pwd)}"
mapfile -t DOCS < <(find "$ROOT" -type f \( -name '*.md' -o -name '*.mdc' \))
PATTERN='(\{[^}]*\s*)?timeout\s+[0-9]+s[^\n]*&\s*\}?\s*>/dev/null\s*2>&1\s*&\s*disown'
FAILS=()
for f in "${DOCS[@]}"; do
  if grep -nE "$PATTERN" "$f" >/dev/null 2>&1; then FAILS+=("$f"); fi
done
mkdir -p validations
if (( ${#FAILS[@]} > 0 )); then
  printf '%s\n' "${FAILS[@]}" > validations/nb-docs-violations.list
  echo "NB_DOCS_VIOLATIONS=${#FAILS[@]}" >&2
  exit 3
else
  echo "NB_DOCS_VIOLATIONS=0"
fi
