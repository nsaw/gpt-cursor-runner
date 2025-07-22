#!/bin/bash

# Replace tilde path references with absolute paths
# This script targets only path-related tilde usage, not legitimate uses like time estimates

echo "[🔧] Replacing tilde path references with absolute paths..."

# Find and replace common tilde path patterns
find /Users/sawyer/gitSync/gpt-cursor-runner -type f \( -name "*.js" -o -name "*.py" -o -name "*.sh" -o -name "*.json" -o -name "*.md" -o -name "*.yaml" -o -name "*.yml" \) -exec sed -i '' 's|/Users/sawyer/gitSync|/Users/sawyer/gitSync|g' {} \;
find /Users/sawyer/gitSync/gpt-cursor-runner -type f \( -name "*.js" -o -name "*.py" -o -name "*.sh" -o -name "*.json" -o -name "*.md" -o -name "*.yaml" -o -name "*.yml" \) -exec sed -i '' 's|/Users/sawyer/.cursor-cache|/Users/sawyer/.cursor-cache|g' {} \;
find /Users/sawyer/gitSync/gpt-cursor-runner -type f \( -name "*.js" -o -name "*.py" -o -name "*.sh" -o -name "*.json" -o -name "*.md" -o -name "*.yaml" -o -name "*.yml" \) -exec sed -i '' 's|~/\.cursor-cache|/Users/sawyer/.cursor-cache|g' {} \;

echo "[✅] Tilde path replacement completed"
echo "[🔍] Verifying no path-related tilde references remain..."

# Check for remaining tilde path references
grep -r "/Users/sawyer/gitSync\|/Users/sawyer/.cursor-cache" /Users/sawyer/gitSync/gpt-cursor-runner/ 2>/dev/null || echo "[✅] No tilde path references found"

echo "[🎯] Path enforcement complete - all paths now use absolute references" 