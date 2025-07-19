#!/bin/bash

# Deploy Slack App Manifest
set -e

echo "🚀 Deploying Slack App Manifest"
echo "================================"

# Check if manifest exists
if [ ! -f "slack-app-manifest.yaml" ]; then
    echo "❌ slack-app-manifest.yaml not found"
    exit 1
fi

echo "📋 Manifest found. Here's how to deploy it:"
echo ""
echo "1. Go to https://api.slack.com/apps"
echo "2. Click 'Create New App'"
echo "3. Choose 'From an app manifest'"
echo "4. Select your workspace"
echo "5. Copy and paste the contents of slack-app-manifest.yaml"
echo "6. Click 'Create'"
echo ""

echo "📝 Manifest contents:"
echo "====================="
cat slack-app-manifest.yaml

echo ""
echo "🔐 After creating the app, you'll need to:"
echo "1. Get the Signing Secret from the app settings"
echo "2. Run: ./setup-slack-secrets.sh"
echo "3. Update the signing secret in .env and Fly.io"
echo "4. Install the app to your workspace"
echo ""

echo "✅ Manifest ready for deployment!"
echo "📄 You can also copy the manifest from: slack-app-manifest.yaml" 