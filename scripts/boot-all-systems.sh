#!/bin/bash

ulimit -n 2048

export NODE_ENV=development
source ~/.bash_profile

echo '[BOOT] Verifying no duplicate tunnels or ghost stacks...'
pkill -f cloudflared
pkill -f ngrok
pkill -f expo

echo '[BOOT] Pruning stale logs and restoring summary system...'
rm -f logs/*.log
mkdir -p logs
mkdir -p summaries/_heartbeat

echo '[BOOT] Launching core stack...'
nohup node scripts/patch-executor.js &
nohup node scripts/live-patch-status.js &
nohup node scripts/ghost-bridge.js & 