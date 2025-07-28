#!/bin/bash
set -e
cd /Users/sawyer/gitSync/gpt-cursor-runner

# Remove corrupted venv
rm -rf .venv || true

# Rebuild
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Launch Ghost Runner
nohup python3 -m gpt_cursor_runner.main --port 5051 > logs/ghost-runner.log 2>&1 & disown

# Ping health
sleep 5
curl -s http://localhost:5051/health || echo '[❌] Ghost runner health ping failed'

exit 0 