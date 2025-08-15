#!/usr/bin/env bash

# Import KEY=VALUE pairs from secrets.env into local file-based VAULT mirror
# - Reads /Users/sawyer/gitSync/_global/op_SecretKeeper/secrets.env
# - Writes files to /Users/sawyer/gitSync/_global/VAULT/<KEY>.secret
# - Optional: if VAULT_ADDR and VAULT_TOKEN set and 'vault' CLI present,
#   also pushes to HashiCorp Vault at path secret/<KEY>

set -euo pipefail

SECRETS_ENV="/Users/sawyer/gitSync/_global/op_SecretKeeper/secrets.env"
VAULT_DIR="/Users/sawyer/gitSync/_global/VAULT"
VAULT_ENV="/Users/sawyer/gitSync/_global/op_SecretKeeper/vault.env"

log() { printf '%s\n' "$*" >&2; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "Missing required command: $1"
    exit 1
  fi
}

mkdir -p "$VAULT_DIR"

# Optional: load VAULT_ADDR/VAULT_TOKEN from vault.env if present
if [ -f "$VAULT_ENV" ]; then
  # shellcheck disable=SC1090
  . "$VAULT_ENV"
fi

if [ ! -f "$SECRETS_ENV" ]; then
  log "secrets.env not found: $SECRETS_ENV"
  exit 2
fi

total=0; written=0; pushed=0

while IFS= read -r raw || [ -n "$raw" ]; do
  line="${raw%$'\r'}"
  case "$line" in
    ''|'#'*) continue ;;
  esac
  key="${line%%=*}"
  val="${line#*=}"
  key="$(printf '%s' "$key" | sed -e 's/^\s\+//' -e 's/\s\+$//' -e 's/[^A-Za-z0-9_.-]/_/g')"
  [ -z "$key" ] && continue
  total=$((total+1))
  # Decode escaped newlines
  val="$(printf '%s' "$val" | sed 's/\\n/\n/g')"
  # Strip surrounding quotes if present
  val="$(printf '%s' "$val" | sed -e 's/^"\(.*\)"$/\1/')"
  out="$VAULT_DIR/$key.secret"
  umask 077
  printf '%s' "$val" > "$out"
  written=$((written+1))
  # Optional push to Vault server
  if command -v vault >/dev/null 2>&1 && [ -n "${VAULT_ADDR:-}" ] && [ -n "${VAULT_TOKEN:-}" ]; then
    VAULT_PATH="secret/$key"
    # Write to a temp file and push via file reference to avoid leaking in ps
    tf="$(mktemp)"; printf '%s' "$val" > "$tf"
    vault kv put "$VAULT_PATH" value=@"$tf" >/dev/null 2>&1 || true
    rm -f "$tf"
    pushed=$((pushed+1))
  fi
done <"$SECRETS_ENV"

log "Import complete. env_total=$total files_written=$written kv_pushed=$pushed"


