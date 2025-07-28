#!/bin/bash

echo '🚀 Booting all systems for MAIN and CYOPS...'

# Boot MAIN
nohup node scripts/start-main.js &> logs/daemon-main.log &
disown

# Boot CYOPS
nohup node scripts/start-cyops.js &> logs/daemon-cyops.log &
disown

# Boot Tunnel (if used)
nohup cloudflared tunnel run gpt-cursor-runner &> logs/tunnel.log &
disown

# Optional Expo/Backend (uncomment if used)
# nohup yarn workspace main-app expo start --dev-client &> logs/expo-main.log &
# disown

echo '✅ Boot sequence launched. Logs in /logs/' 