#!/usr/bin/env bash
set -euo pipefail

CONFIG="/Users/sawyer/.cloudflared/gpt-cursor-runner-config.yml"
UUID="f1545c78-1a94-408f-ba6b-9c4223b4c2bf"
LOG="/Users/sawyer/.cloudflared/gpt-cursor-runner.log"

if ! pgrep -f "python3 .*dashboard/app.py" >/dev/null 2>&1; then
  echo "[cf] Flask dashboard not detected; starting check skipped"
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found" >&2
  exit 1
fi

pkill -f "cloudflared.*gpt-cursor-runner-config.yml" >/dev/null 2>&1 || true
sleep 1

# Non-blocking enforced pattern
{ cloudflared --logfile "$LOG" --loglevel info tunnel run --config "$CONFIG" "$UUID" & } >/dev/null 2>&1 & disown

exit 0


