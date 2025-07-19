#!/bin/bash

# One-click Slack command registration for GPT-Cursor Runner
set -e

echo "🚀 Automated Slack Command Registration"
echo "======================================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create it with your Slack tokens."
    exit 1
fi

# Load environment variables
source .env

# Check if required tokens are set
if [ -z "$SLACK_BOT_TOKEN" ]; then
    echo "❌ SLACK_BOT_TOKEN not found in .env file"
    exit 1
fi

if [ -z "$SLACK_SIGNING_SECRET" ]; then
    echo "❌ SLACK_SIGNING_SECRET not found in .env file"
    exit 1
fi

echo "✅ Environment variables loaded"
echo "📡 Webhook URL: ${PUBLIC_RUNNER_URL:-https://gpt-cursor-runner.fly.dev}/slack/commands"
echo ""

# Choose registration method
echo "Choose registration method:"
echo "1. Individual registration (slower, more detailed)"
echo "2. Bulk registration (faster, batched)"
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo "📝 Running individual command registration..."
        node tasks/9_automated_slack_command_registration.js
        ;;
    2)
        echo "📦 Running bulk command registration..."
        node tasks/10_bulk_slack_command_registration.js
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "✅ Registration complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test a command in Slack: /status"
echo "2. Check the logs for any errors"
echo "3. Verify all commands are available in your Slack workspace"
echo ""
echo "🔗 Your runner is available at: ${PUBLIC_RUNNER_URL:-https://gpt-cursor-runner.fly.dev}" 