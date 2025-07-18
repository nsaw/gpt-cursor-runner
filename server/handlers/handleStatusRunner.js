const patchManager = require('../utils/patchManager');
const runnerController = require('../utils/runnerController');

module.exports = async function handleStatusRunner(req, res) {
  const { user_name } = req.body;
  console.log('⚡️ /status-runner triggered by:', user_name);
  console.log('✅ /status-runner hit - starting handler');
  
  try {
    // Get runner status
    const runnerStatus = runnerController.getRunnerStatus();
    const runnerHealth = await runnerController.checkRunnerHealth();
    
    // Get patch statistics
    const patchStats = await patchManager.getPatchStats();
    
    // Build status response
    let response = `📊 *Runner Status Report*\n\n*Requested by:* ${user_name}\n*Timestamp:* ${new Date().toLocaleString()}\n\n`;
    
    // Runner status
    if (runnerStatus.isRunning) {
      response += '🟢 *Runner:* Running\n';
      response += `⏱️ *Uptime:* ${Math.floor(runnerStatus.uptime / 1000 / 60)} minutes\n`;
      if (runnerStatus.pid) {
        response += `🆔 *PID:* ${runnerStatus.pid}\n`;
      }
    } else {
      response += '🔴 *Runner:* Not Running\n';
    }
    
    // Health status
    response += `🏥 *Health:* ${runnerHealth.healthy ? 'Healthy' : 'Unhealthy'}\n`;
    if (!runnerHealth.healthy) {
      response += `💊 *Health Message:* ${runnerHealth.message}\n`;
    }
    
    // Patch statistics
    response += '\n📦 *Patch Statistics*\n';
    response += `• Total: ${patchStats.total}\n`;
    response += `• Approved: ${patchStats.approved}\n`;
    response += `• Pending: ${patchStats.pending}\n`;
    response += `• Reverted: ${patchStats.reverted}\n`;
    response += `• Failed: ${patchStats.failed}\n`;
    response += `• Success Rate: ${patchStats.successRate}%\n`;
    
    // Recent activity
    try {
      const recentPatches = await patchManager.listPatches(5);
      if (recentPatches.length > 0) {
        response += '\n🕒 *Recent Activity*\n';
        recentPatches.forEach(patch => {
          const status = patch.status === 'approved' ? '✅' : 
            patch.status === 'pending' ? '⏳' : 
              patch.status === 'reverted' ? '🔄' : '❌';
          const patchId = patch.patch_id || patch.id || 'unknown';
          response += `• ${status} ${patchId} (${patch.status || 'unknown'})\n`;
        });
      }
    } catch (error) {
      console.error('Error getting recent patches:', error);
      response += '\n🕒 *Recent Activity:* Error loading recent patches\n';
    }
    
    // Recommendations
    response += '\n💡 *Recommendations*\n';
    if (!runnerStatus.isRunning) {
      response += '• Use `/toggle-runner-on` to start the runner\n';
    } else if (!runnerHealth.healthy) {
      response += '• Use `/restart-runner` to restart the runner\n';
    } else if (patchStats.pending > 0) {
      response += '• Use `/patch-approve` to approve pending patches\n';
    } else {
      response += '• All systems operational\n';
    }
    
    console.log('📤 Sending response:', response.substring(0, 100) + '...');
    res.send(response);
  } catch (error) {
    console.error('Error getting status:', error);
    console.log('❌ Sending error response');
    res.send(`❌ Error getting runner status: ${error.message}`);
  }
}; 