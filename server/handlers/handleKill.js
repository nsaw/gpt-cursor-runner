const stateManager = require('../utils/stateManager');
const runnerController = require('../utils/runnerController');

module.exports = async function handleKill(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /kill triggered by:", user_name);
  
  try {
    const currentState = await stateManager.getState();
    
    if (!currentState.runner.isRunning) {
      res.send(`🔴 Runner is already stopped.`);
      return;
    }

    // Force stop the runner
    await runnerController.killRunner();
    await stateManager.updateState({ 
      runner: { isRunning: false },
      lastKilledBy: user_name,
      lastKilledAt: new Date().toISOString()
    });
    
    res.send(`💀 *Runner Force Killed*\n\nRunner has been forcefully stopped by ${user_name}.\n\n⚠️ *Emergency Stop* - All processes terminated.\n\nUse \`/restart-runner\` to restart when ready.`);
  } catch (error) {
    console.error('Error killing runner:', error);
    res.send(`❌ Error killing runner: ${error.message}`);
  }
}; 