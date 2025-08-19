#!/bin/zsh
set -euo pipefail
REPORT="/Users/sawyer/gitSync/gpt-cursor-runner/validations/migration-report.md"
if [ -f "$REPORT" ]; then
  echo "=== migration-report.md (head) ==="
  head -n 60 "$REPORT"
else
  echo "No migration report found at $REPORT"
fi
