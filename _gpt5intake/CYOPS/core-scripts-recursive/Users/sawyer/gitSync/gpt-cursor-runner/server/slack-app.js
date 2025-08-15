const { App } = require("@slack/bolt");
require("dotenv").config();

// Initialize the Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 5555,
});

// Import command handlers
const commandHandlers = require("./handlers");

// Register all slash commands
Object.keys(commandHandlers).forEach((command) => {
  app.command(command, commandHandlers[command]);
});

// Handle app mentions
app.event("app_mention", async ({ event, say }) => {
  await say(
    "Hello! I'm the GPT-Cursor Runner. Use /status-runner to check my current status.",
  );
});

// Handle messages
app.event("message", async ({ event, say }) => {
  // Only respond to messages in channels the bot is in
  if (event.channel_type === "channel" && !event.bot_id) {
    // You can add message handling logic here
    console.log("Received message:", event.text);
  }
});

// Error handling
app.error((error) => {
  console.error("Slack app error:", error);
});

// Start the app
(async () => {
  await app.start();
  console.log("🚀 Slack app is running!");
})();

module.exports = app;
