#!/bin/bash
# Ghost Summary Verifier
PATCH_ID="$1"
SUMMARY_PATH="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/summary-${PATCH_ID}.md"
if [ ! -f "$SUMMARY_PATH" ]; then
  echo "[❌] Summary missing for patch $PATCH_ID. Retrying..."
# MIGRATED: timeout 30s node scripts/validate/trigger-summary-repair.js "$PATCH_ID" &>/dev/null & disown
node scripts/nb.js --ttl 30s --label node --log validations/logs/node.log --status validations/status -- node scripts/validate/trigger-summary-repair.js "$PATCH_ID"
else
  echo "[✅] Summary exists for $PATCH_ID"
fi
