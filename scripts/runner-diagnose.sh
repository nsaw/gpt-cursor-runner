#!/bin/bash
set -e

echo "🔍 Checking .env file..."
[[ -f .env ]] && echo "✅ .env exists" || echo "❌ .env missing"

echo "🔍 Checking ngrok tunnel..."
pgrep ngrok >/dev/null && echo "✅ ngrok is running" || echo "❌ ngrok is not running"

echo "🔍 Checking Cursor port..."
lsof -i :3000 | grep LISTEN && echo "✅ Cursor port 3000 open" || echo "❌ Cursor not listening"

echo "🔍 Checking Slack command registration..."
curl -s https://slack.com/api/apps.commands.list -H "Authorization: Bearer $SLACK_BOT_TOKEN" | grep -q "commands" && echo "✅ Slack commands found" || echo "⚠️ Slack command check failed (requires API access)"
