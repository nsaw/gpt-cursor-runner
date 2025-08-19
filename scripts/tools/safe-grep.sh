#!/usr/bin/env bash
# safe-grep: bounded, non-hanging grep wrapper
# Usage: safe-grep.sh <timeoutSec> <pattern> -- <file...>
set -euo pipefail
set +H
if [[ $# -lt 3 ]]; then echo "Usage: $0 <timeoutSec> <pattern> -- <files...>" >&2; exit 64; fi
TO=$1; shift
PATTERN=$1; shift
[[ "$1" == "--" ]] || { echo "Missing -- before files" >&2; exit 64; }
shift
# run grep with max-count=1, no colors, line-buffered, treat binary as no-match
exec timeout "${TO}s" grep -E -H -n -m 1 --line-buffered --binary-files=without-match --color=never -- "$PATTERN" "$@"
