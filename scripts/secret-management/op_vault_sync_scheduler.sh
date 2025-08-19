#!/usr/bin/env bash

# One-shot sync: OP SecretKeeper → secrets.env → local VAULT files → optional Vault server
# Intended for periodic execution via launchd with safety features

set -euo pipefail

LOG_DIR="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/.logs"
mkdir -p "$LOG_DIR"
ts="$(date +%Y%m%d_%H%M%S)"

# Safety: kill any existing sync processes older than 10 minutes
find /tmp -name "op_vault_sync_*.pid" -mmin +10 -exec sh -c '
  pid=$(cat "$1" 2>/dev/null || echo "")
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    echo "[safety] killing stale sync process $pid" >> "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/.logs/op_vault_sync_safety.log"
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$1"
' _ {} \; 2>/dev/null || true

# Create PID file for this run
PID_FILE="/tmp/op_vault_sync_${ts}.pid"
echo $$ > "$PID_FILE"

# Cleanup function
cleanup() {
  rm -f "$PID_FILE"
  exit 0
}
trap cleanup EXIT INT TERM

{
  echo "[sync] start $ts (PID: $$)"
  
  # Run export with background monitoring (no timeout command)
  echo "[sync] starting export..."
  /Users/sawyer/gitSync/gpt-cursor-runner/scripts/secret-management/op_export_to_env.sh &
  export_pid=$!
  
  # Monitor export process for 5 minutes
  for i in {1..300}; do
    if ! kill -0 "$export_pid" 2>/dev/null; then
      echo "[sync] export completed"
      break
    fi
    sleep 1
  done
  
  # Force kill if still running
  if kill -0 "$export_pid" 2>/dev/null; then
    echo "[sync] export timeout, force-killing"
    kill -9 "$export_pid" 2>/dev/null || true
    pkill -f "op item" || true
    pkill -f "op vault" || true
  fi
  
  # Run import with background monitoring
  echo "[sync] starting import..."
  /Users/sawyer/gitSync/gpt-cursor-runner/scripts/secret-management/env_to_vault_import.sh &
  import_pid=$!
  
  # Monitor import process for 5 minutes
  for i in {1..300}; do
    if ! kill -0 "$import_pid" 2>/dev/null; then
      echo "[sync] import completed"
      break
    fi
    sleep 1
  done
  
  # Force kill if still running
  if kill -0 "$import_pid" 2>/dev/null; then
    echo "[sync] import timeout, force-killing"
    kill -9 "$import_pid" 2>/dev/null || true
    pkill -f "vault kv" || true
  fi
  
  echo "[sync] end $(date +%Y%m%d_%H%M%S)"
} >>"$LOG_DIR/op_vault_sync_${ts}.log" 2>&1


