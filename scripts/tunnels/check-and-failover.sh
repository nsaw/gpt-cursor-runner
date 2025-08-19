#!/usr/bin/env bash
set -euo pipefail
CFG='/Users/sawyer/gitSync/gpt-cursor-runner/config/failover.json'
primary=$(jq -r '.dashboard[0]' "$CFG" 2>/dev/null || echo 'none')
echo "Primary dashboard host: $primary"
timeout 10s curl -fsS http://127.0.0.1:8787/health >/dev/null || echo 'Dashboard health down'
