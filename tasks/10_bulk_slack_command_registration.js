// HYBRID BLOCK
// FILENAME: tasks/10_bulk_slack_command_registration.js
// PURPOSE: Bulk register all Slack commands in efficient batches

const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const ALL_COMMANDS = [
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

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const WEBHOOK_BASE_URL =
  process.env.PUBLIC_RUNNER_URL || "https://gpt-cursor-runner.fly.dev";

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
      `\n🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(commandDefinitions.length / batchSize)}`,
    );

    for (const commandDef of batch) {
      try {
        console.log(`📝 Registering ${commandDef.command}...`);

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
          console.log(`✅ ${commandDef.command} registered successfully`);
          successCount++;
          results.push({
            command: commandDef.command,
            status: "success",
            response: response.data,
          });
        } else {
          console.log(
            `❌ ${commandDef.command} failed: ${response.data.error}`,
          );
          errorCount++;
          results.push({
            command: commandDef.command,
            status: "error",
            error: response.data.error,
          });
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.log(`❌ ${commandDef.command} error: ${error.message}`);
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
      console.log("⏳ Waiting 2 seconds before next batch...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log("\n📊 Bulk Registration Summary:");
  console.log(`✅ Successfully registered: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📝 Total attempted: ${ALL_COMMANDS.length}`);

  // Save results
  const resultsPath = path.join(
    __dirname,
    "../logs/bulk_slack_registration_results.json",
  );
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`📄 Results saved to: ${resultsPath}`);

  // Generate command list for documentation
  generateCommandList();
}

function getCommandDescription(command) {
  const descriptions = {
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

function getUsageHint(command) {
  const hints = {
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

function generateCommandList() {
  const commandList = `# 📋 Registered Slack Commands

## Available Commands (${ALL_COMMANDS.length} total)

${ALL_COMMANDS.map((cmd) => `- \`/${cmd}\` - ${getCommandDescription(cmd)}`).join("\n")}

## Usage
All commands use the webhook URL: \`${WEBHOOK_BASE_URL}/slack/commands\`

## Categories
- **Runner Control**: dashboard, status, pause-runner, restart-runner, continue-runner
- **Patch Management**: patch-approve, patch-revert, patch-preview, approve-screenshot
- **System Control**: kill-runner, lock-runner, unlock-runner, alert-runner-crash
- **Theme Management**: theme, theme-status, theme-fix
- **Development**: roadmap, show-roadmap, log-phase-status
- **User**: whoami, cursor-mode
- **Recovery**: retry-last-failed, revert-phase
`;

  const listPath = path.join(__dirname, "../docs/REGISTERED_SLACK_COMMANDS.md");
  fs.mkdirSync(path.dirname(listPath), { recursive: true });
  fs.writeFileSync(listPath, commandList);
  console.log(`📋 Command list saved to: ${listPath}`);
}

// Run the bulk registration
bulkRegisterCommands().catch(console.error);