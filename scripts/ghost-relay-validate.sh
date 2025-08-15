#!/bin/bash
log_in='/Users/sawyer/gitSync/gpt-cursor-runner/.ghost-relay.log'
warn_out='/Users/sawyer/gitSync/gpt-cursor-runner/.log-audit-warnings.log'
timestamp=$(date '+%Y-%m-%d %H:%M:%S')
echo '>>> AUDIT PASS START <<< [$timestamp]' >> "$warn_out"
grep -Ei 'exit|❌|not found|skipped|invalid' "$log_in" >> "$warn_out" || echo 'No critical violations found.' >> "$warn_out" 
