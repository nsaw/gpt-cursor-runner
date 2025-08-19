#!/usr/bin/env bash
set -euo pipefail
CY='/Users/sawyer/gitSync/.cursor-cache/CYOPS'
ROOT="$CY/patches"
LOG="$CY/.logs/handoff_close_the_loop.log"
META='/Users/sawyer/gitSync/_GPTsync/meta'
APP='/Users/sawyer/gitSync/gpt-cursor-runner/dashboard/app.py'
ENVF='/Users/sawyer/gitSync/gpt-cursor-runner/pm2/executor.env'

mkdir -p "$(dirname "$LOG")" "$META"

now() { date -u +%Y-%m-%dT%H:%M:%S.%3NZ; }
jout(){ jq -n --arg ts "$(now)" "$1"; }

# 1) Detect 964 progress and surgical-fix presence
has_964_root(){ ls -1 "$ROOT"/patch-v2.0.964* 2>/dev/null | grep -q .; }
has_964_completed(){ ls -1 "$ROOT/.completed"/patch-v2.0.964* 2>/dev/null | grep -q .; }

# surgical set promoted by 964
surg_list=( 'patch-v2.0.945' 'patch-v2.0.946' 'patch-v2.0.947' 'patch-v2.0.948' )
all_surg_done_with_summaries=1

for base in "${surg_list[@]}"; do
  # found in completed with non-empty summary?
  f=$(ls -1 "$ROOT/.completed/$base"*.json 2>/dev/null | head -n1 || true)
  if [ -n "$f" ]; then
    sf=$(jq -r '.summaryFile // empty' "$f" 2>/dev/null || echo '')
    if [ -z "$sf" ] || [ ! -s "$sf" ]; then all_surg_done_with_summaries=0; fi
  else all_surg_done_with_summaries=0; fi
done

# 2) Self-heal /monitor if 404
code=$(timeout 6s curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8787/monitor' || echo 000)
monitor_healed=0

if [ "$code" != "200" ]; then
  # ensure minimal assets and route
  mkdir -p '/Users/sawyer/gitSync/gpt-cursor-runner/dashboard/static' '/Users/sawyer/gitSync/gpt-cursor-runner/dashboard/templates'
  [ -s '/Users/sawyer/gitSync/gpt-cursor-runner/dashboard/static/g2o_monitor.js' ] || echo "window.addEventListener('DOMContentLoaded',()=>{});" > '/Users/sawyer/gitSync/gpt-cursor-runner/dashboard/static/g2o_monitor.js'
  
  if ! grep -q 'def g2o_monitor' "$APP"; then
    cat >> "$APP" <<'PY'
@app.route('/monitor')
def g2o_monitor_min():
    from flask import render_template
    return render_template('g2o_monitor.html')
PY
  fi
  
  [ -s '/Users/sawyer/gitSync/gpt-cursor-runner/dashboard/templates/g2o_monitor.html' ] || echo '<html><body><div id="g2o-banner"></div><pre id="g2o-counters"></pre><script src="/static/g2o_monitor.js"></script></body></html>' > '/Users/sawyer/gitSync/gpt-cursor-runner/dashboard/templates/g2o_monitor.html'
  
# MIGRATED: command -v pm2 >/dev/null 2>&1 && { timeout 30s pm2 restart g2o-dashboard & } >/dev/null 2>&1 & disown || true
node scripts/nb.js --ttl 30s --label pm2 --log validations/logs/pm2.log --status validations/status -- pm2 restart g2o-dashboard
  sleep 2
  
  code=$(timeout 6s curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8787/monitor' || echo 000)
  [ "$code" = "200" ] && monitor_healed=1 || monitor_healed=0
fi

# 3) Assert executor summary-gating env and restart if not present
need_exec_restart=0
mkdir -p "$(dirname "$ENVF")"

if [ ! -s "$ENVF" ] || ! (grep -q '^EXECUTOR_DRY_RUN=0' "$ENVF" && grep -q '^EXECUTOR_REQUIRE_SUMMARY=1' "$ENVF" && grep -q '^EXECUTOR_FAIL_IF_NO_SUMMARY=1' "$ENVF"); then
  cat > "$ENVF" <<ENV
EXECUTOR_DRY_RUN=0
EXECUTOR_REQUIRE_SUMMARY=1
EXECUTOR_FAIL_IF_NO_SUMMARY=1
ENV
  need_exec_restart=1
fi

if [ "$need_exec_restart" -eq 1 ]; then
# MIGRATED: command -v pm2 >/dev/null 2>&1 && { timeout 30s pm2 restart g2o-executor & } >/dev/null 2>&1 & disown || true
node scripts/nb.js --ttl 30s --label pm2 --log validations/logs/pm2.log --status validations/status -- pm2 restart g2o-executor
fi

# 4) Emit ground-truth status for dashboard
jq -n \
  --arg ts "$(now)" \
  --argjson has964root $(has_964_root && echo 1 || echo 0) \
  --argjson has964done $(has_964_completed && echo 1 || echo 0) \
  --argjson surg_ok $all_surg_done_with_summaries \
  --arg http_code "$code" \
  --argjson monitor_healed $monitor_healed \
  --argjson exec_env_applied $need_exec_restart \
  '{ts:$ts, priority_patch_964:{in_root:( $has964root==1 ), completed:( $has964done==1 )}, surgical_fixes:{all_with_summaries:($surg_ok==1)}, monitor:{code:$http_code, healed:( $monitor_healed==1 )}, executor:{env_refreshed:( $exec_env_applied==1 )}}' \
  > "$META/handoff_close_the_loop.json"
