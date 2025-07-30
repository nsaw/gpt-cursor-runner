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

echo '[BOOT] Launching ghost-bridge with watchdog...'
# Start bridge watchdog (which will start the bridge)
nohup bash scripts/watchdogs/ghost-bridge-watchdog.sh > logs/ghost-bridge-watchdog.log 2>&1 &
echo $! > pids/ghost-bridge-watchdog.pid

echo '[BOOT] All systems launched successfully' 