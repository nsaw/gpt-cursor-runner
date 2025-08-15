#!/usr/bin/env bash
set -euo pipefail
WD='/Users/sawyer/gitSync/gpt-cursor-runner/scripts/watchdogs'
META='/Users/sawyer/gitSync/_GPTsync/meta'
ROOTQ='/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches'
STAGED_P1='/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/G2o/P1'
SUMS='/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries'
LOG='/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/phase_orchestrator.log'
mkdir -p "$(dirname "$LOG")"
: > "$LOG"

has_p0_green() {
  if [ -f "$META/p0_gate.GREEN" ]; then return 0; fi
  if [ -s "$META/p0_readiness.json" ] && jq -e '.ready==true' "$META/p0_readiness.json" >/dev/null 2>&1; then return 0; fi
  return 1
}

build_p1_order() {
  if [ ! -d "$STAGED_P1" ]; then return 1; fi
  find "$STAGED_P1" -maxdepth 1 -type f -name 'patch-v*.json' -print0 \
  | xargs -0 -n1 basename \
  | sort > "$META/p1_order.txt"
}

promote_p1_holds() {
  local PROM=0; local i=0
  [ -s "$META/p1_order.txt" ] || return 0
  while IFS= read -r bn; do
    [ -z "$bn" ] && continue
    local SRC="$STAGED_P1/$bn"
    [ -f "$SRC" ] || continue
    local DST="$ROOTQ/$bn"
    if [ ! -f "$DST" ] && [ ! -f "$DST.hold" ]; then
      if command -v jq >/dev/null 2>&1; then jq '.role="command_patch" | .plane="CYOPS"' "$SRC" > "$DST" 2>/dev/null || cp -f "$SRC" "$DST"; else cp -f "$SRC" "$DST"; fi
      mv -f "$DST" "$DST.hold"
      local TS
      TS=$(printf '1970010101%02d' "$i")
      TZ=UTC touch -t "$TS" "$DST.hold" 2>/dev/null || true
      PROM=$((PROM+1)); i=$((i+1))
    fi
  done < "$META/p1_order.txt"
  printf '{"ts":"%s","promoted_P1_holds":%s}\n' "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" "$PROM" > "$META/p1_promote_status.json"
}

install_p1_release() {
  cat > "$WD/p1_release_on_summary.sh" << 'EOS'
#!/usr/bin/env bash
set -euo pipefail
ROOTQ='/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches'
SUMS='/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries'
META='/Users/sawyer/gitSync/_GPTsync/meta'
LOG='/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/p1_release.log'
ORDER_FILE="$META/p1_order.txt"
interval=10
while true; do
  if [ -f "$META/queue_halt.P1_FAIL.json" ]; then sleep "$interval"; continue; fi
  if [ ! -s "$ORDER_FILE" ]; then sleep "$interval"; continue; fi
  mapfile -t ORDER < "$ORDER_FILE"
  for ((i=0; i<${#ORDER[@]}; i++)); do
    bn="${ORDER[$i]}"
    if [ -f "$ROOTQ/$bn.hold" ]; then
      ready=1
      if [ "$i" -eq 0 ]; then
        if [ ! -f "$META/p0_gate.GREEN" ] && { [ ! -s "$META/p0_readiness.json" ] || ! jq -e '.ready==true' "$META/p0_readiness.json" >/dev/null 2>&1; }; then ready=0; fi
      else
        prevbn="${ORDER[$((i-1))]}"
        prevbase="${prevbn%.json}"
        s1="$SUMS/summary-$prevbn.md"
        s2="$SUMS/summary-$prevbase.md"
        if [ ! -s "$s1" ] && [ ! -s "$s2" ]; then
          match=$(grep -l "$prevbase" "$SUMS"/summary-*.md 2>/dev/null | head -n1 || true)
          if [ -z "$match" ] || [ ! -s "$match" ]; then ready=0; fi
        fi
      fi
      if [ "$ready" -eq 1 ]; then
        mv "$ROOTQ/$bn.hold" "$ROOTQ/$bn"
        echo "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ) RELEASED $bn" >> "$LOG"
      fi
      break
    fi
  done
  sleep "$interval"
done
EOS
  chmod +x "$WD/p1_release_on_summary.sh"
}

install_p1_fail_halt() {
  cat > "$WD/p1_fail_halt_watch.sh" << 'EOS'
#!/usr/bin/env bash
set -euo pipefail
SUMS='/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries'
META='/Users/sawyer/gitSync/_GPTsync/meta'
LOG='/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/p1_fail_halt.log'
interval=10
: > "$LOG"
while true; do
  hit=$(grep -El '(FAIL|NO_GO)' "$SUMS"/summary-*.md 2>/dev/null | xargs -I{} basename {} | grep '(P1\.' || true)
  if [ -n "$hit" ]; then
    printf '{"ts":"%s","phase":"P1","halt":true,"reason":"summary FAIL/NO_GO"}\n' "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" > "$META/queue_halt.P1_FAIL.json"
    echo "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ) HALT set" >> "$LOG"
  fi
  sleep "$interval"
endone
EOS
  sed -i '' 's/endone/done/' "$WD/p1_fail_halt_watch.sh" 2>/dev/null || true
  chmod +x "$WD/p1_fail_halt_watch.sh"
}

main() {
  echo "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ) Phase orchestrator tick" >> "$LOG"
  if ! has_p0_green; then
    echo "P0 not green; idle" >> "$LOG"
    exit 0
  fi
  build_p1_order || { echo 'No P1 staged; nothing to promote' >> "$LOG"; exit 0; }
  promote_p1_holds
  install_p1_release
  install_p1_fail_halt
  exit 0
}

main
