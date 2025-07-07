const stateManager = require('../utils/stateManager');
const runnerController = require('../utils/runnerController');

module.exports = async function handleInterrupt(req, res) {
  const { user_name, text } = req.body;
  console.log("⚡️ /interrupt triggered by:", user_name, "with text:", text);
  
  try {
    const currentState = await stateManager.getState();
    const action = text?.trim().toLowerCase() || 'auto';
    
    let response = '';
    
    if (action === 'pause' || action === 'stop') {
      // Pause current operations
      await stateManager.pauseRunner();
      
      response = `
⏸️ *Operations Paused*

*Paused By:* ${user_name}
*Timestamp:* ${new Date().toLocaleString()}
*Status:* All operations suspended

*Next:* Use \`/proceed\` to resume
      `.trim();
    } else if (action === 'kill' || action === 'force') {
      // Force stop all operations
      await runnerController.killRunner();
      await stateManager.updateState({ 
        runner: { isRunning: false },
        lastInterruptedBy: user_name,
        lastInterruptedAt: new Date().toISOString()
      });
      
      response = `
🛑 *Operations Force Stopped*

*Stopped By:* ${user_name}
*Timestamp:* ${new Date().toLocaleString()}
*Status:* All processes terminated

*Next:* Use \`/again\` to restart
      `.trim();
    } else {
      // Default: graceful interruption
      await stateManager.updateState({
        interrupted: true,
        lastInterruptedBy: user_name,
        lastInterruptedAt: new Date().toISOString()
      });
      
      response = `
⚠️ *Operations Interrupted*

*Interrupted By:* ${user_name}
*Timestamp:* ${new Date().toLocaleString()}
*Status:* Graceful interruption in progress

*Next:* Use \`/proceed\` to continue or \`/again\` to restart
      `.trim();
    }

    res.send(response);
  } catch (error) {
    console.error('Error in interrupt:', error);
    res.send(`❌ Error in interrupt: ${error.message}`);
  }
}; 