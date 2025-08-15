#!/bin/bash
# ghost-md-watcher: monitors .md summary file timestamps
watch_path='/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries'
log_out='/Users/sawyer/gitSync/gpt-cursor-runner/.ghost-md-status.json'
timestamp_out='/Users/sawyer/gitSync/gpt-cursor-runner/.last-md-write.log'
last_ts=$(find "$watch_path" -name '*.md' -type f -exec stat -f '%m %N' {} \; | sort -n | tail -1)
echo "$(date): $last_ts" > "$timestamp_out"
echo "{\"lastSummaryTimestamp\": \"$last_ts\"}" > "$log_out" 
