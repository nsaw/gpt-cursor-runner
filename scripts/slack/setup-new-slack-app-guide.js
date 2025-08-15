#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🚀 Slack App Setup Guide");
console.log("========================");
console.log("");

console.log("📋 STEP 1: Create New Slack App");
console.log("===============================");
console.log("1. Go to: https://api.slack.com/apps");
console.log('2. Click "Create New App"');
console.log('3. Choose "From scratch"');
console.log("4. Enter App Name: gpt-cursor-webhook-thoughtmarks-v2");
console.log("5. Select your workspace");
console.log('6. Click "Create App"');
console.log("");

console.log("📋 STEP 2: Configure Basic Information");
console.log("=====================================");
console.log('1. In the left sidebar, click "Basic Information"');
console.log("2. Note down the following:");
console.log("   - App ID (starts with A...)");
console.log("   - Client ID (starts with 9...)");
console.log('   - Client Secret (click "Show" to reveal)');
console.log('   - Signing Secret (click "Show" to reveal)');
console.log('3. Under "App-Level Tokens", click "Generate Token and Scopes"');
console.log("4. Name: webhook-thoughtmarks-token");
console.log("5. Add scopes: connections:write, authorizations:read");
console.log('6. Click "Generate" and note the token (starts with xapp-...)');
console.log("");

console.log("📋 STEP 3: Configure OAuth & Permissions");
console.log("========================================");
console.log('1. In the left sidebar, click "OAuth & Permissions"');
console.log('2. Under "Redirect URLs", add:');
console.log(
  "   https://webhook-thoughtmarks.thoughtmarks.app/slack/oauth/callback",
);
console.log('3. Under "Bot Token Scopes", add:');
console.log("   - commands");
console.log("   - chat:write");
console.log("   - incoming-webhook");
console.log("   - assistant:write");
console.log('4. Click "Save Changes"');
console.log("");

console.log("📋 STEP 4: Configure Slash Commands");
console.log("===================================");
console.log('1. In the left sidebar, click "Slash Commands"');
console.log('2. Click "Create New Command"');
console.log("3. Add these commands one by one:");
console.log("");

const commands = [
  {
    command: "/dashboard",
    url: "https://webhook-thoughtmarks.thoughtmarks.app/commands",
    description: "View Dashboard",
    usage: "View dashboard",
  },
  {
    command: "/status-runner",
    url: "https://webhook-thoughtmarks.thoughtmarks.app/slack/commands",
    description: "Check current runner status and health",
    usage: "Check status",
  },
  {
    command: "/patch-pass",
    url: "https://webhook-thoughtmarks.thoughtmarks.app/slack/commands",
    description: "Pass next pending patches",
    usage: "Pass patches",
  },
  {
    command: "/patch-revert",
    url: "https://webhook-thoughtmarks.thoughtmarks.app/slack/commands",
    description: "Revert the last applied patch",
    usage: "Revert patch",
  },
  {
    command: "/restart-runner",
    url: "https://webhook-thoughtmarks.thoughtmarks.app/slack/commands",
    description: "Restart the GPT-Cursor Runner service",
    usage: "Restart service",
  },
];

commands.forEach((cmd, index) => {
  console.log(`   ${index + 1}. Command: ${cmd.command}`);
  console.log(`      Request URL: ${cmd.url}`);
  console.log(`      Short Description: ${cmd.description}`);
  console.log(`      Usage Hint: ${cmd.usage}`);
  console.log("");
});

console.log("📋 STEP 5: Configure Event Subscriptions");
console.log("========================================");
console.log('1. In the left sidebar, click "Event Subscriptions"');
console.log('2. Toggle "Enable Events" to On');
console.log(
  "3. Request URL: https://webhook-thoughtmarks.thoughtmarks.app/slack/events",
);
console.log('4. Under "Subscribe to bot events", add:');
console.log("   - app_mention");
console.log("   - message.channels");
console.log('5. Click "Save Changes"');
console.log("");

console.log("📋 STEP 6: Configure Interactivity & Shortcuts");
console.log("==============================================");
console.log('1. In the left sidebar, click "Interactivity & Shortcuts"');
console.log('2. Toggle "Interactivity" to On');
console.log(
  "3. Request URL: https://webhook-thoughtmarks.thoughtmarks.app/slack/events",
);
console.log('4. Click "Save Changes"');
console.log("");

console.log("📋 STEP 7: Install App to Workspace");
console.log("===================================");
console.log('1. In the left sidebar, click "Install App"');
console.log('2. Click "Install to Workspace"');
console.log('3. Review permissions and click "Allow"');
console.log("4. Note down the Bot User OAuth Token (starts with xoxb-...)");
console.log("");

console.log("📋 STEP 8: Update Environment File");
console.log("==================================");
console.log("Once you have all the credentials, run:");
console.log("node scripts/update-env-with-new-app.js");
console.log("");

console.log("📋 STEP 9: Test the Installation");
console.log("================================");
console.log("After updating the environment file, run:");
console.log("node scripts/test-new-slack-app.js");
console.log("");

console.log("🎯 CREDENTIALS TO COLLECT:");
console.log("=========================");
console.log("• App ID (A...)");
console.log("• Client ID (9...)");
console.log("• Client Secret");
console.log("• Signing Secret");
console.log("• App-Level Token (xapp-...)");
console.log("• Bot User OAuth Token (xoxb-...)");
console.log("");

console.log("📝 NOTES:");
console.log("=========");
console.log("• Keep all credentials secure");
console.log("• The app will be ready for installation once configured");
console.log("• All endpoints should point to your tunnel URL");
console.log("• Test each component after setup");
console.log("");

console.log("✅ Ready to proceed with manual setup!");
