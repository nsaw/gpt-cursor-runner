#!/bin/bash
# ***REMOVED*** 2.0 Watchdog Consolidation
# Kill all existing watchdog processes
echo '[CONSOLIDATION] Killing all existing watchdogs...'
pkill -f 'watchdog-.*.sh'
pkill -f 'braun_daemon'
pkill -f 'cyops_daemon'

# Wait for processes to terminate
sleep 2

# Start only 3 essential monitors
echo '[CONSOLIDATION] Starting 3 essential monitors...'
./scripts/watchdog-tunnel.sh &
./scripts/watchdog-runner.sh &
./scripts/watchdog-health.sh &

# Wait for monitors to start
sleep 3

echo '[CONSOLIDATION] Consolidation complete. Process count:'
ps aux | grep -E '(watchdog|daemon)' | grep -v grep | wc -l 
