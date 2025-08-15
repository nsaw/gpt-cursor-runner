#!/usr/bin/env bash
# scan-unsafe: detect unsafe patterns ( { … & }, disown, raw $!, raw timeout, tail -f, unbounded grep )
set -euo pipefail
set +H
ROOT=${1:-$(pwd)}
LOGDIR="$ROOT/validations/logs"; STATDIR="$ROOT/validations/status"; OUTDIR="$ROOT/validations/unsafe"
mkdir -p "$LOGDIR" "$STATDIR" "$OUTDIR"
# gather files (no VCS/deps/cache)
mapfile -t FILES < <(find "$ROOT" -type f \
  ! -path "*/.git/*" ! -path "*/node_modules/*" ! -path "*/_backups/*" \
  ! -path "*/.venv/*" ! -path "*/.cache/*" ! -path "*/.logs/*")
:>"$OUTDIR/unsafe-curly-group.list" || true
:>"$OUTDIR/unsafe-disown.list" || true
:>"$OUTDIR/unsafe-bang-bang.list" || true
:>"$OUTDIR/unsafe-timeout.list" || true
:>"$OUTDIR/unsafe-tail-follow.list" || true
:>"$OUTDIR/unsafe-grep-hanging.list" || true
for f in "${FILES[@]}"; do
  # { ... & } style inline group
  timeout 2s grep -nE "\{[^\n}]*&[^\n}]*\}" "$f" >>"$OUTDIR/unsafe-curly-group.list" || true
  # disown calls
  timeout 2s grep -nE "(^|[^[:alnum:]_])disown([^[:alnum:]_]|$)" "$f" >>"$OUTDIR/unsafe-disown.list" || true
  # raw $! exposure
  timeout 2s grep -nE "\$!" "$f" >>"$OUTDIR/unsafe-bang-bang.list" || true
  # raw timeout usage (any unit); nb.js should be used instead
  timeout 2s grep -nE "(^|[^[:alnum:]_])timeout[[:space:]]+[0-9]+([smhd])?([^[:alnum:]_]|$)" "$f" >>"$OUTDIR/unsafe-timeout.list" || true
  # tail -f/--follow
  timeout 2s grep -nE "(^|[^[:alnum:]_])tail[[:space:]]+(-f|--follow)" "$f" >>"$OUTDIR/unsafe-tail-follow.list" || true
  # grep without max-count (heuristic): line contains 'grep' but not -m/--max-count
  if timeout 2s grep -nE "(^|[^[:alnum:]_])grep[[:space:]]" "$f" >/tmp/grepline.$$ 2>/dev/null; then
    while IFS= read -r line; do
      if [[ "$line" != *"-m 1"* && "$line" != *"--max-count=1"* && "$line" != *"--max-count 1"* ]]; then
        echo "$line" >>"$OUTDIR/unsafe-grep-hanging.list"
      fi
    done </tmp/grepline.$$
    rm -f /tmp/grepline.$$ || true
  fi
done
# de-dup results
for lf in "$OUTDIR"/*.list; do sort -u "$lf" -o "$lf" || true; done
# Build summary + exit code
FAIL=0
SUMMARY="$OUTDIR/summary.txt"
{
  echo "UNSAFE SUMMARY ($(date -u +%FT%TZ))"
  for lf in unsafe-curly-group.list unsafe-disown.list unsafe-bang-bang.list unsafe-timeout.list unsafe-tail-follow.list unsafe-grep-hanging.list; do
    c=$(wc -l <"$OUTDIR/$lf" || echo 0); echo "$lf: $c"; [[ "$c" != 0 ]] && FAIL=1;
  done
} >"$SUMMARY"
cp "$SUMMARY" "$LOGDIR/scan-unsafe.summary.txt" || true
exit $FAIL
