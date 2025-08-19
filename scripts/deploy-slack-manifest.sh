#!/bin/bash

# Slack App Manifest Deployment Script
# This script helps deploy the updated Slack app manifest to fix the dispatch_failed error

set -e

echo "🚀 Slack App Manifest Deployment Script"
echo "========================================"

# Check if manifest file exists
MANIFEST_PATH="/Users/sawyer/gitSync/gpt-cursor-runner/config/slack-app-manifest.yaml"
if [ ! -f "$MANIFEST_PATH" ]; then
    echo "❌ Manifest file not found: $MANIFEST_PATH"
    exit 1
fi

echo "✅ Manifest file found: $MANIFEST_PATH"

# Verify manifest URLs are correct
echo "🔍 Verifying manifest URLs..."
python3 /Users/sawyer/gitSync/gpt-cursor-runner/scripts/update-slack-manifest-urls.py

# Check PM2 services
echo "🔍 Checking PM2 services..."
{ pm2 status & } >/dev/null 2>&1 & disown

# Check tunnel status
echo "🔍 Checking Cloudflare tunnel status..."
{ cloudflared tunnel list & } >/dev/null 2>&1 & disown

echo ""
echo "📋 DEPLOYMENT INSTRUCTIONS"
echo "=========================="
echo ""
echo "1. Go to your Slack App settings:"
echo "   https://api.slack.com/apps"
echo ""
echo "2. Select your GHOST app"
echo ""
echo "3. Go to 'App Manifest' section"
echo ""
echo "4. Copy the contents of: $MANIFEST_PATH"
echo ""
echo "5. Paste the updated manifest and save"
echo ""
echo "6. Go to 'Install App' section"
echo ""
echo "7. Click 'Install to Workspace' (or 'Reinstall App')"
echo ""
echo "8. Test the commands in your Slack workspace:"
echo "   - /status-runner"
echo "   - /dashboard"
echo ""
echo "🔍 MONITORING COMMANDS"
echo "======================"
echo ""
echo "Check PM2 logs:"
echo "  pm2 logs ghost-python"
echo ""
echo "Check tunnel status:"
echo "  cloudflared tunnel info slack"
echo ""
echo "Test endpoints:"
echo "  curl -X POST https://slack.thoughtmarks.app/slack/status-runner"
echo ""
echo "✅ Deployment script completed!"
echo ""
echo "📝 Next: Follow the deployment instructions above to update your Slack app"
