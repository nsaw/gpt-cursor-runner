#!/bin/bash
# Kill all existing watchdogs
pkill -f 'watchdog-.*.sh'
# Start essential monitors
nohup ./scripts/watchdog-tunnel.sh --tail &
nohup ./scripts/watchdog-runner.sh --tail &
nohup ./scripts/watchdog-health.sh --tail &
echo '✅ Watchdog consolidation complete' 