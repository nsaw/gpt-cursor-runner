#!/bin/bash

# Setup Slack Webhook Environment Variables
# This script configures the webhook URL and related environment variables

set -e

echo "🔧 Setting up Slack webhook environment variables..."

# Webhook URL from user input
WEBHOOK_URL="https://hooks.slack.com/services/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"

# Default values
CHANNEL="#runner-control"
USERNAME="GPT-Cursor Runner"

echo "📡 Webhook URL: $WEBHOOK_URL"
echo "📺 Channel: $CHANNEL"
echo "👤 Username: $USERNAME"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp env.example .env
fi

# Update .env file with webhook configuration
echo "🔧 Updating .env file with webhook configuration..."

# Function to update or add environment variable
update_env_var() {
    local key=$1
    local value=$2
    local file=".env"
    
    if grep -q "^${key}=" "$file"; then
        # Update existing variable
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
        else
            # Linux
            sed -i "s|^${key}=.*|${key}=${value}|" "$file"
        fi
    else
        # Add new variable
        echo "${key}=${value}" >> "$file"
    fi
}

# Update webhook-related environment variables
update_env_var "SLACK_WEBHOOK_URL" "$WEBHOOK_URL"
update_env_var "SLACK_CHANNEL" "$CHANNEL"
update_env_var "SLACK_USERNAME" "$USERNAME"

echo "✅ Environment variables updated successfully!"

# Test the webhook connection
echo "🧪 Testing webhook connection..."
node scripts/test_slack_webhook.js

echo ""
echo "🎉 Webhook setup completed!"
echo ""
echo "📋 Configuration Summary:"
echo "   Webhook URL: $WEBHOOK_URL"
echo "   Channel: $CHANNEL"
echo "   Username: $USERNAME"
echo ""
echo "📝 Environment variables have been added to .env file"
echo "🧪 Webhook test completed - check Slack for test messages"
echo ""
echo "🚀 You can now use the webhook for notifications in your handlers!" 