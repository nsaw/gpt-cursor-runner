const express = require("express");
const crypto = require("crypto");
const axios = require("axios");

const router = express.Router();

// Load environment variables
require("dotenv").config({ path: "./config/webhook-thoughtmarks.env" });

// Slack configuration for webhook-thoughtmarks
const SLACK_CONFIG = {
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  botToken: process.env.SLACK_BOT_TOKEN,
  appId: process.env.SLACK_APP_ID || "A09469H0C2K",
  clientId: process.env.SLACK_CLIENT_ID || "9175632787408.9142323012087",
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  verificationToken: process.env.SLACK_VERIFICATION_TOKEN,
};

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
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "webhook-thoughtmarks-slack-commands",
    timestamp: new Date().toISOString(),
    tunnel: "https://webhook-thoughtmarks.thoughtmarks.app",
  });
});

// Main Slack commands endpoint
router.post("/slack/commands", verifySlackSignature, async (req, res) => {
  try {
    const { command, text, user_id, channel_id, team_id } = req.body;

    console.log(
      `[WEBHOOK-THOUGHTMARKS] Received command: ${command} from user ${user_id} in channel ${channel_id}`,
    );

    const response = {
      response_type: "in_channel",
      text: "",
    };

    switch (command) {
      case "/dashboard":
        response.text = "📊 *Webhook-Thoughtmarks Dashboard*\n\n";
        "• **Status**: ✅ Running\n";
        "• **Tunnel**: https://webhook-thoughtmarks.thoughtmarks.app\n";
        "• **Health**: https://webhook-thoughtmarks.thoughtmarks.app/health\n";
        "• **Commands**: Available via Slack integration\n\n";
        "Use `/status-webhook-thoughtmarks` for detailed status.";
        break;

      case "/status-webhook-thoughtmarks":
        const healthStatus = await checkHealthStatus();
        response.text = `🔍 *Webhook-Thoughtmarks Status*\n\n${healthStatus}`;
        break;

      case "/status-push":
        response.text = "📡 *Status Pulse*\n\n";
        "• **Tunnel**: ✅ Active\n";
        "• **Commands**: ✅ Responding\n";
        "• **Health**: ✅ Healthy\n";
        "• **Timestamp**: ";
        new Date().toISOString();
        break;

      case "/restart-webhook-thoughtmarks":
        response.text = "🔄 *Restarting Webhook-Thoughtmarks Service*\n\n";
        "This will restart the tunnel daemon and related services. ";
        "Please wait a moment for the restart to complete.";
        // Trigger restart logic here
        break;

      case "/kill":
        response.text = "🚨 *Emergency Stop*\n\n";
        "⚠️ This will force stop the webhook-thoughtmarks service. ";
        "Use with caution!";
        // Trigger emergency stop logic here
        break;

      case "/toggle-webhook-thoughtmarks":
        response.text = "🔄 *Toggling Webhook-Thoughtmarks State*\n\n";
        "Switching between auto mode and manual mode. ";
        "Current state will be updated.";
        break;

      case "/webhook-thoughtmarks-lock":
        response.text = "🔒 *Webhook-Thoughtmarks Lock*\n\n";
        "Toggling lock state to prevent changes. ";
        "Lock status will be updated.";
        break;

      case "/watchdog-ping":
        response.text = "🐕 *Watchdog Ping*\n\n";
        "Pinging watchdog services...\n";
        "• **Tunnel Daemon**: ✅ Responding\n";
        "• **Health Check**: ✅ Active\n";
        "• **System**: ✅ Healthy";
        break;

      case "/patch-pass":
        response.text = "✅ *Patch Pass*\n\n";
        "Processing next pending patches...\n";
        "Use `/patch-preview` to see what will be applied.";
        break;

      case "/patch-revert":
        response.text = "↩️ *Patch Revert*\n\n";
        "Reverting the last applied patch...\n";
        "This will rollback the most recent changes.";
        break;

      case "/patch-preview":
        response.text = "👀 *Patch Preview*\n\n";
        "Showing pending patches:\n";
        "• No pending patches found\n";
        "• System is up to date";
        break;

      case "/approve-screenshot":
        response.text = "📸 *Screenshot Approval*\n\n";
        "Approving screenshot-based patches...\n";
        "Processing visual validation patches.";
        break;

      case "/revert-phase":
        response.text = "⏪ *Phase Revert*\n\n";
        "Reverting to previous phase...\n";
        "This will rollback to the last stable phase.";
        break;

      case "/log-phase-status":
        response.text = "📝 *Phase Status Log*\n\n";
        "Current phase status:\n";
        "• **Phase**: Active\n";
        "• **Status**: Running\n";
        "• **Timestamp**: ";
        new Date().toISOString();
        break;

      case "/cursor-mode":
        response.text = "🎛️ *Cursor Mode Switch*\n\n";
        "Switching Cursor operation modes...\n";
        "Available modes: auto, manual, debug";
        break;

      case "/proceed":
        response.text = "▶️ *Proceed*\n\n";
        "Proceeding with current operation...\n";
        "Continuing execution as requested.";
        break;

      case "/again":
        response.text = "🔄 *Again*\n\n";
        "Retrying last operation...\n";
        "Restarting the previous task.";
        break;

      case "/manual-revise":
        response.text = "✏️ *Manual Revision*\n\n";
        "Returning to sender with notes...\n";
        "Requesting manual revision with feedback.";
        break;

      case "/manual-append":
        response.text = "➕ *Manual Append*\n\n";
        "Conditional approval with notes...\n";
        "Passing through with additional context.";
        break;

      case "/interrupt":
        response.text = "⏸️ *Interrupt*\n\n";
        "Stopping current operation...\n";
        "Operation paused, ready for new instructions.";
        break;

      case "/troubleshoot":
        response.text = "🔧 *Troubleshoot*\n\n";
        "Generating diagnostic block...\n";
        "Running comprehensive system diagnostics.";
        break;

      case "/troubleshoot-oversight":
        response.text = "👁️ *Troubleshoot with Oversight*\n\n";
        "Running diagnostics with human review...\n";
        "Requires confirmation after fixes.";
        break;

      case "/send-with":
        response.text = "📤 *Send With*\n\n";
        "Requesting patch reissue...\n";
        "Asking sender for additional context.";
        break;

      case "/roadmap":
        response.text = "🗺️ *Project Roadmap*\n\n";
        "Current project milestones:\n";
        "• **Phase 1**: ✅ Complete\n";
        "• **Phase 2**: 🔄 In Progress\n";
        "• **Phase 3**: ⏳ Planned\n";
        "• **Phase 4**: 📋 Backlog";
        break;

      case "/alert-webhook-thoughtmarks-crash":
        response.text = "🚨 *Crash Alert*\n\n";
        "Sending crash alert notification...\n";
        "Alert dispatched to monitoring systems.";
        break;

      default:
        response.text = "❓ *Unknown Command*\n\n"`Command \`${command}\` not recognized.\n`;
        "Available commands: /dashboard, /status-webhook-thoughtmarks, /patch-pass, etc.";
    }

    res.json(response);
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

module.exports = router;
