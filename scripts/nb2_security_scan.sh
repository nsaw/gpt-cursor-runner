#!/usr/bin/env bash
# NB-2.0 security scan: detect risky patterns, allow inline override via "NB2-ALLOW"
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"
mkdir -p summaries
OUT="summaries/nb2-security-scan-$(date +%Y%m%d-%H%M%S).txt"

# Gather tracked files and filter out noisy/binary paths
git ls-files -z \
| grep -zvE '^node_modules/|^dist/|^build/|^coverage/|^screenshots/|^summaries/|^docs/|^\.cursor-cache/|^\.git/' \
| grep -zvE '\.(png|jpg|jpeg|gif|pdf|zip|rar|7z|tar|tgz|tar\.gz|mp4|mov|wav|aiff|bin|exe)$' \
| xargs -0 -I{} bash -c '
    f="{}"
    git show :"$f" >/dev/null 2>&1 || exit 0
    git show :"$f" \
      | nl -ba \
      | grep -nIE "curl[^|]*\|\s*bash|wget[^|]*\|\s*bash|bash\s+-c\s+\"|eval\s+|sudo\s+rm\s+-rf|rm\s+-rf\s+/( |\$|\")" \
      | grep -v "NB2-ALLOW" \
      | sed -E "s@^@${f}:@" || true
  ' > "$OUT" || true

if [[ -s "$OUT" ]]; then
  echo "[nb2_security_scan] Potential risky patterns found. See: $OUT"
  exit 2
else
  echo "[nb2_security_scan] No risky patterns detected."
  : > "$OUT"
fi
