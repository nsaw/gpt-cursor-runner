#!/bin/bash
# Launch all systems — Final Phase 4

echo '▶ Launching relayCore'
nohup node ./src-nextgen/ghost/shell/relayCore.ts > logs/relay.log 2>&1 & echo $! > pids/relay.pid

echo '▶ Launching diffMonitor'
nohup node ./src-nextgen/ghost/shell/diffMonitor.ts > logs/diff.log 2>&1 & echo $! > pids/diff.pid

echo '▶ Launching roleVerifier (via executor)'
nohup node ./src-nextgen/ghost/shell/executor.ts > logs/executor.log 2>&1 & echo $! > pids/executor.pid

echo '▶ Launching bootstrapDaemon'
nohup node ./src-nextgen/ghost/shell/bootstrapDaemon.ts > logs/bootstrap.log 2>&1 & echo $! > pids/bootstrap.pid
