#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# start-MAIN.sh — One-shot orchestration for:
#   • Expo (local iOS)  – Metro on :8081
#   • Expo (tunnel)     – Metro on :8881  →  ngrok tunnel
#   • Local API backend – :4000  (auto-reload via nodemon, optional)
#
# Hardened for manager-mode: port hygiene, timeout, disown, health checks.
# ---------------------------------------------------------------------------
set -euo pipefail

##############################################################################
# CONFIG — edit here only
##############################################################################
ROOT="/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh"
BACKEND="$ROOT/backend"

EXPO_PORT=8081                  # Primary (local) Metro / Expo
EXPO_TUNNEL_PORT=8082           # Secondary Metro for tunnel
API_PORT=4000                   # Local API / backend

NGROK_STATIC_ID="rd_303V7GHn6qhPfTebOKOjNNLDicn"
NGROK_DOMAIN="deciding-externally-caiman.ngrok-free.app"
NGROK_AUTHTOKEN="2zEtqtpB4YaTdpQfpLf5cZunb8Y_2rstF1BT2zfiUeom5WqWc"

USE_NODEMON=true                # auto-restart API on file save
EXPO_COMMON_FLAGS=(--ios --clear --max-workers 8 --no-install-updates)

##############################################################################
# Helper: kill whatever owns the given port
##############################################################################
kill_port () {
  local PORT="$1"
  if lsof -ti:"$PORT" >/dev/null; then
    echo "→ Killing process on :$PORT"
    kill "$(lsof -ti:"$PORT")" || true
    for _ in {1..5}; do
      lsof -ti:"$PORT" >/dev/null || break
      sleep 1
    done
  fi
}

##############################################################################
# STEP 1 — Clean existing listeners
##############################################################################
kill_port "$EXPO_PORT"
kill_port "$EXPO_TUNNEL_PORT"
kill_port "$API_PORT"

##############################################################################
# STEP 2 — Start Expo Dev Server (iOS, local) in background
##############################################################################
(
  cd "$ROOT"
  echo "→ Starting Expo Dev Server (iOS, local) on :$EXPO_PORT"
  timeout 30s npx expo start --ios -p "$EXPO_PORT" "${EXPO_COMMON_FLAGS[@]}" &
  disown
)

##############################################################################
# STEP 3 — Start Expo Dev Server (tunnel) in background
##############################################################################
(
  cd "$ROOT"
  echo "→ Starting Expo Dev Server (tunnel) on :$EXPO_TUNNEL_PORT"
  timeout 30s npx expo start --tunnel -p "$EXPO_TUNNEL_PORT" "${EXPO_COMMON_FLAGS[@]}" &
  disown
)

##############################################################################
# STEP 4 — Start custom ngrok tunnel → EXPO_TUNNEL_PORT
##############################################################################
(
  echo "→ Starting ngrok tunnel ($NGROK_DOMAIN → :$EXPO_TUNNEL_PORT)"
  timeout 30s ngrok http --domain="$NGROK_DOMAIN" --authtoken="$NGROK_AUTHTOKEN" "$EXPO_TUNNEL_PORT" &
  disown
)

##############################################################################
# STEP 5 — Start API / backend in background
##############################################################################
(
  cd "$BACKEND"
  echo "→ Starting backend API on :$API_PORT"
  BACKEND_CMD="npm run DEV"
  $USE_NODEMON && BACKEND_CMD="npx nodemon --exec '$BACKEND_CMD'"
  # shellcheck disable=SC2086
  timeout 30s bash -c "$BACKEND_CMD" &
  disown
)

##############################################################################
# STEP 6 — (OPTIONAL) Android launch block — currently disabled
##############################################################################
# (
#   cd "$ROOT"
#   echo "→ Starting Expo Dev Server (Android) on :$EXPO_PORT"
#   timeout 30s npx expo start --android -p "$EXPO_PORT" "${EXPO_COMMON_FLAGS[@]}" &
#   disown
# )

##############################################################################
# STEP 7 — Health-check loop
##############################################################################
echo "⏳ Waiting for services to come up…"
for _ in {1..25}; do
  EXPO_UP=$(curl -sf "http://localhost:$EXPO_PORT" >/dev/null && echo true || echo false)
  TUNNEL_UP=$(curl -sf "http://localhost:$EXPO_TUNNEL_PORT" >/dev/null && echo true || echo false)
  API_UP=$(curl -sf "http://localhost:$API_PORT/healthz"  >/dev/null && echo true || echo false)
  [[ $EXPO_UP == true && $TUNNEL_UP == true && $API_UP == true ]] && break
  sleep 1
done

[[ $EXPO_UP == true && $TUNNEL_UP == true && $API_UP == true ]] \
  && echo "✅  All services ready!" \
  || echo "⚠️  One or more services failed to start. Check logs."
