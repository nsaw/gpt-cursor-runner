#!/bin/zsh
set -euo pipefail
cd /Users/sawyer/gitSync/gpt-cursor-runner
if timeout 15s npx playwright --version >/dev/null 2>&1; then
  echo 'Playwright available'
else
  echo 'Playwright not available'
fi
