#!/bin/bash
set -e
cd "$(dirname "$0")"

source .env

pgrep ngrok || nohup ngrok http 3000 --authtoken $NGROK_AUTH_TOKEN > /dev/null 2>&1 &
sleep 2

curl -s http://localhost:3000/health || npm run dev &
sleep 2

curl -X POST http://localhost:3000/ping -H "Content-Type: application/json" -d '{"message": "runner selfcheck ping"}' || echo "⚠️ Ping failed"
