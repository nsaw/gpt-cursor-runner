#!/bin/bash

# Daemon Manager Watchdog
# Keeps critical GHOST 2.0 daemons running

CRITICAL_DAEMONS=(
    "consolidated-daemon"
    "ghost-bridge"
    "patch-executor"
    "continuous-daemon-manager"
)

check_and_restart() {
    local daemon_name="$1"
    local script_name="$2"
    
    if ! pgrep -f "$daemon_name" > /dev/null; then
        echo "[WATCHDOG] $daemon_name is down, restarting..."
        
        case "$daemon_name" in
            "consolidated-daemon")
                nohup node scripts/consolidated-daemon.js > logs/consolidated-daemon.log 2>&1 &
                ;;
            "ghost-bridge")
                nohup node scripts/ghost-bridge.js > logs/ghost-bridge.log 2>&1 &
                ;;
            "patch-executor")
                nohup node scripts/patch-executor.js > logs/patch-executor.log 2>&1 &
                ;;
            "continuous-daemon-manager")
                nohup bash scripts/continuous-daemon-manager.sh > logs/daemon-manager.log 2>&1 &
                ;;
        esac
        
        echo "[WATCHDOG] $daemon_name restarted"
    else
        echo "[WATCHDOG] $daemon_name is running ✓"
    fi
}

echo "[WATCHDOG] Starting daemon manager watchdog..."

while true; do
    echo "[WATCHDOG] Checking critical daemons..."
    
    for daemon in "${CRITICAL_DAEMONS[@]}"; do
        check_and_restart "$daemon"
    done
    
    echo "[WATCHDOG] Check complete, sleeping 30s..."
    sleep 30
done 