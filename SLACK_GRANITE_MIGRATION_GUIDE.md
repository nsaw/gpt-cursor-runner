# 🚀 Slack Granite Platform Migration Guide

## Overview
This guide will help you migrate your GPT-Cursor Runner Slack app from the classic platform to Slack's newer "Granite" platform, which supports App Manifests, Socket Mode v2, and granular scopes.

## Current State
- **Platform**: Classic Slack Platform
- **Integration**: Webhook-based (HTTP endpoints)
- **Scopes**: Classic OAuth scopes
- **Socket Mode**: Disabled

## Target State
- **Platform**: Granite Platform
- **Integration**: Socket Mode v2 + Webhooks
- **Scopes**: Granular scopes
- **Manifest**: Version 2

## Step 1: Update App Manifest for Granite

### Create New Granite Manifest
```yaml
# slack-app-manifest-v2.yaml
display_information:
  name: GPT-Cursor Runner
  description: Full control interface for GPT-powered Cursor automation
  background_color: "#4A154B"
  long_description: >
    Robots using robots to control robots. This Slack app serves as a command interface
    for a GPT-powered hybrid automation pipeline, controlling Cursor through carefully
    structured instructional blocks and real-time patch orchestration.

metadata:
  api_version: 2

features:
  bot_user:
    display_name: gpt-runner
    always_online: true

  slash_commands:
    - command: /dashboard
      description: View GPT-Cursor Runner dashboard and stats
      usage_hint: View dashboard
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /patch-approve
      description: Approve the next pending GPT patch
      usage_hint: Approve patch
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /patch-revert
      description: Revert the last applied patch
      usage_hint: Revert patch
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /pause-runner
      description: Pause the GPT-Cursor Runner
      usage_hint: Pause runner
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /restart-runner
      description: Restart the GPT-Cursor Runner service
      usage_hint: Restart service
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /restart-runner-gpt
      description: Restart GPT integration specifically
      usage_hint: Restart GPT
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /continue-runner
      description: Resume the paused runner
      usage_hint: Continue runner
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /status
      description: Check current runner status and health
      usage_hint: Check status
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /show-roadmap
      description: Display development roadmap
      usage_hint: Show roadmap
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /roadmap
      description: Show project roadmap and milestones
      usage_hint: View roadmap
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /kill-runner
      description: Force stop the runner (emergency)
      usage_hint: Kill runner
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /toggle-runner-on
      description: Enable the runner
      usage_hint: Enable runner
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /toggle-runner-off
      description: Disable the runner
      usage_hint: Disable runner
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /toggle-runner-auto
      description: Toggle automatic patch processing
      usage_hint: Toggle auto mode
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /theme
      description: Manage Cursor theme settings
      usage_hint: Manage theme
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /theme-status
      description: Check current theme status
      usage_hint: Theme status
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /theme-fix
      description: Fix theme-related issues
      usage_hint: Fix theme
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /patch-preview
      description: Preview pending patches
      usage_hint: Preview patch
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /approve-screenshot
      description: Approve screenshot-based patches
      usage_hint: Approve screenshot
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /revert-phase
      description: Revert to previous phase
      usage_hint: Revert phase
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /log-phase-status
      description: Log current phase status
      usage_hint: Log status
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /cursor-mode
      description: Switch Cursor operation modes
      usage_hint: Switch mode
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /whoami
      description: Show current user and permissions
      usage_hint: Show user info
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /retry-last-failed
      description: Retry the last failed operation
      usage_hint: Retry failed
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /lock-runner
      description: Lock runner (prevent changes)
      usage_hint: Lock runner
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /unlock-runner
      description: Unlock runner (allow changes)
      usage_hint: Unlock runner
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

    - command: /alert-runner-crash
      description: Send crash alert notification
      usage_hint: Alert crash
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

oauth_config:
  redirect_urls:
    - https://gpt-cursor-runner.fly.dev/slack/oauth/callback
  scopes:
    bot:
      - commands
      - chat:write
      - users:read
      - app_mentions:read
      - incoming-webhook
      - channels:history
      - channels:read
      - groups:read
      - im:read
      - mpim:read

settings:
  event_subscriptions:
    request_url: https://gpt-cursor-runner.fly.dev/slack/events
    bot_events:
      - app_mention
      - message.channels
  interactivity:
    is_enabled: true
    request_url: https://gpt-cursor-runner.fly.dev/slack/interactions
  org_deploy_enabled: false
  socket_mode_enabled: true
  token_rotation_enabled: true
```

## Step 2: Update Scopes to Granular

