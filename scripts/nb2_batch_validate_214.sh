#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"
mkdir -p summaries

PASS=true
SUMMARY="summaries/patch-v2.0.214(P2.10.04)_nb2-ci-debt-triage-trend-and-ts-batches.summary.md"

# Run targeted fixes & checks (finite)
bash scripts/ci/fix_ts_console_declare_once.sh || true
bash scripts/ci/ts_partition_compile_once.sh || true
bash scripts/ci/ci_collect_errors_once.sh || true
node scripts/metrics/ci_trend_append_once.js || true

# Artifacts to verify
ESL_JSON="summaries/eslint-report.json"
TSC_TXT="summaries/tsc-nb2-report.txt"          # may exist from prior patches
PART_JSON="$(ls -1t summaries/tsc-partition-*.json 2>/dev/null | head -n1 || true)"
TREND_JSONL="summaries/ci-trend.jsonl"
TREND_CSV="summaries/ci-trend.csv"

[[ -f "$ESL_JSON" ]] || PASS=false
[[ -f "$TREND_JSONL" ]] || PASS=false
[[ -f "$TREND_CSV" ]] || PASS=false
# partition JSON is optional if no TS files present
if git ls-files | grep -qE '^scripts/.+\.ts$'; then
  [[ -f "$PART_JSON" ]] || PASS=false
fi

{
  echo "# NB-2.0 CI Debt Triage — Trend & TS Batches (v2.0.214)"
  echo
  echo "## Artifacts"
  echo "- eslint report: $(basename "${ESL_JSON:-none}")"
  echo "- tsc report:   $(basename "${TSC_TXT:-none}")"
  echo "- tsc batches:  $(basename "${PART_JSON:-none}")"
  echo "- trend jsonl:  $(basename "${TREND_JSONL:-none}")"
  echo "- trend csv:    $(basename "${TREND_CSV:-none}")"
  echo
  echo "## Notes"
  echo "- Patch focuses on *running tools and recording debt*, not failing the build on CI errors."
  echo "- Use 'nb2_cli ci-validate' for strict gating when ready."
  echo
  if $PASS; then
    echo "AGENT_VALIDATION: PASS"
  else
    echo "AGENT_VALIDATION: FAIL"
  fi
  echo
  echo "> 🔗 This summary relates to: patchName: [patch-v2.0.214(P2.10.04)_nb2-ci-debt-triage-trend-and-ts-batches]"
  echo "> 📍 Roadmap Phase: Phase 2 of ROADMAP_FOR_DUMMIES.md"
} > "$SUMMARY"

$PASS
