#!/usr/bin/env bash
set -euo pipefail
port="${1:-8081}"
# Find PIDs listening on TCP:$port (IPv4/IPv6)
pids="$(lsof -nP -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null || true)"
if [[ -z "${pids}" ]]; then
  echo "[port_free_once] nothing listening on ${port}"
  exit 0
fi
# Try graceful, then forceful; allow sudo
kill -15 ${pids} 2>/dev/null || sudo kill -15 ${pids} || true
sleep 0.4
pids="$(lsof -nP -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null || true)"
if [[ -n "${pids}" ]]; then
  kill -9 ${pids} 2>/dev/null || sudo kill -9 ${pids} || true
fi
if lsof -nP -iTCP:${port} -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "[port_free_once] ERROR: port ${port} still busy" >&2
  exit 1
fi
echo "[port_free_once] freed port ${port}"
