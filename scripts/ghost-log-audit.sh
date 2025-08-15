#!/bin/bash
# ghost-log-audit: looks for failure traces in patch logs
find /Users/sawyer/gitSync/.cursor-cache/MAIN/summaries -name '*.md' -exec grep -iE 'fail|error|missing|timeout' {} \; > /Users/sawyer/gitSync/gpt-cursor-runner/.log-audit-warnings.log 
