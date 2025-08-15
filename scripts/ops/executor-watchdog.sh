#!/usr/bin/env bash
set -euo pipefail
TS(){ /bin/date -u +%Y-%m-%dT%H:%M:%S.%3NZ; }
LOG='/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/executor-watchdog.log'
STATUS='/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/patch-executor-status.json'
EXE='/Users/sawyer/gitSync/gpt-cursor-runner/scripts/core/patch-executor-loop.js'
name='g2o-executor'
start_executor(){
  if command -v pm2 >/dev/null 2>&1; then
# MIGRATED: timeout 30s pm2 start "$EXE" --name "$name" & disown || true
node scripts/nb.js --ttl 30s --label pm2 --log validations/logs/pm2.log --status validations/status -- pm2 start "$EXE" --name "$name"
  else
# MIGRATED: timeout 30s nohup node "$EXE" >/dev/null 2>&1 & disown || true
node scripts/nb.js --ttl 30s --label nohup --log validations/logs/nohup.log --status validations/status -- nohup node "$EXE" >/dev/null 2>
  fi
}
write_status(){
  ts=$(TS)
  pid=$(timeout 5s pgrep -f 'patch-executor-loop.js' | head -n1 || true)
  printf '{"ts":"%s","executorPid":"%s","note":"watchdog-beacon"}
' "$ts" "${pid:-}" > "$STATUS" || true
}
case "${1:-run}" in
  run)
    # cheap loop with bounded sleep; caller must background us
    for i in $(seq 1 3600); do
      if ! timeout 5s pgrep -f 'patch-executor-loop.js' >/dev/null 2>&1; then
        echo "$(TS) :: restart-executor" >> "$LOG"
        start_executor
        sleep 2
      fi
      write_status
      sleep 10
    done
  ;;
  once)
    if ! timeout 5s pgrep -f 'patch-executor-loop.js' >/dev/null 2>&1; then start_executor; fi
    write_status
  ;;
esac
