#!/bin/bash

# Deploy GPT-Cursor Runner to Fly.io
# This script sets up the production deployment with proper environment variables

set -e

echo "🚀 Deploying GPT-Cursor Runner to Fly.io..."

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI not found. Please install it first:"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if we're logged in
if ! fly auth whoami &> /dev/null; then
    echo "❌ Not logged in to Fly.io. Please run:"
    echo "   fly auth login"
    exit 1
fi

echo "📋 Setting up environment variables..."

# Get secrets from user
read -p "SLACK_BOT_TOKEN: " SLACK_BOT_TOKEN
read -p "SLACK_SIGNING_SECRET: " SLACK_SIGNING_SECRET
read -p "SLACK_CLIENT_ID: " SLACK_CLIENT_ID
read -p "SLACK_CLIENT_SECRET: " SLACK_CLIENT_SECRET

# Set secrets
echo "🔐 Setting Fly.io secrets..."
fly secrets set SLACK_BOT_TOKEN="$SLACK_BOT_TOKEN"
fly secrets set SLACK_SIGNING_SECRET="$SLACK_SIGNING_SECRET"
fly secrets set SLACK_CLIENT_ID="$SLACK_CLIENT_ID"
fly secrets set SLACK_CLIENT_SECRET="$SLACK_CLIENT_SECRET"

# Set Cloudflare tunnel URLs
fly secrets set RUNNER_URL=https://runner.thoughtmarks.app
fly secrets set RUNNER_DEV_URL=https://runner.thoughtmarks.app
fly secrets set ENDPOINT_URL=https://runner.thoughtmarks.app/webhook
fly secrets set DASHBOARD_URL=https://runner.thoughtmarks.app/dashboard
fly secrets set PUBLIC_RUNNER_URL=https://runner.thoughtmarks.app

echo "✅ Secrets configured successfully"

# Deploy the application
echo "🚀 Deploying application..."
fly deploy

echo "✅ Deployment complete!"
echo ""
echo "📊 Your application is now live at:"
echo "   - Production: https://runner.thoughtmarks.app"
echo "   - Development: https://runner.thoughtmarks.app"
echo ""
echo "🔗 Health check: https://runner.thoughtmarks.app/health"
echo "📊 Dashboard: https://runner.thoughtmarks.app/dashboard" 
