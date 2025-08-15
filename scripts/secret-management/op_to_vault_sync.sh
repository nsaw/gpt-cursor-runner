#!/usr/bin/env bash

# Sync all items from a 1Password vault into a local HashiCorp Vault (kv v2)
# - OP config from /Users/sawyer/gitSync/_global/op_SecretKeeper/master.env
# - Writes to /Users/sawyer/gitSync/_global/VAULT with file-mirrored contents (kv emulation)
#
# NOTE: This implements a file-based KV mirror for local use. If you run a real
# HashiCorp Vault server, you can adapt the push step to use `vault kv put` with
# VAULT_ADDR and VAULT_TOKEN. We avoid printing any secret values.

set -euo pipefail

MASTER_ENV="/Users/sawyer/gitSync/_global/op_SecretKeeper/master.env"
VAULT_DIR="/Users/sawyer/gitSync/_global/VAULT"

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

mkdir -p "$VAULT_DIR"

if [ -f "$MASTER_ENV" ]; then
  # shellcheck disable=SC1090
  . "$MASTER_ENV"
fi

: "${OP_VAULT_NAME:=SecretKeeper}"

# Fallback: support OP_SERVICE_DEV_TOKEN if OP_SERVICE_ACCOUNT_TOKEN is unset
if [ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ] && [ -n "${OP_SERVICE_DEV_TOKEN:-}" ]; then
  OP_SERVICE_ACCOUNT_TOKEN="$OP_SERVICE_DEV_TOKEN"
fi

if [ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]; then
  log "OP_SERVICE_ACCOUNT_TOKEN is not set. Edit $MASTER_ENV and add it."
  exit 2
fi

export OP_SERVICE_ACCOUNT_TOKEN

log "Listing items from 1Password vault: $OP_VAULT_NAME"
items_json="$(op item list --vault "$OP_VAULT_NAME" --format json)"

# Iterate items, fetch their full JSON, and mirror to VAULT_DIR as key files.
python3 - "$VAULT_DIR" <<'PY'
import json, os, sys, subprocess, shlex

vault_dir = sys.argv[1]
items = json.load(sys.stdin)

def safe_name(name: str) -> str:
    return ''.join(c if c.isalnum() or c in ('-', '_', '.') else '_' for c in name)

for item in items:
    title = item.get('title') or item.get('id')
    if not title:
        continue
    out_name = safe_name(title)
    # Fetch full item
    cmd = ["op", "item", "get", title, "--format", "json"]
    try:
        full = subprocess.check_output(cmd)
    except subprocess.CalledProcessError:
        continue
    data = json.loads(full)
    # Extract primary secret: prefer notesPlain; fallback to fields
    secret = data.get('notesPlain') or ''
    if not secret and isinstance(data.get('fields'), list):
        for f in data['fields']:
            if f.get('value'):
                secret = str(f['value'])
                break
    # Write to file without printing value
    path = os.path.join(vault_dir, f"{out_name}.secret")
    with open(path, 'w') as f:
        f.write(secret)
PY

log "Mirror complete to $VAULT_DIR (file-based KV)."

# If you have a running Vault server, uncomment and configure below to push:
# : "${VAULT_ADDR:=http://127.0.0.1:8200}"
# : "${VAULT_TOKEN:=}"
# if command -v vault >/dev/null 2>&1 && [ -n "$VAULT_TOKEN" ]; then
#   export VAULT_ADDR VAULT_TOKEN
#   while IFS= read -r f; do
#     name="$(basename "$f" .secret)"
#     vault kv put secret/"$name" value=@"$f" >/dev/null 2>&1 || true
#     log "[kv put] secret/$name"
#   done < <(find "$VAULT_DIR" -type f -name '*.secret')
#   log "Push to HashiCorp Vault server completed."
# else
#   log "Vault CLI not configured; kept local file mirror only."
# fi


