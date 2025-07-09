const runnerController = require('../utils/runnerController');

module.exports = async function handleAgain(req, res) {
  const { user_name, text } = req.body;
  console.log("⚡️ /again triggered by:", user_name, "with text:", text);
  
  try {
    const status = runnerController.getRunnerStatus();
    
    if (!status.isRunning) {
      res.send(`❌ Runner is not currently running. Please start it first with \`/toggle-runner-on\`.`);
      return;
    }
    
    // For now, just acknowledge the command
    // TODO: Implement retry logic for the last failed operation
    res.send(`🔄 *Retry Command*\n\nRetry command received from ${user_name}.\n\nThis feature is under development.`);
  } catch (error) {
    console.error('Error in again action:', error);
    res.send(`❌ Error processing retry command: ${error.message}`);
  }
}; 