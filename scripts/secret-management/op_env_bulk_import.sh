#!/usr/bin/env bash

# Bulk-import KEY=VALUE pairs from a .env file into a 1Password vault using a Service Account
# - Reads OP configuration from /Users/sawyer/gitSync/_global/op_SecretKeeper/master.env
# - Imports from /Users/sawyer/gitSync/_global/op_SecretKeeper/secrets.env by default
# - Creates/updates one item per KEY as a Secure Note (notesPlain holds the value)
# - Never prints secret values; only key names

set -euo pipefail

MASTER_ENV="/Users/sawyer/gitSync/_global/op_SecretKeeper/master.env"
DEFAULT_SECRETS_ENV="/Users/sawyer/gitSync/_global/op_SecretKeeper/secrets.env"

SECRETS_ENV_FILE="${1:-$DEFAULT_SECRETS_ENV}"

log() { printf '%s\n' "$*" >&2; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "Missing required command: $1"
    case "$1" in
      op)
        log "Install 1Password CLI: brew install 1password-cli"
        ;;
      python3)
        log "Install Python 3: brew install python"
        ;;
    esac
    exit 1
  fi
}

require_cmd op
require_cmd python3

# Load OP config if present
if [ -f "$MASTER_ENV" ]; then
  # shellcheck disable=SC1090
  . "$MASTER_ENV"
fi

: "${OP_VAULT_NAME:=SecretKeeper}"
: "${OP_ACCOUNT_DOMAIN:=my.1password.com}"

# Fallback: support OP_SERVICE_DEV_TOKEN if OP_SERVICE_ACCOUNT_TOKEN is unset
if [ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ] && [ -n "${OP_SERVICE_DEV_TOKEN:-}" ]; then
  OP_SERVICE_ACCOUNT_TOKEN="$OP_SERVICE_DEV_TOKEN"
fi

if [ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]; then
  log "OP_SERVICE_ACCOUNT_TOKEN is not set. Edit $MASTER_ENV and add it."
  exit 2
fi

export OP_SERVICE_ACCOUNT_TOKEN

if [ ! -f "$SECRETS_ENV_FILE" ]; then
  log "Secrets file not found: $SECRETS_ENV_FILE"
  exit 3
fi

# Ensure target vault exists
if ! op vault get "$OP_VAULT_NAME" >/dev/null 2>&1; then
  log "Creating 1Password vault: $OP_VAULT_NAME"
  op vault create "$OP_VAULT_NAME" >/dev/null
fi

total=0; created=0; updated=0; skipped=0

# Read .env lines safely without exporting values to environment
while IFS= read -r raw || [ -n "$raw" ]; do
  line="${raw%$'\r'}"
  case "$line" in
    ''|'#'*) continue ;;
  esac

  key="${line%%=*}"
  val="${line#*=}"

  # Trim key whitespace
  key="$(printf '%s' "$key" | sed -e 's/^\s\+//' -e 's/\s\+$//')"
  if [ -z "$key" ]; then
    continue
  fi

  total=$((total+1))

  # Fetch existing item (if any)
  item_json="$(op item get --vault "$OP_VAULT_NAME" "$key" --format json 2>/dev/null || true)"
  if [ -n "$item_json" ]; then
    # Update existing Secure Note's notesPlain field without echoing secret
    id="$(printf '%s' "$item_json" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')"
    tmp_payload="$(mktemp)"
    ITEM_VALUE="$val" python3 - "$tmp_payload" <<'PY'
import json, os, sys
payload = {"notesPlain": os.environ.get("ITEM_VALUE", "")}
with open(sys.argv[1], 'w') as f:
    json.dump(payload, f)
PY
    op item edit "$id" --vault "$OP_VAULT_NAME" --input-file "$tmp_payload" >/dev/null
    rm -f "$tmp_payload"
    log "[update] $key"
    updated=$((updated+1))
  else
    # Create new Secure Note with title=key and notesPlain=value
    tmp_payload="$(mktemp)"
    ITEM_TITLE="$key" ITEM_VALUE="$val" python3 - "$tmp_payload" <<'PY'
import json, os, sys
item = {
  "title": os.environ.get("ITEM_TITLE", ""),
  "category": "SECURE_NOTE",
  "notesPlain": os.environ.get("ITEM_VALUE", "")
}
with open(sys.argv[1], 'w') as f:
    json.dump(item, f)
PY
    op item create --vault "$OP_VAULT_NAME" --input-file "$tmp_payload" >/dev/null
    rm -f "$tmp_payload"
    log "[create] $key"
    created=$((created+1))
  fi
done <"$SECRETS_ENV_FILE"

log "Done. total=$total created=$created updated=$updated skipped=$skipped"


