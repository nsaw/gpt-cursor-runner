#!/bin/bash

# Ghost Relay Fallback Recovery Loop

(
  echo '[GHOST-RELAY] Verifying .last-md-write.log...'
  if [ ! -s /Users/sawyer/gitSync/tm-mobile-cursor/summaries/_heartbeat/.last-md-write.log ]; then
    echo '❌ .last-md-write.log is empty or missing.'
  else
    echo '✅ .last-md-write.log is alive.'
  fi

  echo '[GHOST-RELAY] Checking ghost-bridge and patch-executor processes...'
  ps aux | grep '[g]host-bridge.js' || echo '❌ ghost-bridge not running'
  ps aux | grep '[p]atch-executor.js' || echo '❌ patch-executor not running'

  echo '[GHOST-RELAY] Verifying tunnel health (Cloudflare)...'
  curl -s https://runner.thoughtmarks.app/health >/dev/null 2>&1 || echo '❌ Ghost tunnel unreachable'

  echo '[GHOST-RELAY] Retry ghost-bridge if missing'
  if ! pgrep -f ghost-bridge.js >/dev/null; then
    echo '🔁 Restarting ghost-bridge...'
    nohup node scripts/ghost-bridge.js &>/dev/null & disown
  fi

  echo '[GHOST-RELAY] Verification loop complete.'
) >/dev/null 2>&1 & disown 
