const stateManager = require('../utils/stateManager');

module.exports = async function handlePauseRunner(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /pause-runner triggered by:", user_name);
  
  try {
    const currentState = await stateManager.getState();
    
    if (currentState.paused) {
      res.send(`⏸️ Runner is already paused. Use \`/continue-runner\` to resume.`);
      return;
    }

    await stateManager.pauseRunner();
    
    res.send(`⏸️ *Runner Paused*\n\nRunner has been paused by ${user_name}. Patches will not be processed until resumed with \`/continue-runner\`.`);
  } catch (error) {
    console.error('Error pausing runner:', error);
    res.send(`❌ Error pausing runner: ${error.message}`);
  }
};