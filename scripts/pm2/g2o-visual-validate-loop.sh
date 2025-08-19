#!/usr/bin/env bash
set -euo pipefail
# wrapper to ensure non-blocking pm2 start
exec bash /Users/sawyer/gitSync/gpt-cursor-runner/scripts/validators/g2o_visual_loop.sh
