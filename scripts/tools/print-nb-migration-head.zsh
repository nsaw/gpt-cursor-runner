#!/bin/zsh
set -euo pipefail
REPORT="/Users/sawyer/gitSync/gpt-cursor-runner/validations/migrate-nb-report.md"
if [[ -f "$REPORT" ]]; then
  echo '=== migrate-nb-report.md (head) ==='
  head -n 80 "$REPORT"
else
  echo 'No migrate-nb-report.md found'
fi
