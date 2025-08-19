#!/bin/zsh
set -euo pipefail
FILE="/Users/sawyer/gitSync/gpt-cursor-runner/summaries/nb-verify.md"
if [[ -f "$FILE" ]]; then
  echo '=== nb-verify.md (head) ==='
  head -n 80 "$FILE"
else
  echo 'No nb-verify.md summary found.'
fi
