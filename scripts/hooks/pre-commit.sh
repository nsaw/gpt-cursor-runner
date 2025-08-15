#!/usr/bin/env bash
set -euo pipefail
ROOT="/Users/sawyer/gitSync/gpt-cursor-runner"
SUMS="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries"
node "$ROOT/scripts/validators/repair_loop_once.mjs" || { echo "[pre-commit] repair loop failed thresholds"; exit 1; }
