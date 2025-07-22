#!/bin/bash
# ghost-sync-index: regenerate manifest from real summaries if needed
summary_path='/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries'
index_out='/Users/sawyer/gitSync/.cursor-cache/MAIN/manifest-auto.json'
echo '[' > "$index_out"
find "$summary_path" -name '*.md' | while read f; do echo "  { \"file\": \"$f\" }," >> "$index_out"; done
echo '  { "end": true }' >> "$index_out"
echo ']' >> "$index_out" 