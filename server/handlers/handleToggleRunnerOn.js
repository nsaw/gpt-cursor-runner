const stateManager = require('../utils/stateManager');
const runnerController = require('../utils/runnerController');

module.exports = async function handleToggleRunnerOn(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /toggle-runner-on triggered by:", user_name);
  
  try {
    const currentState = await stateManager.getState();
    const runnerStatus = runnerController.getRunnerStatus();
    
    if (runnerStatus.isRunning) {
      res.send(`🟢 Runner is already running. Use \`/toggle-runner-off\` to stop it.`);
      return;
    }

    // Resume if paused
    if (currentState.paused) {
      await stateManager.resumeRunner();
    }

    // Start the runner process
    const startResult = await runnerController.startRunner();
    
    if (startResult.success) {
      res.send(`🟢 *Runner Started*\n\nRunner has been started by ${user_name}.\n\nStatus: ${startResult.message}`);
    } else {
      res.send(`❌ *Failed to Start Runner*\n\nError: ${startResult.message}`);
    }
  } catch (error) {
    console.error('Error starting runner:', error);
    res.send(`❌ Error starting runner: ${error.message}`);
  }
};