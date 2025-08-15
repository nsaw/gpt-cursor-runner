#!/bin/bash

# Update Existing Slack App Manifest
set -e

echo "🔄 Updating Existing Slack App Manifest"
echo "======================================="

# Check if manifest exists
if [ ! -f "slack-app-manifest-v2.yaml" ]; then
    echo "❌ slack-app-manifest-v2.yaml not found"
    exit 1
fi

echo "📋 To update your existing Slack app:"
echo ""
echo "1. Go to https://api.slack.com/apps"
echo "2. Select your existing 'GPT-Cursor Runner' app"
echo "3. Click 'App Manifest' in the left sidebar"
echo "4. Click 'Edit' to modify the manifest"
echo "5. Replace the entire manifest with the contents below"
echo "6. Click 'Save Changes'"
echo "7. Click 'Install App' to install the updated commands"
echo ""

echo "📝 Updated manifest contents:"
echo "============================="
cat slack-app-manifest-v2.yaml

echo ""
echo "🔧 After updating the manifest:"
echo "1. The new commands will be available in ~5 minutes"
echo "2. Test with: /status-runner"
echo "3. All new consolidated commands should work"
echo ""

echo "📊 New commands added:"
echo "• /status-runner (renamed from /status)"
echo "• /kill (renamed from /kill-runner)"
echo "• /proceed (consolidated: approve, continue, resume)"
echo "• /again (consolidated: retry, restart)"
echo "• /manual-revise (new: manual patch revision)"
echo "• /manual-append (new: manual content append)"
echo "• /interrupt (new: pause/stop operations)"
echo "• /troubleshoot (new: auto diagnostics)"
echo "• /troubleshoot-oversight (new: manual oversight)"
echo "• /send-with (new: AI context requests)"
echo "• /gpt-slack-dispatch (new: GPT direct posting)"
echo "• /cursor-slack-dispatch (new: Cursor direct posting)"
echo ""

echo "✅ Manifest ready for update!"
echo "📄 You can also copy the manifest from: slack-app-manifest-v2.yaml" 
