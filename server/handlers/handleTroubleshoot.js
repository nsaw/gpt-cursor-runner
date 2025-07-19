const runnerController = require('../utils/runnerController');

module.exports = async function handleTroubleshoot(req, res) {
  const { user_name, text } = req.body;
  console.log('⚡️ /troubleshoot triggered by:', user_name, 'with text:', text);
  
  try {
    const status = runnerController.getRunnerStatus();
    
    let response = `🔧 *Troubleshoot Report*\n\n*Requested by:* ${user_name}\n*Timestamp:* ${new Date().toLocaleString()}\n\n`;
    
    // Check runner status
    if (status.isRunning) {
      response += '✅ *Runner Status:* Running\n';
      response += `⏱️ *Uptime:* ${Math.floor(status.uptime / 1000 / 60)} minutes\n`;
      if (status.pid) {
        response += `🆔 *PID:* ${status.pid}\n`;
      }
    } else {
      response += '❌ *Runner Status:* Not Running\n';
    }
    
    // Check for errors
    if (status.lastError) {
      response += `⚠️ *Last Error:* ${status.lastError}\n`;
    } else {
      response += '✅ *Last Error:* None\n';
    }
    
    // Health check
    const health = await runnerController.checkRunnerHealth();
    response += `🏥 *Health:* ${health.healthy ? 'Healthy' : 'Unhealthy'}\n`;
    if (!health.healthy) {
      response += `💊 *Health Message:* ${health.message}\n`;
    }
    
    response += '\n*Next Steps:*\n';
    if (!status.isRunning) {
      response += '• Use `/toggle-runner-on` to start the runner\n';
    } else if (!health.healthy) {
      response += '• Use `/restart-runner` to restart the runner\n';
    } else {
      response += '• Use `/status-runner` for detailed status\n';
      response += '• Use `/patch-preview` to check recent patches\n';
    }
    
    res.send(response);
  } catch (error) {
    console.error('Error in troubleshoot:', error);
    res.send(`❌ Error during troubleshooting: ${error.message}`);
  }
}; 