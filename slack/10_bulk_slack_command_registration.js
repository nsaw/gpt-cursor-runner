#!/usr/bin/env node

/**
 * Bulk Slack Command Registration
 * Registers all 25 essential Slack commands in batches
 */

const axios = require("axios");
const path = require("path");

// Essential 25 Commands
const ALL_COMMANDS = [
  // Core Runner Control (8 commands)
  "dashboard",
  "status-runner",
  "status-push",
  "restart-runner",
  "kill",
  "toggle-runner",
  "runner-lock",
  "watchdog-ping",

  // Patch Management (7 commands)
  "patch-pass",
  "patch-revert",
  "patch-preview",
  "approve-screenshot",
  "revert-phase",
  "log-phase-status",
  "cursor-mode",

  // Workflow Control (5 commands)
  "proceed",
  "again",
  "manual-revise",
  "manual-append",
  "interrupt",

  // Troubleshooting & Diagnostics (3 commands)
  "troubleshoot",
  "troubleshoot-oversight",
  "send-with",

  // Information & Alerts (2 commands)
  "roadmap",
  "alert-runner-crash",
];

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const WEBHOOK_BASE_URL =
  process.env.PUBLIC_RUNNER_URL || "https://gpt-cursor-runner.thoughtmarks.app";

if (!SLACK_BOT_TOKEN) {
  console.error("❌ SLACK_BOT_TOKEN not found in environment variables");
  throw new Error("SLACK_BOT_TOKEN not found in environment variables");
}

