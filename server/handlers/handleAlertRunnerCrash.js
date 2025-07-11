const stateManager = require('../utils/stateManager');
const runnerController = require('../utils/runnerController');

module.exports = async function handleAlertRunnerCrash(req, res) {
  const { user_name } = req.body;
  console.log('⚡️ /alert-runner-crash triggered by:', user_name);
  
  try {
    // Check runner health
    const healthCheck = await runnerController.checkRunnerHealth();
    const runnerStatus = runnerController.getRunnerStatus();
    
    if (healthCheck.healthy) {
      res.send(`✅ *Runner Health Check*\n\nRunner is healthy and running normally.\n\nStatus: ${healthCheck.message}\nChecked by: ${user_name}`);
      return;
    }

    // Activate crash fence
    await stateManager.setCrashFence(true);
    
    const alertText = `
🚨 *Runner Crash Alert*

*Status:* ⚠️ Runner issues detected
*Alerted By:* ${user_name}
*Timestamp:* ${new Date().toLocaleString()}

*Health Check:*
• Status: ${healthCheck.healthy ? '🟢 Healthy' : '🔴 Unhealthy'}
• Message: ${healthCheck.message}
• Last Error: ${runnerStatus.lastError || 'None'}

*Crash Fence:* 🚧 Activated
*Auto Recovery:* 🔄 Attempting...

*Emergency Actions:*
• \`/restart-runner\` - Restart the runner
• \`/unlock-runner\` - Unlock if needed
• \`/status\` - Check current status
• \`/kill-runner\` - Force kill if necessary

*Next Steps:*
1. Monitor the restart process
2. Check logs for errors
3. Verify runner comes back online
4. Deactivate crash fence when stable
    `.trim();

    res.send(alertText);
  } catch (error) {
    console.error('Error handling crash alert:', error);
    res.send(`❌ Error handling crash alert: ${error.message}`);
  }
};