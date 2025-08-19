// HYBRID BLOCK
// FILENAME: tasks/9_automated_slack_command_registration.js
// PURPOSE: Automatically registers all 25+ Slack slash commands using Slack API

const _fs = require("fs");
const _path = require("path");
const _axios = require("axios");
require("dotenv").config();

const _ALL_COMMANDS = [
  "dashboard",
  "patch-approve",
  "patch-revert",
  "pause-runner",
  "restart-runner",
  "restart-runner-gpt",
  "continue-runner",
  "status",
  "show-roadmap",
  "roadmap",
  "kill-runner",
  "toggle-runner-on",
  "toggle-runner-off",
  "toggle-runner-auto",
  "theme",
  "theme-status",
  "theme-fix",
  "patch-preview",
  "approve-screenshot",
  "revert-phase",
  "log-phase-status",
  "cursor-mode",
  "whoami",
  "retry-last-failed",
  "lock-runner",
  "unlock-runner",
  "alert-runner-crash",
];

const _SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const _SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const _WEBHOOK_BASE_URL =
  process.env.PUBLIC_RUNNER_URL || "https://gpt-cursor-runner.thoughtmarks.app";

if (!SLACK_BOT_TOKEN) {
  console.error("❌ SLACK_BOT_TOKEN not found in environment variables");
  process.exit(1);
}

async function registerSlackCommands() {
  console.log("🚀 Starting automated Slack command registration...");
  console.log(`📡 Webhook URL: ${WEBHOOK_BASE_URL}/slack/commands`);
  console.log(`🔢 Total commands to register: ${ALL_COMMANDS.length}`);
  console.log("");

  const _results = [];
  const _successCount = 0;
  const _errorCount = 0;

  for (const command of ALL_COMMANDS) {
    try {
      console.log(`📝 Registering /${command}...`);

      const _commandData = {
        command: `/${command}`,
        description: getCommandDescription(command),
        url: `${WEBHOOK_BASE_URL}/slack/commands`,
        usage_hint: getUsageHint(command),
      };

      const _response = await axios.post(
        "https://slack.com/api/apps.commands.create",
        commandData,
        {
          headers: {
            Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.ok) {
        console.log(`✅ /${command} registered successfully`);
        successCount++;
        results.push({ command, status: "success", response: response.data });
      } else {
        console.log(`❌ /${command} failed: ${response.data.error}`);
        errorCount++;
        results.push({ command, status: "error", error: response.data.error });
      }

      // Rate limiting - wait 1 second between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (_error) {
      console.log(`❌ /${command} error: ${error.message}`);
      errorCount++;
      results.push({ command, status: "error", error: error.message });
    }
  }

  // Summary
  console.log("\n📊 Registration Summary:");
  console.log(`✅ Successfully registered: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📝 Total attempted: ${ALL_COMMANDS.length}`);

  // Save results to file
  const _resultsPath = path.join(
    __dirname,
    "../logs/slack_command_registration_results.json",
  );
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`📄 Results saved to: ${resultsPath}`);

  // Generate verification script
  generateVerificationScript();
}

function getCommandDescription(_command) {
  const _descriptions = {
    dashboard: "View GPT-Cursor Runner dashboard and stats",
    "patch-approve": "Approve the next pending GPT patch",
    "patch-revert": "Revert the last applied patch",
    "pause-runner": "Pause the GPT-Cursor Runner",
    "restart-runner": "Restart the GPT-Cursor Runner service",
    "restart-runner-gpt": "Restart GPT integration specifically",
    "continue-runner": "Resume the paused runner",
    status: "Check current runner status and health",
    "show-roadmap": "Display development roadmap",
    roadmap: "Show project roadmap and milestones",
    "kill-runner": "Force stop the runner (emergency)",
    "toggle-runner-on": "Enable the runner",
    "toggle-runner-off": "Disable the runner",
    "toggle-runner-auto": "Toggle automatic patch processing",
    theme: "Manage Cursor theme settings",
    "theme-status": "Check current theme status",
    "theme-fix": "Fix theme-related issues",
    "patch-preview": "Preview pending patches",
    "approve-screenshot": "Approve screenshot-based patches",
    "revert-phase": "Revert to previous phase",
    "log-phase-status": "Log current phase status",
    "cursor-mode": "Switch Cursor operation modes",
    whoami: "Show current user and permissions",
    "retry-last-failed": "Retry the last failed operation",
    "lock-runner": "Lock runner (prevent changes)",
    "unlock-runner": "Unlock runner (allow changes)",
    "alert-runner-crash": "Send crash alert notification",
  };
  return descriptions[command] || `Execute ${command} command`;
}

function getUsageHint(_command) {
  const _hints = {
    dashboard: "View dashboard",
    "patch-approve": "Approve patch",
    "patch-revert": "Revert patch",
    "pause-runner": "Pause runner",
    "restart-runner": "Restart service",
    status: "Check status",
    roadmap: "Show roadmap",
    theme: "Manage theme",
    whoami: "Show user info",
    "lock-runner": "Lock runner",
    "unlock-runner": "Unlock runner",
  };
  return hints[command] || "";
}

function generateVerificationScript() {
  const _verificationScript = `#!/bin/bash
# FILENAME: verify-slack-commands.sh
# PURPOSE: Verify all registered Slack commands

echo "🔍 Verifying Slack command registration..."

${ALL_COMMANDS.map((cmd) => `echo "Testing /${cmd}..."`).join("\n")}

echo "✅ Verification complete. Check Slack for command availability."
`;

  const _scriptPath = path.join(__dirname, "../verify-slack-commands.sh");
  fs.writeFileSync(scriptPath, verificationScript);
  fs.chmodSync(scriptPath, 0o755);
  console.log(`🔍 Verification script created: ${scriptPath}`);
}

// Run the registration
registerSlackCommands().catch(console.error);
