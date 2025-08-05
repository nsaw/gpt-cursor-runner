#!/bin/bash

# Webhook-Thoughtmarks Slack App Installation Script
# This script starts the installation server to add the app to your Slack workspace

set -e

echo "🤖 Webhook-Thoughtmarks Slack App Installation"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "config/webhook-thoughtmarks.env" ]; then
    echo "❌ Error: config/webhook-thoughtmarks.env not found"
    echo "Please run this script from the gpt-cursor-runner directory"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js to continue"
    exit 1
fi

# Check if required packages are installed
if [ ! -f "node_modules/express/package.json" ]; then
    echo "📦 Installing required packages..."
    npm install express axios dotenv
fi

echo "🚀 Starting installation server..."
echo ""
echo "📋 The installation server will start on http://localhost:3000"
echo "🔗 Open this URL in your browser to install the app to your Slack workspace"
echo ""
echo "📝 Installation steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Click 'Install to Slack'"
echo "3. Authorize the app in Slack"
echo "4. Copy the provided tokens"
echo "5. Restart the webhook-thoughtmarks server"
echo ""
echo "Press Ctrl+C to stop the installation server"
echo ""

# Start the installation server
node scripts/install-webhook-thoughtmarks.js 