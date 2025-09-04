#!/bin/bash
# Mirror snapshots after summary dump
{ node /Users/sawyer/gitSync/gpt-cursor-runner/scripts/validators/snapshot-mirror.js & } >/dev/null 2>&1 & disown 
