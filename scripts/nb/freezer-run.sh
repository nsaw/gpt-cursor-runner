#!/usr/bin/env bash
set -euo pipefail
# Usage: freezer-run.sh <cmd...>
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SELF_DIR}/.." && pwd)"
"${ROOT}/scripts/nb-safe-detach.sh" freezer 900s "$@"
