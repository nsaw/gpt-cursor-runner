#!/usr/bin/env bash

# Export all items from a 1Password vault to a .env file (KEY=VALUE per line)
# - OP config from /Users/sawyer/gitSync/_global/op_SecretKeeper/master.env
# - Writes to /Users/sawyer/gitSync/_global/op_SecretKeeper/secrets.env (overwrites, makes a .bak)
# - Never prints secret values; only counts

set -euo pipefail

MASTER_ENV="/Users/sawyer/gitSync/_global/op_SecretKeeper/master.env"
DEST_ENV="/Users/sawyer/gitSync/_global/op_SecretKeeper/secrets.env"

log() { printf '%s\n' "$*" >&2; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "Missing required command: $1"
    case "$1" in
      op) log "Install 1Password CLI: brew install 1password-cli";;
      python3) log "Install Python 3: brew install python";;
    esac
    exit 1
  fi
}

require_cmd op
require_cmd python3

# Load OP config
if [ -f "$MASTER_ENV" ]; then
  # shellcheck disable=SC1090
  . "$MASTER_ENV"
fi

: "${OP_VAULT_NAME:=SecretKeeper}"
: "${OP_ACCOUNT_DOMAIN:=my.1password.com}"

# Fallback: support OP_SERVICE_DEV_TOKEN
if [ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ] && [ -n "${OP_SERVICE_DEV_TOKEN:-}" ]; then
  OP_SERVICE_ACCOUNT_TOKEN="$OP_SERVICE_DEV_TOKEN"
fi

if [ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]; then
  log "OP_SERVICE_ACCOUNT_TOKEN is not set. Edit $MASTER_ENV and add it."
  exit 2
fi

export OP_SERVICE_ACCOUNT_TOKEN
export OP_VAULT_NAME

# Prepare destination safely
if [ -f "$DEST_ENV" ]; then
  ts="$(date +%Y%m%d_%H%M%S)"
  cp "$DEST_ENV" "${DEST_ENV}.${ts}.bak"
fi

tmp_out="$(mktemp)"

# Build .env in Python; do not print secrets to stdout
python3 - "$tmp_out" <<'PY'
import json, os, sys, subprocess, re, datetime

dst = sys.argv[1]

def safe_env_key(name: str) -> str:
    k = re.sub(r'[^A-Za-z0-9_]', '_', name.strip())
    if not k:
        k = 'KEY'
    if not re.match(r'[A-Za-z_]', k[0]):
        k = '_' + k
    return k.upper()

vault = os.environ.get("OP_VAULT_NAME", "SecretKeeper")
try:
    items = json.loads(subprocess.check_output(["op", "item", "list", "--vault", vault, "--format", "json"]))
except Exception:
    items = []

lines = []
for item in items:
    title = item.get('title') or item.get('id') or ''
    if not title:
        continue
    key = safe_env_key(title)
    try:
        full = subprocess.check_output(["op", "item", "get", title, "--vault", vault, "--format", "json"]) 
        data = json.loads(full)
    except Exception:
        continue
    val = data.get('notesPlain') or ''
    if not val and isinstance(data.get('fields'), list):
        for f in data['fields']:
            v = f.get('value')
            if v:
                val = str(v)
                break
    if val is None:
        val = ''
    # Encode newlines for .env compatibility
    val = val.replace('\n', '\\n')
    # Quote if necessary
    if re.search(r'[\s#"\\]', val):
        val = val.replace('\\', '\\\\').replace('"', '\\"')
        line = f'{key}="{val}"'
    else:
        line = f'{key}={val}'
    lines.append(line)

with open(dst, 'w') as f:
    f.write(f"# Exported from 1Password on {datetime.datetime.utcnow().isoformat()}Z\n")
    for ln in lines:
        f.write(ln + "\n")
PY

chmod 600 "$tmp_out"
mv "$tmp_out" "$DEST_ENV"

count_keys=$(grep -E '^[A-Z0-9_]+=' "$DEST_ENV" | wc -l | tr -d ' ')
log "Export complete: $DEST_ENV (keys=$count_keys)"


