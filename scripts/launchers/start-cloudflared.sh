#!/bin/bash

# Cloudflare tunnel launcher with safe restart
echo '🛑 Stopping existing cloudflared processes...'
pkill -f cloudflared || true

echo '🚀 Starting new cloudflared tunnel...'
{ nohup cloudflared tunnel run ghost-thoughtmarks &> ~/.cloudflared/ghost.log & } >/dev/null 2>&1 & disown

echo '✅ Cloudflared restarted' 