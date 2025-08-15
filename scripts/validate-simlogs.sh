#!/usr/bin/env bash
set -euo pipefail
LOGFILE=${1:-"./logs/simulator.log"}
if [[ ! -f "$LOGFILE" ]]; then echo "[validate-simlogs] WARN: log file not found: $LOGFILE"; exit 0; fi
# Fail-fast patterns: expand as needed
FAIL_PATTERNS=(
  "FATAL EXCEPTION"
  "Fatal error"
  "Unhandled promise rejection"
  "TypeError:"
  "ReferenceError:"
  "Invariant Violation"
  "ERROR  Invariant"
  "ERROR  Possible Unhandled Promise Rejection"
)
for pat in "${FAIL_PATTERNS[@]}"; do
  if grep -E "$pat" "$LOGFILE" >/dev/null 2>&1; then
    echo "[validate-simlogs] FAIL matched pattern: $pat" >&2
    exit 1
  fi
done
# Optional noisy warnings that shouldn't fail build but we report
WARN_PATTERNS=("Warning:" "deprecated")
for pat in "${WARN_PATTERNS[@]}"; do
  if grep -E "$pat" "$LOGFILE" >/dev/null 2>&1; then
    echo "[validate-simlogs] WARN matched: $pat"
  fi
done
echo "[validate-simlogs] SIMLOGS_OK"
