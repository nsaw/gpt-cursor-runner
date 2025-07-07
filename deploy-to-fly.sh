#!/bin/bash

# Fly.io Deployment Script for GPT-Cursor Runner
set -e

echo "🚀 Starting Fly.io deployment for GPT-Cursor Runner..."

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI not found. Please install it first:"
    echo "curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if logged in
if ! fly auth whoami &> /dev/null; then
    echo "❌ Not logged into Fly.io. Please run: fly auth login"
    exit 1
fi

# Create app if it doesn't exist
echo "📋 Creating Fly app..."
fly apps create gpt-cursor-runner --org personal || echo "App already exists"

# Deploy the application
echo "🚀 Deploying to Fly.io..."
fly deploy

# Set required secrets
echo "🔐 Setting up secrets..."
echo "Please provide the following values:"

read -p "SLACK_SIGNING_SECRET: " SLACK_SIGNING_SECRET
read -p "SLACK_BOT_TOKEN: " SLACK_BOT_TOKEN
read -p "OPENAI_API_KEY: " OPENAI_API_KEY
read -p "NGROK_AUTH_TOKEN: " NGROK_AUTH_TOKEN

fly secrets set SLACK_SIGNING_SECRET="$SLACK_SIGNING_SECRET"
fly secrets set SLACK_BOT_TOKEN="$SLACK_BOT_TOKEN"
fly secrets set OPENAI_API_KEY="$OPENAI_API_KEY"
fly secrets set NGROK_AUTH_TOKEN="$NGROK_AUTH_TOKEN"
fly secrets set NODE_ENV=production
fly secrets set PUBLIC_RUNNER_URL=https://runner.thoughtmarks.app

# Check deployment status
echo "📊 Checking deployment status..."
fly status

# Show app URL
echo "🌐 Your app is available at:"
fly info

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update your Slack app webhook URL to: https://gpt-cursor-runner.fly.dev/slack/commands"
echo "2. Test the health endpoint: https://gpt-cursor-runner.fly.dev/health"
echo "3. View logs: fly logs"
echo "4. Monitor dashboard: fly dashboard" 