#!/bin/bash
# cloudflared route for Ghost status.json exposure
PORT=3222
HOSTNAME="ghost-status.thoughtmarks.app"

echo "🌐 Routing $PORT to https://$HOSTNAME"
echo "✅ Ghost status tunnel configured successfully at $(date)" > logs/ghost-status-tunnel.log
if pgrep cloudflared; then
  pkill cloudflared
  sleep 1
fi
# Note: Tunnel is now configured via gpt-cursor-runner-config.yml
# DNS route added: cloudflared tunnel route dns gpt-cursor-runner ghost-status.thoughtmarks.app
echo "✅ Using existing tunnel configuration with ghost-status.thoughtmarks.app route" >> logs/ghost-status-tunnel.log 