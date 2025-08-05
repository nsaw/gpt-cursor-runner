#!/bin/bash

# Start all cloudflared tunnels
echo "🚀 Starting all cloudflared tunnels..."

# Stop any existing tunnels
pkill -f "cloudflared tunnel run" || true

# Wait a moment for processes to stop
sleep 2

# Start each tunnel with its specific credentials
echo "Starting gpt-cursor-runner tunnel..."
{ cloudflared tunnel run f1545c78-1a94-408f-ba6b-9c4223b4c2bf & } >/dev/null 2>&1 & disown

echo "Starting ghost-thoughtmarks tunnel..."
{ cloudflared tunnel run c9a7bf54-dab4-4c9f-a05d-2022f081f4e0 & } >/dev/null 2>&1 & disown

echo "Starting health-thoughtmarks tunnel..."
{ cloudflared tunnel run 4d633ac0-9bfe-41e7-8ef7-6dfd7aecd378 & } >/dev/null 2>&1 & disown

echo "Starting webhook-thoughtmarks tunnel..."
{ cloudflared tunnel run 9401ee23-3a46-409b-b0e7-b035371afe32 & } >/dev/null 2>&1 & disown

echo "Starting expo-thoughtmarks tunnel..."
{ cloudflared tunnel run c1bdbf69-73be-4c59-adce-feb2163b550a & } >/dev/null 2>&1 & disown

echo "Starting dev-thoughtmarks tunnel..."
{ cloudflared tunnel run 2becefa5-3df5-4ca0-b86a-bf0a5300c9c9 & } >/dev/null 2>&1 & disown

echo "✅ All tunnels started in background"
echo "📊 Check tunnel status with: cloudflared tunnel list" 