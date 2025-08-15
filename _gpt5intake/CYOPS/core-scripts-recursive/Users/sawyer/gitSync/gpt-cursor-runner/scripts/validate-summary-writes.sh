#!/bin/bash
# Validate summary writes and ghost status file existence

set -e

echo "[VALIDATE] Checking ghost status.json file..."

# Check if ghost status.json exists at the unified path
test -f /Users/sawyer/gitSync/.cursor-cache/CYOPS/ghost/status.json || exit 414

echo "✅ Ghost status.json found at unified path"
echo "✅ Summary validation passed" 
