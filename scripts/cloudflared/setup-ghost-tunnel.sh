#!/bin/bash
# Automated setup for ghost.thoughtmarks.app Cloudflare tunnel
# Routes all dashboard/monitor endpoints to https://ghost.thoughtmarks.app/monitor

set -e

TUNNEL_ID="5456cf08-c09e-4280-baa5-382d565cf4ed"
CREDENTIALS_FILE="$HOME/.cloudflared/${TUNNEL_ID}.json"
CONFIG_FILE="$HOME/.cloudflared/config-ghost.yml"
DASHBOARD_PORT=5001
HOSTNAME="ghost.thoughtmarks.app"

# 1. Ensure cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
  echo "cloudflared not found. Installing via Homebrew..."
  brew install cloudflared || { echo "Install cloudflared manually."; exit 1; }
fi

# 2. Ensure credentials file exists
if [ ! -f "$CREDENTIALS_FILE" ]; then
  echo "Cloudflare tunnel credentials not found: $CREDENTIALS_FILE"
  echo "You must run: cloudflared tunnel login && cloudflared tunnel create ghost-thoughtmarks"
  exit 2
fi

# 3. Write config file
cat > "$CONFIG_FILE" <<EOF
tunnel: $TUNNEL_ID
credentials-file: $CREDENTIALS_FILE

ingress:
  - hostname: $HOSTNAME
    service: http://localhost:$DASHBOARD_PORT
  - service: http_status:404
EOF

echo "Config written to $CONFIG_FILE"

# 4. Start the tunnel (background, logs to ~/.cloudflared/ghost-tunnel.log)
LOGFILE="$HOME/.cloudflared/ghost-tunnel.log"
echo "Starting cloudflared tunnel for $HOSTNAME..."
nohup cloudflared tunnel --config "$CONFIG_FILE" run "$TUNNEL_ID" > "$LOGFILE" 2>&1 &

sleep 5

# 5. Validate public endpoint
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$HOSTNAME/api/health || true)
if [ "$STATUS" = "200" ]; then
  echo "✅ Tunnel is up! Dashboard/monitor endpoints are public at: https://$HOSTNAME/monitor"
else
  echo "⚠️  Tunnel started, but endpoint did not return 200. Check logs: $LOGFILE"
fi 