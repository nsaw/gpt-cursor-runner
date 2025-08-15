#!/bin/bash
set -euo pipefail

LOG="/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/unified-status.log"
mkdir -p $(dirname "$LOG")

# Resolve timeout binary (prefer coreutils gtimeout on macOS if available)
resolve_timeout_bin() {
  if command -v timeout >/dev/null 2>&1; then
    echo "timeout"
  elif command -v gtimeout >/dev/null 2>&1; then
    echo "gtimeout"
  else
    echo ""
  fi
}

TIMEOUT_BIN="$(resolve_timeout_bin)"

# Generic non-blocking runner with disown and optional timeout (defaults to 30s)
nb() {
  local cmd_str="$1"
  local t=${2:-30}
  if [ -n "$TIMEOUT_BIN" ]; then
    { $TIMEOUT_BIN ${t}s bash -lc "$cmd_str" & } >>"$LOG" 2>&1 & disown || true
  else
    { bash -lc "$cmd_str" & } >>"$LOG" 2>&1 & disown || true
  fi
}

# Mandatory curl non-blocking pattern with PID capture and disown
# Usage: curl_nb "http://host:port/path" "Label" [timeoutSeconds]
curl_nb() {
  local url="$1"
  local label="$2"
  local t=${3:-30}
  (
    echo "=== ${label} ==="
    if curl --silent --max-time "$t" "$url" 2>/dev/null | grep -q '.'; then
      echo "✅ ${label}"
    else
      echo "❌ ${label}"
    fi
  ) >>"$LOG" 2>&1 &
  local PID=$!
  sleep "$t"
  disown $PID 2>/dev/null || true
}

# Curl + jq non-blocking printer
# Usage: curl_nb_jq URL JQ_FILTER LABEL [timeoutSeconds]
curl_nb_jq() {
  local url="$1"
  local jq_filter="$2"
  local label="$3"
  local t=${4:-30}
  (
    echo "=== ${label} ==="
    if curl --silent --max-time "$t" "$url" 2>/dev/null | jq "$jq_filter"; then
      echo "✅ ${label}"
    else
      echo "❌ ${label}"
    fi
  ) >>"$LOG" 2>&1 &
  local PID=$!
  sleep "$t"
  disown $PID 2>/dev/null || true
}

echo "=== UNIFIED STATUS (non-blocking dispatch) ===" | tee -a "$LOG"
nb "echo '=== PM2 STATUS ==='; pm2 list" 15
nb "echo '\n=== PORTS (8787,8788,8789,5001,8081,5555,5051) ==='; lsof -i -P | grep LISTEN | grep -E '(5051|8787|8788|8789|5001|8081|5555)'" 10
nb "echo '\n=== CLOUDFLARE TUNNELS ==='; cloudflared tunnel list" 20
nb "echo '\n=== PYTHON PROCESSES ==='; ps aux | grep -E '(python|flask)' | grep -v grep" 10
nb "echo '\n=== FLASK DASHBOARD PROCESS ==='; ps aux | grep 'flask-dashboard' | grep -v grep" 10
curl_nb_jq "https://gpt-cursor-runner.thoughtmarks.app/api/status" ".process_health" "API /process_health" 20
curl_nb_jq "https://gpt-cursor-runner.thoughtmarks.app/api/daemon-status" "." "API /daemon-status" 20

echo "Dispatched status commands. See $LOG for results." | tee -a "$LOG"
