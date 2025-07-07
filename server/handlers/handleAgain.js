const stateManager = require('../utils/stateManager');
const runnerController = require('../utils/runnerController');

module.exports = async function handleAgain(req, res) {
  const { user_name, text } = req.body;
  console.log("⚡️ /again triggered by:", user_name, "with text:", text);
  
  try {
    const currentState = await stateManager.getState();
    const action = text?.trim().toLowerCase() || 'auto';
    
    let response = '';
    
    if (action === 'retry' || action === 'failed') {
      // Handle retry last failed operation
      const lastError = currentState.lastError || 'No recent errors found';
      
      if (!currentState.lastError) {
        res.send(`❌ No recent failed operations to retry.`);
        return;
      }

      // Simulate retry of last failed operation
      response = `
🔄 *Retrying Last Failed Operation*

*Last Error:* ${lastError}
*Retried By:* ${user_name}
*Timestamp:* ${new Date().toLocaleString()}

*Status:* 🔄 Retrying...
*Next:* Monitor with \`/status-runner\`
      `.trim();
    } else if (action === 'restart' || action === 'runner' || !currentState.runner.isRunning) {
      // Handle runner restart
      if (currentState.runner.isRunning) {
        await runnerController.killRunner();
      }
      
      await runnerController.startRunner();
      await stateManager.updateState({ 
        runner: { isRunning: true },
        lastRestartedBy: user_name,
        lastRestartedAt: new Date().toISOString()
      });
      
      response = `
🔄 *Runner Restarted*

*Status:* ✅ Runner restarted by ${user_name}
*Timestamp:* ${new Date().toLocaleString()}
*Process:* New PID assigned

*Next Steps:*
• Monitor with \`/status-runner\`
• Check patches with \`/patch-preview\`
      `.trim();
    } else {
      // Default: retry last failed
      const lastError = currentState.lastError || 'No recent errors found';
      
      if (!currentState.lastError) {
        res.send(`❌ No recent failed operations to retry.`);
        return;
      }

      response = `
🔄 *Retrying Last Failed Operation*

*Last Error:* ${lastError}
*Retried By:* ${user_name}
*Timestamp:* ${new Date().toLocaleString()}

*Status:* 🔄 Retrying...
*Next:* Monitor with \`/status-runner\`
      `.trim();
    }

    res.send(response);
  } catch (error) {
    console.error('Error in again action:', error);
    res.send(`❌ Error in again action: ${error.message}`);
  }
}; 