#!/usr/bin/env bash
# nb-safe-detach: run nb.js without exposing $! to the interactive shell
# - set +H disables history expansion, so '!: event not found' cannot occur
# - no inline (...) & groups in the caller
# - no 'disown' (policy-safe); detaches via nohup & background
set -euo pipefail
set +H
LABEL="$1"; TTL="${2:-18s}"; shift 2
mkdir -p validations/logs validations/status
# Detach nb.js in a subshell; return immediately
nohup bash -lc "node scripts/nb.js --ttl ${TTL} --label ${LABEL} --log validations/logs/${LABEL}.log --status validations/status -- ${*}" >/dev/null 2>&1 &
PID=$!
echo "${PID}" > "validations/status/${LABEL}.pid"
exit 0
