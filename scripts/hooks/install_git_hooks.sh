#!/usr/bin/env bash
set -euo pipefail
cd "/Users/sawyer/gitSync/gpt-cursor-runner"
mkdir -p .git/hooks
cp -f "scripts/hooks/pre-commit.sh" ".git/hooks/pre-commit"
chmod 0755 ".git/hooks/pre-commit"
echo "pre-commit hook installed → .git/hooks/pre-commit"
