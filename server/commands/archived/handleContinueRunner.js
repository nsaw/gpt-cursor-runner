const stateManager = require('../utils/stateManager');

module.exports = async function handleContinueRunner(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /continue-runner triggered by:", user_name);
  
  try {
    const currentState = await stateManager.getState();
    
    if (!currentState.paused) {
      res.send(`▶️ Runner is not paused. Use \`/pause-runner\` to pause.`);
      return;
    }

    await stateManager.resumeRunner();
    
    res.send(`▶️ *Runner Resumed*\n\nRunner has been resumed by ${user_name}. Patches will now be processed normally.`);
  } catch (error) {
    console.error('Error resuming runner:', error);
    res.send(`❌ Error resuming runner: ${error.message}`);
  }
};