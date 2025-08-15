#!/usr/bin/env bash
set -euo pipefail
PORT=5555
if lsof -ti :$PORT >/dev/null 2>&1; then
  echo "Reserved port $PORT in use — killing process safely"
  pids=$(lsof -ti :$PORT || true)
  for p in $pids; do kill -TERM "$p" || true; done
  sleep 1
  for p in $pids; do kill -KILL "$p" || true; done
fi
