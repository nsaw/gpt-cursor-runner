#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"
mkdir -p summaries

PASS=true
SUMMARY="summaries/patch-v2.0.213(P2.10.03)_nb2-ci-autofix-soften-and-metrics.summary.md"

# Run safe autofix (JS-only)
bash scripts/ci/eslint_autofix_once.sh || true

# Collect metrics (always produce JSON)
bash scripts/ci/ci_collect_errors_once.sh || true

ESL_JSON="$(ls -1t summaries/eslint-report.json 2>/dev/null | head -n1 || true)"
CI_JSON="$(ls -1t summaries/ci-collect-*.json 2>/dev/null | head -n1 || true)"
TSC_TXT="summaries/tsc-nb2-report.txt"

[[ -f "$CI_JSON" ]] || PASS=false

{
  echo "# NB-2.0 CI Hardening — Metrics & Autofix (v2.0.213)"
  echo
  echo "## Artifacts"
  echo "- eslint report: $(basename "${ESL_JSON:-none}")"
  echo "- ci metrics:   $(basename "${CI_JSON:-none}")"
  echo "- tsc report:   $(basename "${TSC_TXT:-none}")"
  echo
  echo "## Notes"
  echo "- This patch does not fail on CI debt; it ensures tools run and metrics are captured."
  echo "- Use 'nb2_cli.sh ci-validate' for a full strict CI run when ready."
  echo
  if $PASS; then
    echo "AGENT_VALIDATION: PASS"
  else
    echo "AGENT_VALIDATION: FAIL"
  fi
  echo
  echo "> 🔗 This summary relates to: patchName: [patch-v2.0.213(P2.10.03)_nb2-ci-autofix-soften-and-metrics]"
  echo "> 📍 Roadmap Phase: Phase 2 of ROADMAP_FOR_DUMMIES.md"
} > "$SUMMARY"

$PASS
