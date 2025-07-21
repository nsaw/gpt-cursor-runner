# 🚀 Quick Start: Slack Granite Migration

## Overview
This guide will help you quickly migrate your GPT-Cursor Runner from the classic Slack platform to the new Granite platform with Socket Mode v2.

## Prerequisites
- Node.js 18+ installed
- Access to your Slack workspace
- Fly.io CLI configured

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Run Migration Script
```bash
npm run migrate-granite
```

This will guide you through the migration process step by step.

## Step 3: Manual Steps (if needed)

### Create New App
1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App"
3. Choose "From an app manifest"
4. Select your workspace
5. Copy content from `slack-app-manifest-v2.yaml`
6. Click "Create"

### Update Scopes
1. Go to your app settings
2. Navigate to "OAuth & Permissions"
3. Click "Update to Granular Scopes"
4. Follow the UI process
5. Reinstall app to workspace

### Enable Socket Mode
1. Go to "Socket Mode" in app settings
2. Enable Socket Mode
3. Generate app-level token
4. Copy the token (starts with `xapp-`)

### Update Environment
```bash
# Add to .env file
SLACK_APP_TOKEN=xapp-your-socket-mode-token

# Update Fly.io secrets
fly secrets set SLACK_APP_TOKEN="xapp-your-token" --app gpt-cursor-runner
```

## Step 4: Deploy
```bash
fly deploy
```

## Step 5: Test
```bash
# Test commands in Slack
/status
/dashboard
/whoami
```

## Troubleshooting

### Common Issues
- **"App not found"**: Ensure app is created with new manifest
- **"Invalid token"**: Regenerate tokens after scope update
- **"Socket Mode failed"**: Check app token starts with `xapp-`
- **"Commands not working"**: Reinstall app after scope changes

### Rollback
If migration fails:
1. Keep old app running
2. Create new app with classic manifest
3. Test thoroughly before switching
4. Update webhook URLs gradually

## Benefits After Migration
- ✅ Socket Mode v2 (real-time, no webhook URLs)
- ✅ Granular scopes (better security)
- ✅ App Manifests (version control)
- ✅ Token rotation (automatic)
- ✅ Better error handling
- ✅ Slack CLI support

## Support
- [Migration Guide](SLACK_GRANITE_MIGRATION_GUIDE.md)
- [Slack API Documentation](https://api.slack.com/)
- [Socket Mode v2 Guide](https://github.com/slackapi/node-slack-sdk/blob/main/packages/socket-mode/README.md) 