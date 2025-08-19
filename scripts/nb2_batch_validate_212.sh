#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"
mkdir -p summaries

PASS=true
SUMMARY="summaries/patch-v2.0.212(P2.10.02)_nb2-security-ci-dashboard-probe-and-ports.summary.md"

# A) Security scan (zero findings required)
if bash scripts/nb2_security_scan.sh; then
  SCAN_FILE="$(ls -1t summaries/nb2-security-scan-* | head -n1 || true)"
  SCAN_COUNT=0
else
  SCAN_FILE="$(ls -1t summaries/nb2-security-scan-* | head -n1 || true)"
  SCAN_COUNT=$(wc -l < "$SCAN_FILE" 2>/dev/null | tr -d '[:space:]' || echo 1)
  PASS=false
fi

# B) CI validations (conditional PASS)
if ! bash scripts/nb2_ci_validate.sh; then PASS=false; fi
CI_FILE="$(ls -1t summaries/nb2-ci-validate-* | head -n1 || true)"

# C) Dashboard probe (skips if no URL)
node scripts/dashboard_probe_once.js || true
PROBE_FILE="$(ls -1t summaries/dashboard-probe-* 2>/dev/null | head -n1 || true)"

# D) Port sweep (idempotent; 8081 only for safety)
bash scripts/port_free_once.sh 8081 || true

{
  echo "# NB-2.0 Batch Validation — v2.0.212"
  echo
  echo "## Security scan"
  echo "- file: ${SCAN_FILE:-none}"
  echo "- occurrences: ${SCAN_COUNT:-0}"
  echo
  echo "## CI validation"
  echo "- report: $(basename "${CI_FILE:-none}")"
  echo
  echo "## Dashboard probe"
  echo "- artifact: $(basename "${PROBE_FILE:-skipped}")"
  echo
  echo "## Ports"
  echo "- sweep: 8081 attempted (idempotent)"
  echo
  if $PASS; then
    echo "AGENT_VALIDATION: PASS"
  else
    echo "AGENT_VALIDATION: FAIL"
  fi
  echo
  echo "> 🔗 This summary relates to: patchName: [patch-v2.0.212(P2.10.02)_nb2-security-ci-dashboard-probe-and-ports]"
  echo "> 📍 Roadmap Phase: Phase 2 of ROADMAP_FOR_DUMMIES.md"
} > "$SUMMARY"

$PASS
