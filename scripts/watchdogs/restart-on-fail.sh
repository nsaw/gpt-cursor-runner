#!/usr/bin/env bash
set -euo pipefail
APP="${1:-}"
test -n "$APP" || { echo "app name required" >&2; exit 2; }
if ! timeout 10s pm2 describe "$APP" >/dev/null 2>&1; then exit 1; fi
# MIGRATED: timeout 30s pm2 restart "$APP" --update-env & disown || true
node scripts/nb.js --ttl 30s --label pm2 --log validations/logs/pm2.log --status validations/status -- pm2 restart "$APP" --update-env
