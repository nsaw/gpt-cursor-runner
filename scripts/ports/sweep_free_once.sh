#!/usr/bin/env bash
set -euo pipefail
ports=("$@"); [[ ${#ports[@]} -gt 0 ]] || ports=(8081)
for p in "${ports[@]}"; do
  pids="$(lsof -nP -iTCP:${p} -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -z "${pids}" ]]; then
    echo "[sweep_free_once] ${p}: free"
    continue
  fi
  kill -15 ${pids} 2>/dev/null || sudo kill -15 ${pids} || true
  sleep 0.4
  pids="$(lsof -nP -iTCP:${p} -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    kill -9 ${pids} 2>/dev/null || sudo kill -9 ${pids} || true
  fi
  if lsof -nP -iTCP:${p} -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[sweep_free_once] ${p}: ERROR still busy" >&2
    exit 1
  else
    echo "[sweep_free_once] ${p}: freed"
  fi
done
