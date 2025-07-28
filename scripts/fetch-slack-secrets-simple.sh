#!/bin/bash
# Simple script to fetch Slack secrets from 1Password CLI

set -e

echo "🔐 Fetching Slack secrets from 1Password CLI..."

# Check if op CLI is available
if ! command -v op &> /dev/null; then
    echo "❌ 1Password CLI (op) not found."
    exit 1
fi

# Create .env file
echo "# Generated from 1Password CLI - $(date)" > .env
echo "# Vault: SecretKeeper" >> .env
echo "" >> .env

echo "📝 Fetching secrets from SecretKeeper vault..."

# Fetch SLACK_BOT_TOKEN
echo "   Fetching SLACK_BOT_TOKEN..."
BOT_TOKEN=$(op item get "SLACK_BOT_TOKEN" --vault SecretKeeper --format=json | jq -r '.fields[] | select(.label=="password") | .value')
if [ "$BOT_TOKEN" != "null" ] && [ -n "$BOT_TOKEN" ]; then
    echo "SLACK_BOT_TOKEN=$BOT_TOKEN" >> .env
    echo "   ✅ SLACK_BOT_TOKEN fetched successfully"
else
    echo "SLACK_BOT_TOKEN=your-slack-bot-token-here" >> .env
    echo "   ⚠️  SLACK_BOT_TOKEN not found"
fi

# Fetch SLACK_SIGNING_SECRET
echo "   Fetching SLACK_SIGNING_SECRET..."
SIGNING_SECRET=$(op item get "SLACK_SIGNING_SECRET" --vault SecretKeeper --format=json | jq -r '.fields[] | select(.label=="password") | .value')
if [ "$SIGNING_SECRET" != "null" ] && [ -n "$SIGNING_SECRET" ]; then
    echo "SLACK_SIGNING_SECRET=$SIGNING_SECRET" >> .env
    echo "   ✅ SLACK_SIGNING_SECRET fetched successfully"
else
    echo "SLACK_SIGNING_SECRET=your-slack-signing-secret-here" >> .env
    echo "   ⚠️  SLACK_SIGNING_SECRET not found"
fi

# Fetch SLACK_CLIENT_ID
echo "   Fetching SLACK_CLIENT_ID..."
CLIENT_ID=$(op item get "SLACK_CLIENT_ID" --vault SecretKeeper --format=json | jq -r '.fields[] | select(.label=="password") | .value')
if [ "$CLIENT_ID" != "null" ] && [ -n "$CLIENT_ID" ]; then
    echo "SLACK_CLIENT_ID=$CLIENT_ID" >> .env
    echo "   ✅ SLACK_CLIENT_ID fetched successfully"
else
    echo "SLACK_CLIENT_ID=your-slack-client-id-here" >> .env
    echo "   ⚠️  SLACK_CLIENT_ID not found"
fi

# Fetch SLACK_CLIENT_SECRET
echo "   Fetching SLACK_CLIENT_SECRET..."
CLIENT_SECRET=$(op item get "SLACK_CLIENT_SECRET" --vault SecretKeeper --format=json | jq -r '.fields[] | select(.label=="password") | .value')
if [ "$CLIENT_SECRET" != "null" ] && [ -n "$CLIENT_SECRET" ]; then
    echo "SLACK_CLIENT_SECRET=$CLIENT_SECRET" >> .env
    echo "   ✅ SLACK_CLIENT_SECRET fetched successfully"
else
    echo "SLACK_CLIENT_SECRET=your-slack-client-secret-here" >> .env
    echo "   ⚠️  SLACK_CLIENT_SECRET not found"
fi

# Fetch SLACK_APP_TOKEN
echo "   Fetching SLACK_APP_TOKEN..."
APP_TOKEN=$(op item get "SLACK_APP_TOKEN" --vault SecretKeeper --format=json | jq -r '.fields[] | select(.label=="password") | .value')
if [ "$APP_TOKEN" != "null" ] && [ -n "$APP_TOKEN" ]; then
    echo "SLACK_APP_TOKEN=$APP_TOKEN" >> .env
    echo "   ✅ SLACK_APP_TOKEN fetched successfully"
else
    echo "SLACK_APP_TOKEN=your-slack-app-token-here" >> .env
    echo "   ⚠️  SLACK_APP_TOKEN not found"
fi

# Add other required environment variables
echo "" >> .env
echo "# Runner Configuration" >> .env
echo "RUNNER_URL=https://gpt-cursor-runner.fly.dev" >> .env
echo "RUNNER_DEV_URL=https://gpt-cursor-runner.fly.dev" >> .env
echo "ENDPOINT_URL=https://gpt-cursor-runner.fly.dev/webhook" >> .env
echo "ENDPOINT_DEV_URL=https://gpt-cursor-runner.fly.dev/webhook" >> .env
echo "DASHBOARD_URL=https://gpt-cursor-runner.fly.dev/dashboard" >> .env
echo "DASHBOARD_DEV_URL=https://gpt-cursor-runner.fly.dev/dashboard" >> .env
echo "RUNNER_PORT=5555" >> .env
echo "RUNNER_DEV_PORT=5051" >> .env
echo "AUTO_MODE=false" >> .env
echo "PAUSED=false" >> .env
echo "LOG_LEVEL=INFO" >> .env
echo "EVENT_LOG_FILE=event-log.json" >> .env
echo "DEBUG_MODE=false" >> .env

echo ""
echo "✅ .env file generated with secrets from 1Password"
echo "📊 Environment variables set up"

# Test the configuration
echo ""
echo "🧪 Testing Slack configuration..."
if [ -f "test_slack_config.py" ]; then
    python3 test_slack_config.py
else
    echo "   ⚠️  test_slack_config.py not found, skipping test"
fi

echo ""
echo "🚀 Ready to use Slack secrets from 1Password!" 