const runnerController = require('../utils/runnerController');

module.exports = async function handleKill(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /kill triggered by:", user_name);
  
  try {
    const status = runnerController.getRunnerStatus();
    
    if (!status.isRunning) {
      res.send(`❌ Runner is not currently running.`);
      return;
    }
    
    const killResult = await runnerController.killRunner();
    if (killResult.success) {
      res.send(`💀 *Runner Killed*\n\nThe GPT-Cursor Runner has been forcefully terminated by ${user_name}.`);
    } else {
      res.send(`❌ Failed to kill runner: ${killResult.message}`);
    }
  } catch (error) {
    console.error('Error killing runner:', error);
    res.send(`❌ Error killing runner: ${error.message}`);
  }
}; 