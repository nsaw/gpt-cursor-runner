#!/bin/zsh
set -euo pipefail

if ! command -v op >/dev/null 2>&1; then
  echo "1Password CLI 'op' not found. Install 1Password CLI or adjust PATH." >&2
  exit 127
fi

# Export secrets from SecretKeeper vault via op read (no hardcoding)
export SLACK_SIGNING_SECRET="$(op read op://SecretKeeper/SLACK_SIGNING_SECRET/credential)"
export SLACK_BOT_TOKEN="$(op read op://SecretKeeper/SLACK_BOT_TOKEN/credential)"
export SLACK_CLIENT_ID="$(op read op://SecretKeeper/SLACK_CLIENT_ID/credential)"
export SLACK_CLIENT_SECRET="$(op read op://SecretKeeper/SLACK_CLIENT_SECRET/credential)"
# Optional extras if present; ignore errors
export SLACK_APP_TOKEN="$(op read op://SecretKeeper/SLACK_APP_TOKEN/credential 2>/dev/null || true)"

# Ensure PORT defaults to 5051 if not set by PM2
export PORT="${PORT:-5051}"

exec python3 -m gpt_cursor_runner.main


