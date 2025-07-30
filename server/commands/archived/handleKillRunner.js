const _runnerController = require('../utils/runnerController');

module.exports = async function handleKillRunner(_req, _res) {
  const { _user_name } = req.body;
  console.log('⚡️ /kill-runner triggered by:', user_name);
  
  try {
    const _killResult = await runnerController.killRunner();
    
    if (killResult.success) {
      res.send(`💀 *Runner Killed*\n\nRunner process has been forcefully terminated by ${user_name}.\n\nStatus: ${killResult.message}`);
    } else {
      res.send(`❌ *Failed to Kill Runner*\n\nError: ${killResult.message}`);
    }
  } catch (_error) {
    console.error('Error killing runner:', error);
    res.send(`❌ Error killing runner: ${error.message}`);
  }
};