### Classic Scopes → Granular Scopes Mapping
- `commands` → `commands` (unchanged)
- `chat:write` → `chat:write` (unchanged)
- `users:read` → `users:read` (unchanged)
- `app_mentions:read` → `app_mentions:read` (unchanged)

### New Granular Scopes to Add
- `incoming-webhook` - For webhook notifications
- `channels:history` - For reading channel messages
- `channels:read` - For accessing channel information
- `groups:read` - For private channel access
- `im:read` - For direct message access
- `mpim:read` - For multi-person direct messages

## Step 3: Enable Socket Mode v2

### Update Environment Variables
```bash
# Add Socket Mode token
SLACK_APP_TOKEN=xapp-your-socket-mode-token

# Update existing tokens
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
```

### Install Socket Mode Dependencies
```bash
npm install @slack/socket-mode
```

## Step 4: Update Code for Socket Mode v2

### Create Socket Mode Handler
```javascript
// server/socketModeHandler.js
const { SocketModeClient } = require('@slack/socket-mode');
const { WebClient } = require('@slack/web-api');

class SocketModeHandler {
  constructor() {
    this.socketMode = new SocketModeClient({
      appToken: process.env.SLACK_APP_TOKEN,
    });
    
    this.webClient = new WebClient(process.env.SLACK_BOT_TOKEN);
  }

  async start() {
    await this.socketMode.start();
    console.log('✅ Socket Mode connected');
  }

  async stop() {
    await this.socketMode.disconnect();
    console.log('🔌 Socket Mode disconnected');
  }
}

module.exports = SocketModeHandler;
```

## Step 5: Migration Process

### 1. Create New App (Recommended)
```bash
# Go to https://api.slack.com/apps
# Click "Create New App"
# Choose "From an app manifest"
# Upload the new manifest file
```

### 2. Update Existing App (Alternative)
```bash
# Go to your existing app settings
# Navigate to "App Manifest"
# Replace with new manifest content
# Save changes
```

### 3. Update Scopes
- Go to "OAuth & Permissions"
- Click "Update to Granular Scopes"
- Follow the UI-driven migration process
- Reinstall the app to your workspace

### 4. Generate Socket Mode Token
- Go to "Socket Mode"
- Enable Socket Mode
- Generate app-level token
- Copy the token (starts with `xapp-`)

## Step 6: Update Environment Configuration

### Update .env file
```bash
# Classic Platform (old)
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_VERIFICATION_TOKEN=...

# Granite Platform (new)
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
```

### Update Fly.io secrets
```bash
fly secrets set SLACK_APP_TOKEN="xapp-your-socket-mode-token"
fly secrets set SLACK_BOT_TOKEN="xoxb-your-bot-token"
fly secrets set SLACK_SIGNING_SECRET="your-signing-secret"
```

## Step 7: Test Migration

### Test Commands
```bash
# Test Socket Mode connection
slack auth list

# Test app deployment
slack apps manifest update --app-id YOUR_APP_ID --manifest-file slack-app-manifest-v2.yaml

# Test slash commands
/status
/dashboard
/whoami
```

## Troubleshooting

### Common Issues
1. **"App not found"**: Ensure app is created with new manifest
2. **"Invalid token"**: Regenerate tokens after scope update
3. **"Socket Mode failed"**: Check app token starts with `xapp-`
4. **"Commands not working"**: Reinstall app after scope changes

### Rollback Plan
If migration fails:
1. Keep old app running
2. Create new app with classic manifest
3. Test thoroughly before switching
4. Update webhook URLs gradually

## Benefits of Migration

### Granite Platform Advantages
- ✅ Socket Mode v2 (real-time, no webhook URLs)
- ✅ Granular scopes (better security)
- ✅ App Manifests (version control)
- ✅ Token rotation (automatic)
- ✅ Better error handling
- ✅ Slack CLI support

### Performance Improvements
- Reduced latency with Socket Mode
- Better reliability
- Automatic reconnection
- Built-in rate limiting

## Next Steps

1. **Create new manifest file** (`slack-app-manifest-v2.yaml`)
2. **Update code for Socket Mode v2**
3. **Test in development workspace**
4. **Deploy to production**
5. **Monitor and verify functionality**

## Support Resources

- [Slack API Documentation](https://api.slack.com/)
- [Socket Mode v2 Migration Guide](https://github.com/slackapi/node-slack-sdk/blob/main/packages/socket-mode/README.md)
- [Granular Scopes Documentation](https://api.slack.com/authentication/oauth-v2)
- [App Manifest Reference](https://api.slack.com/reference/manifests) 