async function bulkRegisterCommands() {
  console.log("🚀 Starting bulk Slack command registration...");
  console.log(`📡 Webhook URL: ${WEBHOOK_BASE_URL}/slack/commands`);
  console.log(`🔢 Total commands: ${ALL_COMMANDS.length}`);
  console.log("");

  // First, get existing commands to avoid duplicates
  try {
    const existingResponse = await axios.get(
      "https://slack.com/api/apps.commands.list",
      {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        },
      },
    );

    const existingCommands = existingResponse.data.ok
      ? existingResponse.data.commands
      : [];
    console.log(`📋 Found ${existingCommands.length} existing commands`);
  } catch {
    console.log(
      "⚠️ Could not fetch existing commands, proceeding with registration",
    );
  }

  // Create command definitions
  const commandDefinitions = ALL_COMMANDS.map((command) => ({
    command: `/${command}`,
    description: getCommandDescription(command),
    url: `${WEBHOOK_BASE_URL}/slack/commands`,
    usage_hint: getUsageHint(command),
  }));

  console.log("📝 Registering commands in batches...");

  // Register commands in batches of 5 to avoid rate limits
  const batchSize = 5;
  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < commandDefinitions.length; i += batchSize) {
    const batch = commandDefinitions.slice(i, i + batchSize);
    console.log(
      `\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(commandDefinitions.length / batchSize)}`,
    );

    for (const commandDef of batch) {
      try {
        console.log(`   Registering ${commandDef.command}...`);

        const response = await axios.post(
          "https://slack.com/api/apps.commands.create",
          commandDef,
          {
            headers: {
              Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (response.data.ok) {
          console.log(`   ✅ ${commandDef.command} registered successfully`);
          successCount++;
          results.push({
            command: commandDef.command,
            status: "success",
            response: response.data,
          });
        } else {
          console.log(
            `   ❌ ${commandDef.command} failed: ${response.data.error}`,
          );
          errorCount++;
          results.push({
            command: commandDef.command,
            status: "error",
            error: response.data.error,
          });
        }

        // Rate limiting - wait 1 second between requests
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.log(`   ❌ ${commandDef.command} error: ${error.message}`);
        errorCount++;
        results.push({
          command: commandDef.command,
          status: "error",
          error: error.message,
        });
      }
    }

    // Wait between batches
    if (i + batchSize < commandDefinitions.length) {
      console.log("   ⏳ Waiting 3 seconds between batches...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  // Summary
  console.log("\n📊 Registration Summary:");
  console.log(`✅ Successfully registered: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📝 Total attempted: ${ALL_COMMANDS.length}`);

  // Save results to file
  const resultsPath = path.join(
    __dirname,
    "../logs/slack_command_registration_results.json",
  );
  const fs = require("fs");

  // Ensure logs directory exists
  const logsDir = path.dirname(resultsPath);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  fs.writeFileSync(
    resultsPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        summary: {
          total: ALL_COMMANDS.length,
          success: successCount,
          failed: errorCount,
        },
        results,
      },
      null,
      2,
    ),
  );

  console.log(`📄 Results saved to: ${resultsPath}`);

  if (errorCount > 0) {
    console.log("\n❌ Failed commands:");
    results
      .filter((r) => r.status === "error")
      .forEach((r) => {
        console.log(`   • ${r.command}: ${r.error}`);
      });
  }

  return { successCount, errorCount, results };
}

function getCommandDescription(command) {
  const descriptions = {
    // Core Runner Control
    dashboard: "View Dashboard",
    "status-runner": "Check current runner status and health",
    "status-push": "Status pulse now",
    "restart-runner": "Restart the GPT-Cursor Runner service",
    kill: "Force stop the runner (emergency)",
    "toggle-runner": "Toggles between on (auto mode) and off",
    "runner-lock": "toggle (un)Lock runner (prevent changes)",
    "watchdog-ping": "Ping watchdog",

    // Patch Management
    "patch-pass": "Pass next pending patches with options",
    "patch-revert": "Revert the last applied patch",
    "patch-preview": "Preview pending patches",
    "approve-screenshot": "Approve screenshot-based patches",
    "revert-phase": "Revert to previous phase",
    "log-phase-status": "Log current phase status",
    "cursor-mode": "Switch Cursor operation modes",

    // Workflow Control
    proceed: "passes through \"proceed\" with option to specify",
    again: "restarts or retry last with optional manual input",
    "manual-revise": "returns to sender with notes for another attempt",
    "manual-append": "conditional approval- passes through with notes",
    interrupt: "stop current operation, pass note, and resume w/ new info",

    // Troubleshooting & Diagnostics
    troubleshoot: "Triggers GPT to generate a full hybrid diagnostic block",
    "troubleshoot-oversight":
      "requires human review after running fix to confirm",
    "send-with": "Request reissue of patch from sender with more info",

    // Information & Alerts
    roadmap: "Show project roadmap and milestones",
    "alert-runner-crash": "Send crash alert notification",
  };

  return descriptions[command] || `Handle ${command} command`;
}

function getUsageHint(command) {
  const hints = {
    // Core Runner Control
    dashboard: "View dashboard",
    "status-runner": "Check status",
    "status-push": "Status pulse",
    "restart-runner": "Restart service",
    kill: "Emergency stop",
    "toggle-runner": "Toggle runner state",
    "runner-lock": "Lock/unlock runner",
    "watchdog-ping": "Check system health",

    // Patch Management
    "patch-pass": "Pass patches",
    "patch-revert": "Revert patch",
    "patch-preview": "Preview patch",
    "approve-screenshot": "Approve screenshot",
    "revert-phase": "Revert phase",
    "log-phase-status": "Log status",
    "cursor-mode": "Switch mode",

    // Workflow Control
    proceed: "Proceed with options",
    again: "Retry operation",
    "manual-revise": "Manual revision",
    "manual-append": "Manual append",
    interrupt: "Interrupt operations",

    // Troubleshooting & Diagnostics
    troubleshoot: "Auto diagnostics",
    "troubleshoot-oversight": "Oversight mode",
    "send-with": "Send with context",

    // Information & Alerts
    roadmap: "View roadmap",
    "alert-runner-crash": "Alert crash",
  };

  return hints[command] || command;
}

if (require.main === module) {
  bulkRegisterCommands().then((result) => {
    if (result.errorCount > 0) {
      throw new Error(`Registration completed with ${result.errorCount} errors`);
    }
  });
}

module.exports = { bulkRegisterCommands, ALL_COMMANDS };
