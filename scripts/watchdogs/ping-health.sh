#!/usr/bin/env bash
set -euo pipefail
URL="${1:-http://127.0.0.1:8787/health}"
timeout 5s curl -fsS "$URL" >/dev/null || exit 1
