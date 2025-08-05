#!/bin/bash
# ghost-relay: merge all ghost watcher outputs into unified log
out='/Users/sawyer/gitSync/gpt-cursor-runner/.ghost-relay.log'
echo "----- $(date) -----" >> "$out"
cat /Users/sawyer/gitSync/gpt-cursor-runner/.last-md-write.log >> "$out"
cat /Users/sawyer/gitSync/gpt-cursor-runner/.ghost-md-status.json >> "$out"
cat /Users/sawyer/gitSync/gpt-cursor-runner/.log-audit-warnings.log >> "$out"
cat /Users/sawyer/gitSync/gpt-cursor-runner/.route-error.log >> "$out"
echo "----------------------" >> "$out" 