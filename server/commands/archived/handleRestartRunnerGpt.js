const _runnerController = require("../utils/runnerController");
const _stateManager = require("../utils/stateManager");

module.exports = async function handleRestartRunnerGpt(_req, _res) {
  const { _user_name } = req.body;
  console.log("⚡️ /restart-runner-gpt triggered by:", user_name);

  try {
    // First, ensure runner is not locked
    const _currentState = await stateManager.getState();
    if (currentState.lockdown) {
      res.send(
        "🔒 Runner is locked. Unlock with `/unlock-runner` before restarting.",
      );
      return;
    }

    // Restart the runner process
    const _restartResult = await runnerController.restartRunner();

    if (restartResult.success) {
      res.send(
        `🔄 *GPT Runner Restarted*\n\nGPT-Cursor runner has been restarted by ${user_name}.\n\nStatus: ${restartResult.message}\n\n*Note:* This restarts the GPT processing component specifically.`,
      );
    } else {
      res.send(
        `❌ *Failed to Restart GPT Runner*\n\nError: ${restartResult.message}`,
      );
    }
  } catch (_error) {
    console.error("Error restarting GPT runner:", error);
    res.send(`❌ Error restarting GPT runner: ${error.message}`);
  }
};
