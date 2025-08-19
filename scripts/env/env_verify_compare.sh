#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
cd "$ROOT"
mkdir -p summaries
main=".env"
tmpl=".env.template"
out="summaries/env-compare-$(date +%Y%m%d-%H%M%S).md"
echo "# .env vs .env.template" > "$out"
if [[ ! -f "$main" || ! -f "$tmpl" ]]; then
  echo "- Skipped: one or both files missing (main=$main, tmpl=$tmpl)" >> "$out"
  exit 0
fi
# Key-by-key diff (ignores comments/blank lines)
awk -F= '/^[[:space:]]*#/ {next} NF {print $1}' "$tmpl" | sort -u > /tmp/tmpl.keys
awk -F= '/^[[:space:]]*#/ {next} NF {print $1}' "$main" | sort -u > /tmp/main.keys
missing=$(comm -23 /tmp/tmpl.keys /tmp/main.keys | xargs -I{} echo "{}")
extra=$(comm -13 /tmp/tmpl.keys /tmp/main.keys | xargs -I{} echo "{}")
echo "## Missing keys (present in template, absent in .env)" >> "$out"
if [[ -n "${missing// /}" ]]; then echo "$missing" | sed 's/^/- /' >> "$out"; else echo "- none" >> "$out"; fi
echo "" >> "$out"
echo "## Extra keys (present in .env, not in template)" >> "$out"
if [[ -n "${extra// /}" ]]; then echo "$extra" | sed 's/^/- /' >> "$out"; else echo "- none" >> "$out"; fi
echo "" >> "$out"
echo "## Note" >> "$out"
echo "- Values are not compared for security; this is structure-only." >> "$out"
echo "[env_verify_compare] wrote $(basename "$out")"
