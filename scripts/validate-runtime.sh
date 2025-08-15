#!/bin/zsh
set -euo pipefail
echo "[validate-runtime] DEV: noop (runner-only)"
node -e "console.log('DEV runtime OK')"
