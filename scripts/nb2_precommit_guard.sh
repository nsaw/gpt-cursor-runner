#!/usr/bin/env bash
# NB-2.0 guard: blocks commits that introduce inline `node -e` in tracked sources.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

# Gather staged files
git diff --cached --name-only -z | tr -d '\n' | xargs -0 -I{} bash -c 'printf "%s\n" "{}"' > "$tmp" || true

# Filter candidates
mapfile -t files < <(grep -vE '^node_modules/|^dist/|^build/|^coverage/|^screenshots/|^summaries/|^docs/|^\.cursor-cache/|\.png$|\.jpg$|\.jpeg$|\.gif$|\.pdf$|\.zip$|\.tgz$|\.tar\.gz$|\.mp4$|\.mov$' "$tmp" || true)

if ((${#files[@]}==0)); then
  exit 0
fi

# Search staged content for forbidden pattern
# Use : (colon) separator output: file:line:match
matches=()
for f in "${files[@]}"; do
  # Use staged blob, not working tree
  if git show :"$f" >/dev/null 2>&1; then
    if git show :"$f" | grep -nI -E '(^|[[:space:]])node[[:space:]]+-e([[:space:]]|$)' >/dev/null 2>&1; then
      # emit a lightweight context line (line number only for speed)
      line="$(git show :"$f" | nl -ba | grep -n -E 'node[[:space:]]+-e' | head -n1 | cut -d: -f1 || echo '?')"
      matches+=("$f:${line:-?}: node -e")
    fi
  fi
done

if ((${#matches[@]})); then
  echo "✖ NB-2.0 pre-commit guard: inline 'node -e' detected in staged content:" >&2
  for m in "${matches[@]}"; do echo "  - $m" >&2; done
  echo "  Remediate by moving logic to a one-shot utility (e.g., scripts/g2o/*_once.js) and call that instead." >&2
  exit 1
fi
