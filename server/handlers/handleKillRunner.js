const runnerController = require('../utils/runnerController');

module.exports = async function handleKillRunner(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /kill-runner triggered by:", user_name);
  
  try {
    const killResult = await runnerController.killRunner();
    
    if (killResult.success) {
      res.send(`💀 *Runner Killed*\n\nRunner process has been forcefully terminated by ${user_name}.\n\nStatus: ${killResult.message}`);
    } else {
      res.send(`❌ *Failed to Kill Runner*\n\nError: ${killResult.message}`);
    }
  } catch (error) {
    console.error('Error killing runner:', error);
    res.send(`❌ Error killing runner: ${error.message}`);
  }
};