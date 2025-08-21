const express = require("express");
const crypto = require("crypto");
const router = express.Router();

// HMAC verification middleware with timestamp skew protection
function verifySlackSignature(req, res, buf) {
  const signature = req.headers["x-slack-signature"];
  const timestamp = req.headers["x-slack-request-timestamp"];
  const now = Math.floor(Date.now() / 1000);
  const LOG_FILE =
    "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/webhook-errors.log";

  // Log function for consistent error schema
  const logError = (reason) => {
    const errorLog = {
      ts: new Date().toISOString(),
      path: req.path,
      reason,
      signature: signature ? "present" : "missing",
      timestamp: timestamp || "missing",
    };
    require("fs").appendFileSync(LOG_FILE, JSON.stringify(errorLog) + "\n");
  };

  if (!signature || !timestamp) {
    logError("missing_headers");
    return res.status(400).send("Missing Slack signature headers");
  }

  // Timestamp skew check (±5 minutes)
  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum) || Math.abs(now - timestampNum) > 300) {
    logError("timestamp_skew");
    return res.status(400).send("Timestamp skew too large");
  }

  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    logError("missing_secret");
    console.warn("[WARNING] SLACK_SIGNING_SECRET not configured");
    return; // Allow in development
  }

  const baseString = `v0:${timestamp}:${buf}`;
  const hmac = crypto.createHmac("sha256", signingSecret);
  const expectedSignature = `v0=${hmac.update(baseString).digest("hex")}`;

  if (
    !crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    )
  ) {
    logError("invalid_signature");
    return res.status(400).send("Invalid Slack signature");
  }
}

// Apply HMAC verification to all POST requests
router.use(express.json({ verify: verifySlackSignature }));

// Core Runner Control Handlers
const handleDashboard = require("../handlers/handleDashboard");
const handleStatusRunner = require("../handlers/handleStatusRunner");
const handleStatusPush = require("../handlers/handleStatusPush");
const handleRestartRunner = require("../handlers/handleRestartRunner");
const handleKill = require("../handlers/handleKill");
const handleToggleRunner = require("../handlers/handleToggleRunner");
const handleRunnerLock = require("../handlers/handleRunnerLock");
const handleWatchdogPing = require("../handlers/handleWatchdogPing");

// Patch Management Handlers
const handlePatchPass = require("../handlers/handlePatchPass");
const handlePatchRevert = require("../handlers/handlePatchRevert");
const handlePatchPreview = require("../handlers/handlePatchPreview");
const handleApproveScreenshot = require("../handlers/handleApproveScreenshot");
const handleRevertPhase = require("../handlers/handleRevertPhase");
const handleLogPhaseStatus = require("../handlers/handleLogPhaseStatus");
const handleCursorMode = require("../handlers/handleCursorMode");

// Workflow Control Handlers
const handleProceed = require("../handlers/handleProceed");
const handleAgain = require("../handlers/handleAgain");
const handleManualRevise = require("../handlers/handleManualRevise");
const handleManualAppend = require("../handlers/handleManualAppend");
const handleInterrupt = require("../handlers/handleInterrupt");

// Troubleshooting & Diagnostics Handlers
const handleTroubleshoot = require("../handlers/handleTroubleshoot");
const handleTroubleshootOversight = require("../handlers/handleTroubleshootOversight");
const handleSendWith = require("../handlers/handleSendWith");

// Information & Alerts Handlers
const handleRoadmap = require("../handlers/handleRoadmap");
const handleAlertRunnerCrash = require("../handlers/handleAlertRunnerCrash");

router.post("/commands", (req, res) => {
  const { command } = req.body;

  // Essential 25 Commands
  const routes = {
    // Core Runner Control (8 commands)
    "/dashboard": handleDashboard,
    "/status-runner": handleStatusRunner,
    "/status-push": handleStatusPush,
    "/restart-runner": handleRestartRunner,
    "/kill": handleKill,
    "/toggle-runner": handleToggleRunner,
    "/runner-lock": handleRunnerLock,
    "/watchdog-ping": handleWatchdogPing,

    // Patch Management (7 commands)
    "/patch-pass": handlePatchPass,
    "/patch-revert": handlePatchRevert,
    "/patch-preview": handlePatchPreview,
    "/approve-screenshot": handleApproveScreenshot,
    "/revert-phase": handleRevertPhase,
    "/log-phase-status": handleLogPhaseStatus,
    "/cursor-mode": handleCursorMode,

    // Workflow Control (5 commands)
    "/proceed": handleProceed,
    "/again": handleAgain,
    "/manual-revise": handleManualRevise,
    "/manual-append": handleManualAppend,
    "/interrupt": handleInterrupt,

    // Troubleshooting & Diagnostics (3 commands)
    "/troubleshoot": handleTroubleshoot,
    "/troubleshoot-oversight": handleTroubleshootOversight,
    "/send-with": handleSendWith,

    // Information & Alerts (2 commands)
    "/roadmap": handleRoadmap,
    "/alert-runner-crash": handleAlertRunnerCrash,
  };

  if (routes[command]) {
    return routes[command](req, res);
  }

  res.send(
    `❓ Unknown slash command: ${command}\n\nAvailable commands: ${Object.keys(routes).join(", ")}`,
  );
});

module.exports = router;
