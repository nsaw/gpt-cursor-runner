#!/bin/bash
# Fetch Slack Secrets from 1Password CLI
# Fetches real Slack tokens from SecretKeeper vault and sets them up

set -e

echo "🔐 Fetching Slack secrets from 1Password CLI..."

# Check if op CLI is available
if ! command -v op &> /dev/null; then
    echo "❌ 1Password CLI (op) not found. Please install it first:"
    echo "   https://developer.1password.com/docs/cli/get-started/"
    exit 1
fi

# Check if authenticated to 1Password
if ! op account list &> /dev/null; then
    echo "❌ Not authenticated to 1Password. Please sign in first:"
    echo "   op signin"
    exit 1
fi

echo "✅ 1Password CLI authenticated"

# Define the secrets we need with their actual item names in SecretKeeper
declare -A SECRETS=(
    ["SLACK_BOT_TOKEN"]="SLACK_BOT_TOKEN"
    ["SLACK_SIGNING_SECRET"]="SLACK_SIGNING_SECRET"
    ["SLACK_CLIENT_ID"]="SLACK_CLIENT_ID"
    ["SLACK_CLIENT_SECRET"]="SLACK_CLIENT_SECRET"
    ["SLACK_APP_TOKEN"]="SLACK_APP_TOKEN"
    ["SLACK_BOT_OAUTH_TOKEN"]="SLACK_BOT_OAUTH_TOKEN"
    ["SLACK_ACCESS_TOKEN"]="SLACK_ACCESS_TOKEN"
    ["SLACK_APP_ID"]="SLACK_APP_ID"
    ["SLACK_REFRESH_TOKEN"]="SLACK_REFRESH_TOKEN"
    ["SLACK_VERIFICATION_TOKEN"]="SLACK_VERIFICATION_TOKEN"
)

# Create .env file with fetched secrets
echo "# Generated from 1Password CLI - $(date)" > .env
echo "# Vault: SecretKeeper" >> .env
echo "" >> .env

echo "📝 Fetching secrets from SecretKeeper vault..."

# Fetch each secret
for env_var in "${!SECRETS[@]}"; do
    item_name="${SECRETS[$env_var]}"
    echo "   Fetching $item_name..."
    
    # Try to get the secret from 1Password
    if op item get "$item_name" --vault SecretKeeper --format=json &> /dev/null; then
        # Extract the password field value using the correct field ID
        value=$(op item get "$item_name" --vault SecretKeeper --format=json | jq -r '.fields[] | select(.label=="password") | .value')
        
        if [ "$value" != "null" ] && [ -n "$value" ]; then
            echo "$env_var=$value" >> .env
            echo "   ✅ $item_name fetched successfully"
        else
            echo "   ⚠️  $item_name not found or empty, using placeholder"
            echo "$env_var=your-$env_var-here" >> .env
        fi
    else
        echo "   ⚠️  $item_name not found in vault, using placeholder"
        echo "$env_var=your-$env_var-here" >> .env
    fi
done

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
echo "   To test: python3 test_slack_config.py" 