#!/bin/bash
resolve_timeout_bin() {
  if command -v timeout >/dev/null 2>&1; then
    echo "timeout"
  elif command -v gtimeout >/devnull 2>&1; then
    echo "gtimeout"
  else
    echo ""
  fi
}
TIMEOUT_BIN="$(resolve_timeout_bin)"

nb() {
  local cmd_str="$1"
  local t=${2:-30}
  if [ -n "$TIMEOUT_BIN" ]; then
    { $TIMEOUT_BIN ${t}s bash -lc "$cmd_str" & } >/dev/null 2>&1 & disown || true
  else
    { bash -lc "$cmd_str" & } >/dev/null 2>&1 & disown || true
  fi
}

while true; do
  echo "[$(date)] Checking Fly app status..." >> logs/fly-status.log
  nb "flyctl status --app gpt-cursor-runner >> logs/fly-status.log 2>&1" 30
  echo "---" >> logs/fly-status.log
  sleep 60
done
