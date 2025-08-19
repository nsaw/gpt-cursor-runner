#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"
mkdir -p .git/hooks
if [[ ! -L ".git/hooks/pre-commit" && -e ".git/hooks/pre-commit" ]]; then
  # backup an existing file hook once
  cp ".git/hooks/pre-commit" ".git/hooks/pre-commit.bak.$(date +%s)" || true
  rm -f ".git/hooks/pre-commit"
fi
ln -sf "../../scripts/nb2_precommit_guard.sh" ".git/hooks/pre-commit"
chmod +x ".git/hooks/pre-commit"
echo "[install_hooks_once] pre-commit hook installed → scripts/nb2_precommit_guard.sh"
