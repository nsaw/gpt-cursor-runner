#!/bin/zsh
set -euo pipefail
ROOT=${1:-/Users/sawyer/gitSync/gpt-cursor-runner}
# Exclude third-party & generated & docs
EXCLUDES_DIRS=(.git node_modules dist build .expo .next ios android validations docs .cursor-cache)
EXCLUDES_FILES=("*.md" "*.mdx" "*.bak")
PATTERN='\b(g?timeout)\b.*&.*\bdisown\b'
# Build grep args
set -A ARGS --recursive --files-with-matches --extended-regexp "$PATTERN" "$ROOT"
for d in ${EXCLUDES_DIRS[@]}; do ARGS+=(--exclude-dir=$d); done
for f in ${EXCLUDES_FILES[@]}; do ARGS+=(--exclude=$f); done
HITS=$(grep ${=ARGS} || true)
# Filter out our scanner/migrator scripts themselves
HITS=$(print -- "$HITS" | grep -Ev 'migrate-timeout-disown\.js|find-timeout-disown\.js' || true)
if [[ -n "$HITS" ]]; then
  echo '[enforce-no-disown] Found legacy patterns (code-only):'
  print -- "$HITS" | sed 's/^/- /'
  exit 2
fi
echo '[enforce-no-disown] OK — no legacy timeout & disown patterns found in code.'
