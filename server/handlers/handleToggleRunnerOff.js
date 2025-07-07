const stateManager = require('../utils/stateManager');
const runnerController = require('../utils/runnerController');

module.exports = async function handleToggleRunnerOff(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /toggle-runner-off triggered by:", user_name);
  
  try {
    const runnerStatus = runnerController.getRunnerStatus();
    
    if (!runnerStatus.isRunning) {
      res.send(`🔴 Runner is not running. Use \`/toggle-runner-on\` to start it.`);
      return;
    }

    // Stop the runner process
    const stopResult = await runnerController.stopRunner();
    
    if (stopResult.success) {
      res.send(`🔴 *Runner Stopped*\n\nRunner has been stopped by ${user_name}.\n\nStatus: ${stopResult.message}`);
    } else {
      res.send(`❌ *Failed to Stop Runner*\n\nError: ${stopResult.message}`);
    }
  } catch (error) {
    console.error('Error stopping runner:', error);
    res.send(`❌ Error stopping runner: ${error.message}`);
  }
};