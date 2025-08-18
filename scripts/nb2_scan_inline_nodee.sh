#!/usr/bin/env bash
# Scans tracked files (git) for inline `node -e` usage while avoiding false positives.
# Excludes: binaries, archives, node_modules, build outputs, screenshots/summaries, docs/*.md
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"

out="summaries/nb2-scan-nodee-$(date +%Y%m%d-%H%M%S).txt"
mkdir -p summaries

# Collect tracked files, filter out noisy paths/extensions.
git ls-files -z \
| grep -zvE '^node_modules/|^dist/|^build/|^coverage/|^screenshots/|^summaries/|^\.git/|^docs/|^\.cursor-cache/|\.archive/' \
| grep -zvE '\.(png|jpg|jpeg|gif|pdf|zip|rar|7z|tar|tgz|tar\.gz|mp4|mov|wav|aiff|bin|exe)$' \
| xargs -0 grep -nI -E '(^|[[:space:]])node[[:space:]]+-e([[:space:]]|$)' \
    -- 2>/dev/null \
| awk 'BEGIN{c=0} {line=$0;
         # Drop common comment-only lines to reduce FPs
         split(line,arr,":"); file=arr[1]; lno=arr[2]; rest=substr(line,index(line,arr[3]));
         s=rest; gsub(/^[[:space:]]+/,"",s);
         if (s ~ /^#/ || s ~ /^\/\//) next;
         print line; c++} END{exit (c>0?0:1)}' \
| tee "$out" >/dev/null || true

if [[ -s "$out" ]]; then
  echo "[nb2_scan_inline_nodee] Found potential inline 'node -e' occurrences. See: $out"
else
  echo "[nb2_scan_inline_nodee] No inline 'node -e' occurrences detected."
fi
