#!/usr/bin/env node

const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Slack API configuration
const SLACK_API_BASE = "https://slack.com/api";

// App configuration
const APP_CONFIG = {
  name: "gpt-cursor-webhook-thoughtmarks-v2",
  description: "cursor's boss - v2",
  background_color: "#000000",
  long_description:
    "Robots using robots to control robots. This Slack app serves as a command interface for a GPT-powered hybrid automation pipeline.",
  redirect_urls: [
    "https://webhook-thoughtmarks.thoughtmarks.app/slack/oauth/callback",
  ],
  scopes: {
    bot: ["commands", "chat:write", "incoming-webhook", "assistant:write"],
  },
  slash_commands: [
    {
      command: "/dashboard",
      url: "https://webhook-thoughtmarks.thoughtmarks.app/commands",
      description: "View Dashboard",
      should_escape: false,
    },
    {
      command: "/status-runner",
      url: "https://webhook-thoughtmarks.thoughtmarks.app/slack/commands",
      description: "Check current runner status and health",
      should_escape: false,
    },
    {
      command: "/patch-pass",
      url: "https://webhook-thoughtmarks.thoughtmarks.app/slack/commands",
      description: "Pass next pending patches",
      should_escape: false,
    },
    {
      command: "/patch-revert",
      url: "https://webhook-thoughtmarks.thoughtmarks.app/slack/commands",
      description: "Revert the last applied patch",
      should_escape: false,
    },
    {
      command: "/restart-runner",
      url: "https://webhook-thoughtmarks.thoughtmarks.app/slack/commands",
      description: "Restart the GPT-Cursor Runner service",
      should_escape: false,
    },
  ],
};

async function createSlackApp() {
  console.log("🚀 Creating New Slack App via API");
  console.log("===================================");

  try {
    // Step 1: Create the app
    console.log("📝 Step 1: Creating app...");
    const createResponse = await axios.post(
      `${SLACK_API_BASE}/apps.create`,
      {
        name: APP_CONFIG.name,
        description: APP_CONFIG.description,
        background_color: APP_CONFIG.background_color,
        long_description: APP_CONFIG.long_description,
      },
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );

    if (!createResponse.data.ok) {
      throw new Error(`Failed to create app: ${createResponse.data.error}`);
    }

    const appId = createResponse.data.app.id;
    const clientId = createResponse.data.app.client_id;
    const clientSecret = createResponse.data.app.client_secret;
    const appToken = createResponse.data.app.app_token;

    console.log("✅ App created successfully!");
    console.log(`   App ID: ${appId}`);
    console.log(`   Client ID: ${clientId}`);
    console.log(`   Client Secret: ${clientSecret ? "✅ Set" : "❌ Missing"}`);
    console.log(`   App Token: ${appToken ? "✅ Set" : "❌ Missing"}`);

    // Step 2: Configure OAuth settings
    console.log("\n🔐 Step 2: Configuring OAuth settings...");
    const oauthResponse = await axios.post(
      `${SLACK_API_BASE}/apps.oauth.config.update`,
      {
        app_id: appId,
        redirect_urls: APP_CONFIG.redirect_urls,
        scopes: APP_CONFIG.scopes,
      },
    );

    if (!oauthResponse.data.ok) {
      console.log("⚠️  OAuth config update failed, but continuing...");
    } else {
      console.log("✅ OAuth settings configured");
    }

    // Step 3: Add slash commands
    console.log("\n⚡ Step 3: Adding slash commands...");
    for (const cmd of APP_CONFIG.slash_commands) {
      try {
        const cmdResponse = await axios.post(
          `${SLACK_API_BASE}/apps.commands.create`,
          {
            app_id: appId,
            command: cmd.command,
            url: cmd.url,
            description: cmd.description,
            should_escape: cmd.should_escape,
          },
        );

        if (cmdResponse.data.ok) {
          console.log(`   ✅ Added ${cmd.command}`);
        } else {
          console.log(
            `   ⚠️  Failed to add ${cmd.command}: ${cmdResponse.data.error}`,
          );
        }
      } catch (error) {
        console.log(`   ⚠️  Error adding ${cmd.command}: ${error.message}`);
      }
    }

    // Step 4: Save credentials to file
    console.log("\n💾 Step 4: Saving credentials...");
    const envContent = `# New Slack App Credentials
SLACK_CLIENT_ID=${clientId}
SLACK_CLIENT_SECRET=${clientSecret}
SLACK_APP_TOKEN=${appToken}
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
SLACK_INCOMING_WEBHOOK=

# App Information
SLACK_APP_ID=${appId}
SLACK_APP_NAME=${APP_CONFIG.name}

# Server Configuration
PORT=5432
TUNNEL_URL=https://webhook-thoughtmarks.thoughtmarks.app
`;

    const envPath = path.join(
      __dirname,
      "..",
      "config",
      "webhook-thoughtmarks-v2.env",
    );
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Credentials saved to ${envPath}`);

    // Step 5: Generate OAuth URL
    console.log("\n🔗 Step 5: Generating OAuth URL...");
    const scopes = APP_CONFIG.scopes.bot.join(",");
    const oauthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(APP_CONFIG.redirect_urls[0])}&state=new-app-install-${Date.now()}`;

    console.log("\n🎉 NEW SLACK APP CREATED SUCCESSFULLY!");
    console.log("========================================");
    console.log(`📱 App Name: ${APP_CONFIG.name}`);
    console.log(`🆔 App ID: ${appId}`);
    console.log(`🔑 Client ID: ${clientId}`);
    console.log(`🔐 Client Secret: ${clientSecret ? "✅ Set" : "❌ Missing"}`);
    console.log(`🎫 App Token: ${appToken ? "✅ Set" : "❌ Missing"}`);
    console.log(`📁 Credentials saved to: ${envPath}`);

    console.log("\n🚀 INSTALLATION URL:");
    console.log("====================");
    console.log(oauthUrl);

    console.log("\n📋 NEXT STEPS:");
    console.log("==============");
    console.log("1. Copy the OAuth URL above");
    console.log("2. Open it in a new browser tab");
    console.log('3. Click "Allow" to install the app');
    console.log("4. The app will redirect to our callback");
    console.log("5. Check for success message");
    console.log("6. Update your environment file with the new bot token");

    return {
      appId,
      clientId,
      clientSecret,
      appToken,
      oauthUrl,
      envPath,
    };
  } catch (error) {
    console.error("❌ Failed to create Slack app:", error.message);
    if (error.response) {
      console.error("   Response:", error.response.data);
    }
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createSlackApp()
    .then(() => {
      console.log("\n✅ Script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Script failed:", error.message);
      process.exit(1);
    });
}

module.exports = { createSlackApp };
