#!/usr/bin/env bash
set -euo pipefail
TS(){ /bin/date -u +%Y-%m-%dT%H:%M:%S.%3NZ; }
ROOT='/Users/sawyer/gitSync/gpt-cursor-runner'
PNG='/Users/sawyer/gitSync/.cursor-cache/ROOT/.screenshots/g2o-monitor.png'
META='/Users/sawyer/gitSync/_GPTsync/meta/visual_validation.json'
LOG='/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/g2o_visual_once.log'
mkdir -p "$(dirname "$PNG")" "$(dirname "$META")" "$(dirname "$LOG")"
if ! npx playwright --version >/dev/null 2>&1; then npx -y playwright@1.46.0 install chromium >/dev/null 2>&1 || true; fi
cd "$ROOT"
if timeout 60s npx playwright test tests/playwright/g2o-visual.spec.ts --reporter=line >/dev/null 2>&1; then
  printf '{"ts":"%s","status":"PASS","screenshot":"%s"}\n' "$(TS)" "$PNG" > "$META"; echo "$(TS) PASS" >> "$LOG"; exit 0
else
  printf '{"ts":"%s","status":"FAIL"}\n' "$(TS)" > "$META"; echo "$(TS) FAIL" >> "$LOG"; exit 1
fi
