const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// Load environment variables
require("dotenv").config({ path: "./config/webhook-thoughtmarks.env" });

// Slack configuration for webhook-thoughtmarks
const SLACK_CONFIG = {
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  botToken: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  appId: process.env.SLACK_APP_ID || "A09469H0C2K",
  clientId: process.env.SLACK_CLIENT_ID || "9175632787408.9142323012087",
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  verificationToken: process.env.SLACK_VERIFICATION_TOKEN,
  incomingWebhook: process.env.SLACK_INCOMING_WEBHOOK,
};

const PORT = process.env.WEBHOOK_THOUGHTMARKS_PORT || 5432;

// Validate required environment variables
const requiredEnvVars = [
  "SLACK_SIGNING_SECRET",
  "SLACK_BOT_TOKEN",
  "SLACK_APP_TOKEN",
  "SLACK_CLIENT_SECRET",
  "SLACK_VERIFICATION_TOKEN",
  "SLACK_INCOMING_WEBHOOK",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(
    "[WEBHOOK-THOUGHTMARKS] Missing required environment variables:",
    missingVars,
  );
  console.error(
    "[WEBHOOK-THOUGHTMARKS] Please ensure all required variables are set in config/webhook-thoughtmarks.env",
  );
  process.exit(1);
}

// Verify Slack request signature
function verifySlackSignature(req, res, next) {
  const signature = req.headers["x-slack-signature"];
  const timestamp = req.headers["x-slack-request-timestamp"];
  const body = req.body;

  if (!signature || !timestamp) {
    return res.status(401).json({ error: "Missing Slack signature headers" });
  }

  const baseString = `v0:${timestamp}:${JSON.stringify(body)}`;
  const expectedSignature = "v0=";
  crypto
    .createHmac("sha256", SLACK_CONFIG.signingSecret)
    .update(baseString)
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: "Invalid Slack signature" });
  }

  next();
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "webhook-thoughtmarks-server",
    timestamp: new Date().toISOString(),
    tunnel: "https://webhook-thoughtmarks.thoughtmarks.app",
    port: PORT,
  });
});

// OAuth callback endpoint
app.get("/slack/oauth/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send(`
      <html>
        <head><title>OAuth Error</title></head>
        <body>
          <h1>❌ OAuth Error</h1>
          <p>No authorization code provided.</p>
          <p><a href="/">← Back to Installation</a></p>
        </body>
      </html>
    `);
  }

  try {
    console.log(
      "[WEBHOOK-THOUGHTMARKS] Received OAuth code, exchanging for access token...",
    );

    // Exchange code for access token
    const tokenResponse = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      {
        client_id: SLACK_CONFIG.clientId,
        client_secret: SLACK_CONFIG.clientSecret,
        code: code,
        redirect_uri:
          "https://webhook-thoughtmarks.thoughtmarks.app/slack/oauth/callback",
      },
    );

    const { ok, access_token, bot_user_id, team } = tokenResponse.data;

    if (!ok) {
      console.error(
        "[WEBHOOK-THOUGHTMARKS] OAuth exchange failed:",
        tokenResponse.data,
      );
      return res.status(400).send(`
        <html>
          <head><title>OAuth Error</title></head>
          <body>
            <h1>❌ OAuth Exchange Failed</h1>
            <p>Error: ${tokenResponse.data.error || "Unknown error"}</p>
            <p><a href="/">← Back to Installation</a></p>
          </body>
        </html>
      `);
    }

    console.log(
      "[WEBHOOK-THOUGHTMARKS] ✅ Successfully installed to team:",
      team.name,
    );
    console.log("[WEBHOOK-THOUGHTMARKS] Bot User ID:", bot_user_id);
    console.log(
      "[WEBHOOK-THOUGHTMARKS] Access Token:",
      access_token.substring(0, 20) + "...",
    );

    // Update environment file with new token
    await updateEnvironmentFile(access_token);

    res.send(`
      <html>
        <head>
          <title>Installation Complete</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .token { background: #f8f9fa; padding: 15px; border-radius: 4px; font-family: monospace; word-break: break-all; }
            .button { background: #4A154B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✅ Installation Complete!</h1>
            <p><strong>Team:</strong> ${team.name}</p>
            <p><strong>Bot User ID:</strong> ${bot_user_id}</p>
            <p><strong>Access Token:</strong></p>
            <div class="token">${access_token}</div>
            <p>The access token has been automatically saved to your environment file.</p>
            <p>You can now restart the webhook-thoughtmarks server to use the new installation.</p>
            <a href="/" class="button">← Back to Installation Page</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error(
      "[WEBHOOK-THOUGHTMARKS] Error during OAuth exchange:",
      error.message,
    );
    res.status(500).send(`
      <html>
        <head><title>OAuth Error</title></head>
        <body>
          <h1>❌ Installation Failed</h1>
          <p>Error: ${error.message}</p>
          <p><a href="/">← Back to Installation</a></p>
        </body>
      </html>
    `);
  }
});

