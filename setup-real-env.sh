#!/bin/bash

# Setup real environment for GPT-Cursor Runner
# This script helps set up the .env file with real values

echo "🔧 Setting up GPT-Cursor Runner environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp env.example .env
fi

echo "📝 Please provide the following configuration values:"
echo ""

# Get configuration values
read -p "RUNNER_URL (default: https://runner.thoughtmarks.app): " RUNNER_URL
RUNNER_URL=${RUNNER_URL:-https://runner.thoughtmarks.app}

read -p "RUNNER_DEV_URL (default: https://runner-dev.thoughtmarks.app): " RUNNER_DEV_URL
RUNNER_DEV_URL=${RUNNER_DEV_URL:-https://runner-dev.thoughtmarks.app}

read -p "ENDPOINT_URL (default: https://runner.thoughtmarks.app/webhook): " ENDPOINT_URL
ENDPOINT_URL=${ENDPOINT_URL:-https://runner.thoughtmarks.app/webhook}

read -p "DASHBOARD_URL (default: https://runner.thoughtmarks.app/dashboard): " DASHBOARD_URL
DASHBOARD_URL=${DASHBOARD_URL:-https://runner.thoughtmarks.app/dashboard}

read -p "SLACK_BOT_TOKEN: " SLACK_BOT_TOKEN
read -p "SLACK_SIGNING_SECRET: " SLACK_SIGNING_SECRET
read -p "SLACK_CLIENT_ID: " SLACK_CLIENT_ID
read -p "SLACK_CLIENT_SECRET: " SLACK_CLIENT_SECRET

# Update .env file
echo "💾 Updating .env file..."

# Use sed to update the .env file
sed -i.bak "s|RUNNER_URL=.*|RUNNER_URL=$RUNNER_URL|" .env
sed -i.bak "s|RUNNER_DEV_URL=.*|RUNNER_DEV_URL=$RUNNER_DEV_URL|" .env
sed -i.bak "s|ENDPOINT_URL=.*|ENDPOINT_URL=$ENDPOINT_URL|" .env
sed -i.bak "s|DASHBOARD_URL=.*|DASHBOARD_URL=$DASHBOARD_URL|" .env
sed -i.bak "s|SLACK_BOT_TOKEN=.*|SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN|" .env
sed -i.bak "s|SLACK_SIGNING_SECRET=.*|SLACK_SIGNING_SECRET=$SLACK_SIGNING_SECRET|" .env
sed -i.bak "s|SLACK_CLIENT_ID=.*|SLACK_CLIENT_ID=$SLACK_CLIENT_ID|" .env
sed -i.bak "s|SLACK_CLIENT_SECRET=.*|SLACK_CLIENT_SECRET=$SLACK_CLIENT_SECRET|" .env

# Remove backup file
rm -f .env.bak

echo "✅ Environment configured successfully!"
echo ""
echo "📊 Configuration summary:"
echo "   - Production Runner: $RUNNER_URL"
echo "   - Development Runner: $RUNNER_DEV_URL"
echo "   - Webhook Endpoint: $ENDPOINT_URL"
echo "   - Dashboard: $DASHBOARD_URL"
echo ""
echo "🚀 You can now start the servers:"
echo "   npm run dev          # Node.js server (Slack commands)"
echo "   python3 -m gpt_cursor_runner.main  # Python runner (GPT webhooks)" 