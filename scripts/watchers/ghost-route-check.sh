#!/bin/bash
# ghost-route-check: ensures all .md files are in correct summary folder
find /Users/sawyer/gitSync/ -name '*.md' | grep -v '/summaries/' > /Users/sawyer/gitSync/gpt-cursor-runner/.route-error.log 