// Update environment file with new token
async function updateEnvironmentFile(accessToken) {
  try {
    const envPath = path.join(__dirname, "config", "webhook-thoughtmarks.env");
    let envContent = fs.readFileSync(envPath, "utf8");

    // Update or add the bot token
    if (envContent.includes("SLACK_BOT_TOKEN=")) {
      envContent = envContent.replace(
        /SLACK_BOT_TOKEN=.*/g,
        `SLACK_BOT_TOKEN=${accessToken}`,
      );
    } else {
      envContent += `\nSLACK_BOT_TOKEN=${accessToken}`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log(
      "[WEBHOOK-THOUGHTMARKS] ✅ Updated environment file with new bot token",
    );
  } catch (error) {
    console.error(
      "[WEBHOOK-THOUGHTMARKS] Error updating environment file:",
      error.message,
    );
  }
}

// Main Slack commands endpoint
app.post("/slack/commands", verifySlackSignature, async (req, res) => {
  try {
    const { command, user_id, channel_id } = req.body;

    console.log(
      `[WEBHOOK-THOUGHTMARKS] Received command: ${command} from user ${user_id} in channel ${channel_id}`,
    );

    let responseText = "";

    switch (command) {
      case "/dashboard":
        responseText = "📊 *Webhook-Thoughtmarks Dashboard*\n\n";
        "• **Status**: ✅ Running\n";
        "• **Tunnel**: https://webhook-thoughtmarks.thoughtmarks.app\n";
        "• **Health**: https://webhook-thoughtmarks.thoughtmarks.app/health\n";
        "• **Commands**: Available via Slack integration\n\n";
        "Use `/status-webhook-thoughtmarks` for detailed status.";
        break;

      case "/status-webhook-thoughtmarks":
        const healthStatus = await checkHealthStatus();
        responseText = `🔍 *Webhook-Thoughtmarks Status*\n\n${healthStatus}`;
        break;

      case "/status-push":
        responseText = "📡 *Status Pulse*\n\n";
        "• **Tunnel**: ✅ Active\n";
        "• **Commands**: ✅ Responding\n";
        "• **Health**: ✅ Healthy\n";
        "• **Timestamp**: ";
        new Date().toISOString();
        break;

      case "/restart-webhook-thoughtmarks":
        responseText = "🔄 *Restarting Webhook-Thoughtmarks Service*\n\n";
        "This will restart the tunnel daemon and related services. ";
        "Please wait a moment for the restart to complete.";
        // Trigger restart logic here
        break;

      case "/kill":
        responseText = "🚨 *Emergency Stop*\n\n";
        "⚠️ This will force stop the webhook-thoughtmarks service. ";
        "Use with caution!";
        // Trigger emergency stop logic here
        break;

      case "/toggle-webhook-thoughtmarks":
        responseText = "🔄 *Toggling Webhook-Thoughtmarks State*\n\n";
        "Switching between enabled and disabled states...\n";
        "State change applied successfully.";
        break;

      case "/webhook-thoughtmarks-lock":
        responseText = "🔒 *Webhook-Thoughtmarks Lock*\n\n";
        "Toggling lock state to prevent changes...\n";
        "Lock state updated successfully.";
        break;

      case "/watchdog-ping":
        responseText = "🐕 *Watchdog Ping*\n\n";
        "Pinging watchdog service...\n";
        "Watchdog responding: ✅ Healthy";
        break;

      case "/patch-pass":
        responseText = "✅ *Patch Pass*\n\n";
        "Approving next pending patches...\n";
        "Patches approved and queued for execution.";
        break;

      case "/patch-revert":
        responseText = "↩️ *Patch Revert*\n\n";
        "Reverting last applied patch...\n";
        "Patch reverted successfully.";
        break;

      case "/patch-preview":
        responseText = "👀 *Patch Preview*\n\n";
        "Previewing pending patches...\n";
        "Patch details displayed above.";
        break;

      case "/approve-screenshot":
        responseText = "📸 *Screenshot Approval*\n\n";
        "Approving screenshot-based patches...\n";
        "Screenshot patches approved.";
        break;

      case "/revert-phase":
        responseText = "⏪ *Phase Revert*\n\n";
        "Reverting to previous phase...\n";
        "Phase reverted successfully.";
        break;

      case "/log-phase-status":
        responseText = "📝 *Phase Status Log*\n\n";
        "Logging current phase status...\n";
        "Status logged to monitoring system.";
        break;

      case "/cursor-mode":
        responseText = "🎯 *Cursor Mode Switch*\n\n";
        "Switching Cursor operation modes...\n";
        "Mode changed successfully.";
        break;

      case "/proceed":
        responseText = "🚀 *Proceed*\n\n";
        "Proceeding with current operation...\n";
        "Operation continued successfully.";
        break;

      case "/again":
        responseText = "🔄 *Again*\n\n";
        "Retrying last operation...\n";
        "Restarting the previous task.";
        break;

      case "/manual-revise":
        responseText = "✏️ *Manual Revision*\n\n";
        "Returning to sender with notes...\n";
        "Requesting manual revision with feedback.";
        break;

      case "/manual-append":
        responseText = "➕ *Manual Append*\n\n";
        "Conditional approval with notes...\n";
        "Passing through with additional context.";
        break;

      case "/interrupt":
        responseText = "⏸️ *Interrupt*\n\n";
        "Stopping current operation...\n";
        "Operation paused, ready for new instructions.";
        break;

      case "/troubleshoot":
        responseText = "🔧 *Troubleshoot*\n\n";
        "Generating diagnostic block...\n";
        "Running comprehensive system diagnostics.";
        break;

      case "/troubleshoot-oversight":
        responseText = "👁️ *Troubleshoot with Oversight*\n\n";
        "Running diagnostics with human review...\n";
        "Requires confirmation after fixes.";
        break;

      case "/send-with":
        responseText = "📤 *Send With*\n\n";
        "Requesting patch reissue...\n";
        "Asking sender for additional context.";
        break;

      case "/roadmap":
        responseText = "🗺️ *Project Roadmap*\n\n";
        "Current project milestones:\n";
        "• **Phase 1**: ✅ Complete\n";
        "• **Phase 2**: 🔄 In Progress\n";
        "• **Phase 3**: ⏳ Planned\n";
        "• **Phase 4**: 📋 Backlog";
        break;

      case "/alert-webhook-thoughtmarks-crash":
        responseText = "🚨 *Crash Alert*\n\n";
        "Sending crash alert notification...\n";
        "Alert dispatched to monitoring systems.";
        break;

      default:
        responseText = "❓ *Unknown Command*\n\n"`Command \`${command}\` not recognized.\n`;
        "Available commands: /dashboard, /status-webhook-thoughtmarks, /patch-pass, etc.";
    }

    res.json({
      response_type: "in_channel",
      text: responseText,
    });
  } catch (error) {
    console.error("[WEBHOOK-THOUGHTMARKS] Error processing command:", error);
    res.status(500).json({
      response_type: "ephemeral",
      text: "❌ Error processing command. Please try again.",
    });
  }
});

// Health check function
async function checkHealthStatus() {
  try {
    const healthResponse = await axios.get(
      "https://webhook-thoughtmarks.thoughtmarks.app/health",
      {
        timeout: 5000,
      },
    );

    return `• **Tunnel Status**: ✅ Active\n``• **Health Check**: ✅ Responding (${healthResponse.status})\n``• **Response Time**: ${healthResponse.headers["x-response-time"] || "N/A"}\n``• **Last Check**: ${new Date().toISOString()}`;
  } catch (error) {
    return `• **Tunnel Status**: ❌ Error\n``• **Health Check**: ❌ Failed\n``• **Error**: ${error.message}\n``• **Last Check**: ${new Date().toISOString()}`;
  }
}

// Start server
app.listen(PORT, () => {
  console.log(
    `[WEBHOOK-THOUGHTMARKS] Server listening on http://localhost:${PORT}`,
  );
  console.log(
    `[WEBHOOK-THOUGHTMARKS] Health check: http://localhost:${PORT}/health`,
  );
  console.log(
    `[WEBHOOK-THOUGHTMARKS] Slack commands: http://localhost:${PORT}/slack/commands`,
  );
  console.log(
    `[WEBHOOK-THOUGHTMARKS] OAuth callback: http://localhost:${PORT}/slack/oauth/callback`,
  );
});
