#!/usr/bin/env node

const axios = require("axios");
require("dotenv").config({ path: "./config/webhook-thoughtmarks-v2.env" });

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN;
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;

async function testNewSlackApp() {
  console.log("🧪 Testing New Slack App");
  console.log("========================");
  console.log("");

  if (!SLACK_BOT_TOKEN || !SLACK_APP_TOKEN || !SLACK_CLIENT_ID) {
    console.log("❌ Missing required environment variables");
    console.log("   Please run: node scripts/update-env-with-new-app.js");
    return;
  }

  console.log("📋 Configuration:");
  console.log(`   Bot Token: ${SLACK_BOT_TOKEN ? "✅ Set" : "❌ Missing"}`);
  console.log(`   App Token: ${SLACK_APP_TOKEN ? "✅ Set" : "❌ Missing"}`);
  console.log(`   Client ID: ${SLACK_CLIENT_ID ? "✅ Set" : "❌ Missing"}`);
  console.log("");

  try {
    // Test 1: Validate bot token
    console.log("🔑 Test 1: Validating Bot Token...");
    const authResponse = await axios.post(
      "https://slack.com/api/auth.test",
      null,
      {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (authResponse.data.ok) {
      console.log("   ✅ Bot token is valid");
      console.log(`   📱 Connected to: ${authResponse.data.team}`);
      console.log(`   👤 Bot user: ${authResponse.data.user}`);
    } else {
      console.log(
        `   ❌ Bot token validation failed: ${authResponse.data.error}`,
      );
    }

    // Test 2: Test message sending
    console.log("\n💬 Test 2: Testing Message Sending...");
    const messageResponse = await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: "#cursor-thoughtmarks-native-build",
        text: "🧪 Test message from new webhook-thoughtmarks app!",
        unfurl_links: false,
      },
      {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (messageResponse.data.ok) {
      console.log("   ✅ Message sent successfully");
      console.log(`   📨 Message ID: ${messageResponse.data.ts}`);
    } else {
      console.log(
        `   ❌ Message sending failed: ${messageResponse.data.error}`,
      );
    }

    // Test 3: Test app token
    console.log("\n🎫 Test 3: Testing App Token...");
    const appResponse = await axios.post(
      "https://slack.com/api/apps.connections.open",
      null,
      {
        headers: {
          Authorization: `Bearer ${SLACK_APP_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (appResponse.data.ok) {
      console.log("   ✅ App token is valid");
    } else {
      console.log(
        `   ❌ App token validation failed: ${appResponse.data.error}`,
      );
    }

    // Test 4: Generate OAuth URL
    console.log("\n🔗 Test 4: Generating OAuth URL...");
    const scopes = [
      "commands",
      "chat:write",
      "incoming-webhook",
      "assistant:write",
    ].join(",");
    const oauthUrl = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent("https://webhook-thoughtmarks.thoughtmarks.app/slack/oauth/callback")}&state=test-new-app-${Date.now()}`;

    console.log("   ✅ OAuth URL generated");
    console.log("   🔗 URL:", oauthUrl);

    // Summary
    console.log("\n📊 Test Results Summary:");
    console.log("========================");
    console.log(`   Bot Token Valid: ${authResponse.data.ok ? "✅" : "❌"}`);
    console.log(`   Message Sending: ${messageResponse.data.ok ? "✅" : "❌"}`);
    console.log(`   App Token Valid: ${appResponse.data.ok ? "✅" : "❌"}`);
    console.log("   OAuth URL: ✅ Generated");
    console.log("");

    if (
      authResponse.data.ok &&
      messageResponse.data.ok &&
      appResponse.data.ok
    ) {
      console.log("🎉 NEW SLACK APP IS WORKING PERFECTLY!");
      console.log("=====================================");
      console.log("✅ All tests passed");
      console.log("✅ App is ready for use");
      console.log("✅ You can now use the OAuth URL to install the app");
      console.log("");
      console.log("🚀 Ready to proceed with installation!");
    } else {
      console.log("⚠️  Some tests failed");
      console.log("   Please check the configuration and try again");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("   Response:", error.response.data);
    }
  }
}

// Run the script
if (require.main === module) {
  testNewSlackApp()
    .then(() => {
      console.log("\n✅ Test script completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Test script failed:", error.message);
      process.exit(1);
    });
}

module.exports = { testNewSlackApp };
