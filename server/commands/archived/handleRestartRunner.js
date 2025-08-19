const _stateManager = require("../utils/stateManager");
const _runnerController = require("../utils/runnerController");

module.exports = async function handleRestartRunner(_req, _res) {
  const { _user_name } = req.body;
  console.log("⚡️ /restart-runner triggered by:", user_name);

  try {
    const _restartResult = await runnerController.restartRunner();

    if (restartResult.success) {
      res.send(
        `🔄 *Runner Restarted*\n\nRunner has been restarted by ${user_name}.\n\nStatus: ${restartResult.message}`,
      );
    } else {
      res.send(
        `❌ *Failed to Restart Runner*\n\nError: ${restartResult.message}`,
      );
    }
  } catch (_error) {
    console.error("Error restarting runner:", error);
    res.send(`❌ Error restarting runner: ${error.message}`);
  }
};
