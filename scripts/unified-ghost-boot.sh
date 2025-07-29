#!/bin/bash

cd "$(dirname "$0")/.." || exit 1
mkdir -p logs

echo "🚀 Starting Unified Ghost 2.0 System Stack..."

## 1. Core Patch & Relay Daemons
nohup node scripts/patch-executor.js &> logs/patch-executor.log &
nohup node scripts/live-patch-status.js &> logs/live-status.log &
nohup node scripts/ghost-bridge.js &> logs/ghost-bridge.log &

## 2. Nextgen Ghost Shell Components
nohup npx tsx src-nextgen/ghost/shell/relayCore.ts &> logs/relay-core.log &
nohup npx tsx src-nextgen/ghost/shell/executor.ts &> logs/executor.log &
nohup npx tsx src-nextgen/ghost/shell/bootstrapDaemon.ts &> logs/bootstrap.log &
nohup npx tsx src-nextgen/ghost/shell/diffMonitor.ts &> logs/diff-monitor.log &

## 3. Telemetry System
nohup npx tsx src-nextgen/ghost/telemetry/ghostTelemetryApi.ts &> logs/telemetry-api.log &
nohup npx tsx src-nextgen/ghost/telemetry/ghostTelemetryOrchestrator.ts &> logs/telemetry-orchestrator.log &

## 4. Monitoring Dashboards
nohup npx tsx src-nextgen/monitor/monitorDashboard.ts &> logs/monitor-dashboard.log &
nohup node scripts/comprehensive-dashboard.js &> logs/comprehensive-dashboard.log &
nohup node scripts/dualMonitor.js &> logs/dual-monitor.log &

## 5. Watchdogs & Lifecycle Daemons
nohup npx tsx src-nextgen/ghost/shell/ghostSentinelGuard.ts &> logs/sentinel-guard.log &
nohup npx tsx src-nextgen/ghost/shell/ghostWatchdogLoop.ts &> logs/watchdog-loop.log &
nohup npx tsx src-nextgen/ghost/shell/ghostSelfCheckCore.ts &> logs/selfcheck-core.log &
nohup npx tsx src-nextgen/ghost/shell/ghostLifecycleGovernor.ts &> logs/lifecycle-governor.log &

## 6. Real-time APIs
nohup node scripts/real-time-status-api.js &> logs/real-time-status-api.log &
nohup node scripts/autonomous-patch-trigger.js &> logs/autonomous-trigger.log &

## 7. Tunnel
nohup cloudflared tunnel run gpt-cursor-runner &> logs/tunnel.log &

sleep 2
echo "✅ All systems launched. Check logs in ./logs/"
echo "🧠 Ghost 2.0 is now ACTIVE" 