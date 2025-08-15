# 📋 Slack API Dashboard Setup Guide

## 🚀 How to Set Up All 25+ Slash Commands in Slack API Dashboard

### Step 1: Access Your Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your GPT-Cursor Runner app
3. Navigate to **"Slash Commands"** in the left sidebar

### Step 2: Add Each Command

For each command below, click **"Create New Command"** and fill in:

#### Command 1: `/dashboard`

- **Command**: `/dashboard`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `View GPT-Cursor Runner dashboard and stats`
- **Usage Hint**: `View dashboard`

#### Command 2: `/patch-approve`

- **Command**: `/patch-approve`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Approve the next pending GPT patch`
- **Usage Hint**: `Approve patch`

#### Command 3: `/patch-revert`

- **Command**: `/patch-revert`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Revert the last applied patch`
- **Usage Hint**: `Revert patch`

#### Command 4: `/pause-runner`

- **Command**: `/pause-runner`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Pause the GPT-Cursor Runner`
- **Usage Hint**: `Pause runner`

#### Command 5: `/restart-runner`

- **Command**: `/restart-runner`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Restart the GPT-Cursor Runner service`
- **Usage Hint**: `Restart service`

#### Command 6: `/restart-runner-gpt`

- **Command**: `/restart-runner-gpt`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Restart GPT integration specifically`
- **Usage Hint**: `Restart GPT`

#### Command 7: `/continue-runner`

- **Command**: `/continue-runner`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Resume the paused runner`
- **Usage Hint**: `Continue runner`

#### Command 8: `/status`

- **Command**: `/status`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Check current runner status and health`
- **Usage Hint**: `Check status`

#### Command 9: `/show-roadmap`

- **Command**: `/show-roadmap`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Display development roadmap`
- **Usage Hint**: `Show roadmap`

#### Command 10: `/roadmap`

- **Command**: `/roadmap`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Show project roadmap and milestones`
- **Usage Hint**: `View roadmap`

#### Command 11: `/kill-runner`

- **Command**: `/kill-runner`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Force stop the runner (emergency)`
- **Usage Hint**: `Kill runner`

#### Command 12: `/toggle-runner-on`

- **Command**: `/toggle-runner-on`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Enable the runner`
- **Usage Hint**: `Enable runner`

#### Command 13: `/toggle-runner-off`

- **Command**: `/toggle-runner-off`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Disable the runner`
- **Usage Hint**: `Disable runner`

#### Command 14: `/toggle-runner-auto`

- **Command**: `/toggle-runner-auto`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Toggle automatic patch processing`
- **Usage Hint**: `Toggle auto mode`

#### Command 15: `/theme`

- **Command**: `/theme`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Manage Cursor theme settings`
- **Usage Hint**: `Manage theme`

#### Command 16: `/theme-status`

- **Command**: `/theme-status`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Check current theme status`
- **Usage Hint**: `Theme status`

#### Command 17: `/theme-fix`

- **Command**: `/theme-fix`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Fix theme-related issues`
- **Usage Hint**: `Fix theme`

#### Command 18: `/patch-preview`

- **Command**: `/patch-preview`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Preview pending patches`
- **Usage Hint**: `Preview patch`

#### Command 19: `/approve-screenshot`

- **Command**: `/approve-screenshot`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Approve screenshot-based patches`
- **Usage Hint**: `Approve screenshot`

#### Command 20: `/revert-phase`

- **Command**: `/revert-phase`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Revert to previous phase`
- **Usage Hint**: `Revert phase`

#### Command 21: `/log-phase-status`

- **Command**: `/log-phase-status`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Log current phase status`
- **Usage Hint**: `Log status`

#### Command 22: `/cursor-mode`

- **Command**: `/cursor-mode`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Switch Cursor operation modes`
- **Usage Hint**: `Switch mode`

#### Command 23: `/whoami`

- **Command**: `/whoami`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Show current user and permissions`
- **Usage Hint**: `Show user info`

#### Command 24: `/retry-last-failed`

- **Command**: `/retry-last-failed`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Retry the last failed operation`
- **Usage Hint**: `Retry failed`

#### Command 25: `/lock-runner`

- **Command**: `/lock-runner`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Lock runner (prevent changes)`
- **Usage Hint**: `Lock runner`

#### Command 26: `/unlock-runner`

- **Command**: `/unlock-runner`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Unlock runner (allow changes)`
- **Usage Hint**: `Unlock runner`

#### Command 27: `/alert-runner-crash`

- **Command**: `/alert-runner-crash`
- **Request URL**: `https://gpt-cursor-runner.fly.dev/slack/commands`
- **Short Description**: `Send crash alert notification`
- **Usage Hint**: `Alert crash`

### Step 3: Install App to Workspace

1. Go to **"Install App"** in the left sidebar
2. Click **"Install to Workspace"**
3. Authorize the app with required permissions

### Step 4: Test Commands

After installation, test a few commands:

- `/status` - Should show runner status
- `/dashboard` - Should show dashboard info
- `/whoami` - Should show user info

### ⚡ Quick Setup Script

If you want to automate this process, you can use the provided scripts:

```bash
# Automated registration via API
./register-all-slack-commands.sh

# Or manual setup using this guide
```

### 📋 Checklist

- [ ] All 27 commands added to Slack API dashboard
- [ ] Request URL set to: `https://gpt-cursor-runner.fly.dev/slack/commands`
- [ ] App installed to workspace
- [ ] Commands tested in Slack
- [ ] Permissions verified

### 🔧 Troubleshooting

- **Commands not appearing**: Make sure app is installed to workspace
- **404 errors**: Verify the webhook URL is correct
- **Permission errors**: Check app permissions in Slack settings
