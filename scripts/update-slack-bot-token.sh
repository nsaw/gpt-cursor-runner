#!/bin/bash

# Update Slack Bot Token Script
# This script updates the Slack bot token in the .env file

set -e

echo "🔧 Updating Slack Bot Token..."

# Backup current .env file
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# New bot token (expires August 12)
NEW_BOT_TOKEN="xoxe.xoxb-1-MS0yLTkxNzU2MzI3ODc0MDgtOTMxODk5OTAzOTA5Mi05MzYzMzM3MjYyNTYwLTkzNjMzMzcyOTM1MzYtZDU0YzIxNzBiODE4Yjk3MDMzYTBjNTRlNzU1ZjYxYTI0M2JiMzcyZjhhNGI2NWMxNGI2MjBmM2RmYjdhMGExNw"

# Update the bot token in .env file
sed -i '' "s|SLACK_BOT_TOKEN=.*|SLACK_BOT_TOKEN=$NEW_BOT_TOKEN|g" .env

# Also update SLACK_BOT_OAUTH_TOKEN if it exists
sed -i '' "s|SLACK_BOT_OAUTH_TOKEN=.*|SLACK_BOT_OAUTH_TOKEN=$NEW_BOT_TOKEN|g" .env

echo "✅ Bot token updated successfully!"
echo "🔄 Restarting ghost-python service..."

# Restart the ghost-python service to pick up new environment variables
{ pm2 restart ghost-python & } >/dev/null 2>&1 & disown

echo "⏳ Waiting for service to restart..."
sleep 5

# Check service status
{ pm2 status ghost-python & } >/dev/null 2>&1 & disown

echo "✅ Update complete!"
echo "🎯 Next steps:"
echo "1. Test /status-runner command in Slack"
echo "2. Verify bot user 'Ghost' is online"
echo "3. Check that all 26 commands are available"
