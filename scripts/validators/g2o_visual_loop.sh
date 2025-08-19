#!/usr/bin/env bash
set -euo pipefail
TS(){ /bin/date -u +%Y-%m-%dT%H:%M:%S.%3NZ; }
META='/Users/sawyer/gitSync/_GPTsync/meta'
PNG='/Users/sawyer/gitSync/.cursor-cache/ROOT/.screenshots/g2o-monitor.png'
OUT="$META/visual_validation.json"
LOG='/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/g2o_visual_loop.log'
mkdir -p "$(dirname "$OUT")" "$(dirname "$PNG")" "$(dirname "$LOG")"

# one-time (best-effort) install to reduce failures
if ! command -v npx >/dev/null 2>&1; then echo "$(TS) npx missing" >> "$LOG"; fi
{ npx -y playwright@1.46.0 install chromium >/dev/null 2>&1 || true; } &

interval=12
max_minutes=20
end=$(( $(date +%s) + max_minutes*60 ))

while :; do
  now=$(date +%s)
  # if already PASS, exit cleanly
  if [ -s "$OUT" ] && grep -q '"status"\s*:\s*"PASS"' "$OUT"; then echo "$(TS) PASS already recorded; exiting loop" >> "$LOG"; exit 0; fi

  # probe localhost plane first
  if timeout 5s curl -sf http://127.0.0.1:8787/ >/dev/null || timeout 5s curl -sf http://127.0.0.1:8787/api/status >/dev/null; then
    echo "$(TS) plane OK on 8787" >> "$LOG"
  else
    echo "$(TS) plane WARN on 8787" >> "$LOG"
  fi

  # run visual test (multi-tier fallback added in v2.0.992)
  if timeout 40s npx playwright test tests/playwright/g2o-visual.spec.ts --reporter=line >/dev/null 2>&1; then
    printf '{"ts":"%s","status":"PASS","screenshot":"%s"}\n' "$(TS)" "$PNG" > "$OUT"
    echo "$(TS) visual PASS (screenshot at $PNG)" >> "$LOG"
    exit 0
  else
    printf '{"ts":"%s","status":"RETRY","note":"playwright test failed"}\n' "$(TS)" > "$OUT"
    echo "$(TS) visual RETRY" >> "$LOG"
  fi

  if [ "$now" -ge "$end" ]; then
    printf '{"ts":"%s","status":"TIMEOUT","screenshot":"%s"}\n' "$(TS)" "$PNG" > "$OUT"
    echo "$(TS) visual TIMEOUT; exiting after $max_minutes m" >> "$LOG"
    exit 2
  fi
  sleep "$interval"
done
