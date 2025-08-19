#!/bin/bash

# Critical Daemon Restart Script
# Restarts the essential GHOST 2.0 daemon processes

set -e

echo "🔄 Restarting critical GHOST 2.0 daemons..."

# Kill any existing processes
echo "🛑 Stopping existing daemon processes..."
pkill -f "realtime-monitor" 2>/dev/null || true
pkill -f "ghost-bridge" 2>/dev/null || true
pkill -f "patch-executor" 2>/dev/null || true
pkill -f "summary-monitor" 2>/dev/null || true
pkill -f "consolidated-daemon" 2>/dev/null || true

sleep 2

# Start critical daemons
echo "🚀 Starting critical daemons..."

# Start consolidated daemon (manages patch processing)
echo "📦 Starting consolidated daemon..."
nohup node scripts/consolidated-daemon.js > logs/consolidated-daemon.log 2>&1 &
echo $! > logs/pids/consolidated-daemon.pid

# Start ghost bridge (Slack integration)
echo "🌉 Starting ghost bridge..."
nohup node scripts/ghost-bridge.js > logs/ghost-bridge.log 2>&1 &
echo $! > logs/pids/ghost-bridge.pid

# Start patch executor
echo "⚡ Starting patch executor..."
nohup node scripts/patch-executor.js > logs/patch-executor.log 2>&1 &
echo $! > logs/pids/patch-executor.pid

# Start continuous daemon manager
echo "🎛️ Starting continuous daemon manager..."
nohup bash scripts/continuous-daemon-manager.sh > logs/daemon-manager.log 2>&1 &
echo $! > logs/pids/daemon-manager.pid

sleep 3

# Verify processes are running
echo "🔍 Verifying daemon status..."

check_process() {
    local name="$1"
    if pgrep -f "$name" > /dev/null; then
        echo "✅ $name is running"
        return 0
    else
        echo "❌ $name is not running"
        return 1
    fi
}

check_process "consolidated-daemon"
check_process "ghost-bridge"
check_process "patch-executor"
check_process "continuous-daemon-manager"

echo "🎉 Critical daemon restart complete!"
echo "📊 Check logs in logs/ directory for details" 
