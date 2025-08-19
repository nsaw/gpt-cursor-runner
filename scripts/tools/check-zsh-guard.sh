#!/usr/bin/env bash
# Advisory by default; hard-fail with CYOPS_ZSH_GUARD_MODE=enforce
set -euo pipefail
SHELL_BIN="${SHELL:-}"
ZRC="$HOME/.zshrc"
OUT="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/cyops-shell-guard.md"
mkdir -p "$(dirname "$OUT")"
MODE="${CYOPS_ZSH_GUARD_MODE:-advisory}"
if [[ "$SHELL_BIN" == *"zsh"* ]]; then
  if [[ -f "$ZRC" ]] && ! grep -qE '(^|\n)case \$- in \*i\*\) |\[\[ \$- .*i.* \]\]' "$ZRC"; then
    {
      echo "# CYOPS Shell Guard"
      echo "Default shell: **$SHELL_BIN**. No interactive-only guard detected in ~/.zshrc."
      echo ""
      echo "## Recommended guard"
      echo '```zsh'
      echo 'case $- in *i*) ;; *) return ;; esac'
      echo '# heavy plugins below (interactive sessions only)'
      echo '```'
      echo ""
      echo "Mode: $MODE"
    } > "$OUT"
    [[ "$MODE" == "enforce" ]] && { echo "ZSH_GUARD_MISSING (enforce): wrote $OUT" >&2; exit 11; } || echo "ZSH_GUARD_ADVISORY: wrote $OUT" >&2
  else
    echo "ZSH_GUARD_OK"
  fi
else
  echo "SHELL_OK: $SHELL_BIN"
fi
