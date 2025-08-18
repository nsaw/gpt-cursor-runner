#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/sawyer/gitSync/gpt-cursor-runner"
cd "$ROOT"
mkdir -p summaries

PASS=true

# Expected utilities from v2.0.208
EXPECT=( \
  write_text_file_once.js \
  pm2_restart_update_env_once.js \
  health_server_once.js \
  dev_runtime_check_once.js \
  ghost_shell_restart_once.js \
  pid_file_update_once.js \
  pid_list_once.js \
  pid_stop_once.js \
  log_file_get_once.js \
)

missing=()
declare -a found_map=()

for f in "${EXPECT[@]}"; do
  # Check if file exists in scripts/g2o/
  if [[ -f "scripts/g2o/${f}" ]]; then
    found_map+=("$f -> scripts/g2o/${f}")
  else
    missing+=("$f")
    PASS=false
  fi
done

# NB-2.0 inline "node -e" ban (scripts/ scope) - exclude .bak files, archives, comments, documentation, and validation tools
inline_node_e_count=0
while IFS= read -r -d '' file; do
  if [[ "$file" != *.bak && "$file" != */.archive/* && "$file" != "scripts/agent_validate_nb2.sh" && "$file" != "scripts/g2o/inline_node_e_scan_once.js" ]]; then
    # Check for actual inline node -e commands (not comments or documentation)
    if grep -v '^[[:space:]]*//' "$file" 2>/dev/null | grep -v '^[[:space:]]*#' | grep -q -E 'node[[:space:]]+-e'; then
      ((inline_node_e_count++))
    fi
  fi
done < <(find scripts/ -type f \( -name "*.sh" -o -name "*.js" -o -name "*.json" \) -print0 2>/dev/null)

if [[ $inline_node_e_count -gt 0 ]]; then
  echo "Forbidden inline 'node -e' still present under ./scripts/ (excluding .bak, archive files, comments, and validation tools)"
  PASS=false
fi

# PM2 health snapshots (do not fail the run if services are errored per policy)
pre_json="summaries/pm2-status.v2.0.209.pre.json"
post_json="summaries/pm2-status.v2.0.209.post.json"
if command -v pm2 >/dev/null 2>&1; then
  pm2 jlist > "$pre_json" || true
else
  echo '{"pm2":"not-installed"}' > "$pre_json"
fi

# Optional DEV runtime check if utility is present
if [[ -f "scripts/g2o/dev_runtime_check_once.js" ]]; then
  # Not long-running; safe without timeout
  node "scripts/g2o/dev_runtime_check_once.js" || PASS=false
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 jlist > "$post_json" || true
else
  echo '{"pm2":"not-installed"}' > "$post_json"
fi

# Compose validation summary (Cursor/DEV writes this file — not GPT)
summary="summaries/patch-v2.0.209(P2.09.01)_agent-validation-dashboard-green-state.summary.md"
{
  echo "# Agent Validation — NB-2.0 (Dashboard Green Gate)"
  echo
  echo "## Utilities presence"
  if ((${#found_map[@]})); then
    for line in "${found_map[@]}"; do echo "- $line"; done
  else
    echo "- none found"
  fi
  if ((${#missing[@]})); then
    echo
    echo "## Missing utilities"
    for m in "${missing[@]}"; do echo "- $m"; done
  else
    echo
    echo "## Missing utilities"
    echo "- none"
  fi
  echo
  echo "## Inline 'node -e' scan (scripts/)"
  echo "- matches: $inline_node_e_count"
  echo
  echo "## PM2 snapshots"
  echo "- pre:  $(basename "$pre_json")"
  echo "- post: $(basename "$post_json")"
  echo
  echo "## Dashboard state"
  echo "- Status: pending — requires user/dashboard confirmation of **GREEN**"
  echo
  if $PASS; then
    echo "AGENT_VALIDATION: PASS"
  else
    echo "AGENT_VALIDATION: FAIL"
  fi
  echo
  echo "> 🔗 This summary relates to: patchName: [patch-v2.0.209(P2.09.01)_agent-validation-dashboard-green-state]"
  echo "> 📍 Roadmap Phase: Phase 2 of ROADMAP_FOR_DUMMIES.md"
} > "$summary"

# Exit code reflects PASS/FAIL
$PASS
