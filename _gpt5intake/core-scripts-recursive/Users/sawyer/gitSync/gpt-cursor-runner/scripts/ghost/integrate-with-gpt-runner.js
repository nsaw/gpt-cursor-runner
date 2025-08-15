// integrate-with-gpt-runner.js: Integration script for gpt-cursor-runner
const { routeSummary, updateStatus, getStatus } = require("./route-summary");

// Auto-detect agent based on environment
function autoDetectAgent() {
  // Check for BRAUN agent (MAIN)
  if (process.env.AGENT === "BRAUN") {
    return "MAIN";
  }

  // Check for other agents (CYOPS)
  if (process.env.AGENT) {
    return "CYOPS";
  }

  // Check current working directory
  const cwd = process.cwd();
  if (cwd.includes("tm-mobile-cursor")) {
    return "MAIN";
  }

  // Default to CYOPS for gpt-cursor-runner
  return "CYOPS";
}

// Write summary to correct folder
async function writeSummary(content, filename) {
  const agent = autoDetectAgent();

  try {
    // Update status to show we're writing a summary
    await updateStatus(agent, `Writing summary: ${filename}`);

    // Route the summary
    const result = await routeSummary(content, filename, agent);

    // Update status to show completion
    await updateStatus(agent, `Summary completed: ${filename}`);

    return result;
  } catch (_error) {
    // Update status to show error
    await updateStatus(agent, `Error writing summary: ${error.message}`);
    throw error;
  }
}

// Update agent status
async function updateAgentStatus(status) {
  const agent = autoDetectAgent();
  return await updateStatus(agent, status);
}

// Get current agent status
async function getAgentStatus() {
  const agent = autoDetectAgent();
  const status = await getStatus();
  return status[agent.toLowerCase()];
}

// Export functions for use in gpt-cursor-runner
module.exports = {
  writeSummary,
  updateAgentStatus,
  getAgentStatus,
  autoDetectAgent,
  routeSummary,
  updateStatus,
  getStatus,
};

// CLI usage for testing
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: node integrate-with-gpt-runner.js <command> [options]

Commands:
  write <content> <filename>  - Write summary content to detected agent
  status                      - Get current agent status
  update <status>             - Update current agent status

Examples:
  node integrate-with-gpt-runner.js write "Summary content" summary.md
  node integrate-with-gpt-runner.js status
  node integrate-with-gpt-runner.js update "Processing patch"
`);
    process.exit(1);
  }

  const command = args[0];

  switch (command) {
    case "write":
      if (args.length < 3) {
        console.error(
          "Usage: node integrate-with-gpt-runner.js write <content> <filename>",
        );
        process.exit(1);
      }

      const content = args[1];
      const filename = args[2];

      writeSummary(content, filename)
        .then((result) => console.log("Success:", result))
        .catch((error) => {
          console.error("Error:", error.message);
          process.exit(1);
        });
      break;

    case "status":
      getAgentStatus()
        .then((status) => console.log(JSON.stringify(status, null, 2)))
        .catch((error) => {
          console.error("Error:", error.message);
          process.exit(1);
        });
      break;

    case "update":
      if (args.length < 2) {
        console.error(
          "Usage: node integrate-with-gpt-runner.js update <status>",
        );
        process.exit(1);
      }

      const status = args[1];

      updateAgentStatus(status)
        .then((result) => console.log("Success:", result))
        .catch((error) => {
          console.error("Error:", error.message);
          process.exit(1);
        });
      break;

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}
