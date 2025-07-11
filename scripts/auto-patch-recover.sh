#!/bin/bash

# Auto Patch Recovery Script
# Runs every 3 minutes via cron to ensure patches are applied

cd /Users/sawyer/gitSync/gpt-cursor-runner

# Check if patch runner is running
if ! pgrep -f "python3.*patch_runner" > /dev/null; then
    echo "$(date): Patch runner not running, starting..."
    python3 -m gpt_cursor_runner.patch_runner --auto > logs/patch-recovery.log 2>&1 &
fi

# Check for new patches and apply them
if [ -d "patches" ] && [ "$(ls -A patches/*.json 2>/dev/null)" ]; then
    echo "$(date): Found patches, applying..."
    python3 apply_all_patches.py >> logs/patch-recovery.log 2>&1
fi

echo "$(date): Patch recovery check completed" 