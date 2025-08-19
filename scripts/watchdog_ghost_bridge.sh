#!/usr/bin/env bash
# Checks for ghost/runner presence; if missing, kicks restart once (finite).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"
mkdir -p summaries
log="summaries/watchdog-ghost-$(date +%Y%m%d-%H%M%S).log"

if pgrep -fl "ghost|runner|ghost_shell" >/dev/null 2>&1; then
  echo "[watchdog_ghost_bridge] runner appears present" | tee -a "$log"
  exit 0
fi

echo "[watchdog_ghost_bridge] runner down; attempting ghost_shell_restart_once.js" | tee -a "$log"
if [[ -f "scripts/ghost_shell_restart_once.js" ]]; then
  timeout 30s node "scripts/ghost_shell_restart_once.js" & disown || true
  echo "[watchdog_ghost_bridge] restart triggered" | tee -a "$log"
else
  echo "[watchdog_ghost_bridge] missing scripts/ghost_shell_restart_once.js" | tee -a "$log"
  exit 1
fi
