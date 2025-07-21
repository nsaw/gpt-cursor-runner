const stateManager = require('../utils/stateManager');
const runnerController = require('../utils/runnerController');
const patchManager = require('../utils/patchManager');

module.exports = async function handleStatus(req, res) {
  const { user_name } = req.body;
  console.log('⚡️ /status triggered by:', user_name);
  
  try {
    const [state, runnerStatus, patchStats] = await Promise.all([
      stateManager.getRunnerStatus(),
      runnerController.getRunnerStatus(),
      patchManager.getPatchStats()
    ]);

    const status = {
      ...state,
      runner: runnerStatus,
      patches: patchStats,
      timestamp: new Date().toISOString()
    };

    const statusText = `
🚀 *GPT-Cursor Runner Status*

*Runner State:*
• Status: ${status.runner.isRunning ? '🟢 Running' : '🔴 Stopped'}
• Paused: ${status.paused ? '⏸️ Yes' : '▶️ No'}
• Auto Mode: ${status.autoMode ? '🤖 Enabled' : '👤 Manual'}
• Lockdown: ${status.lockdown ? '🔒 Locked' : '🔓 Unlocked'}
• Crash Fence: ${status.crashFence ? '🚧 Active' : '✅ Clear'}

*Runner Process:*
• PID: ${status.runner.pid || 'N/A'}
• Uptime: ${Math.floor(status.runner.uptime / 1000)}s
• Last Error: ${status.runner.lastError || 'None'}

*Patch Statistics:*
• Total: ${status.patches.total}
• Approved: ${status.patches.approved} (${status.patches.successRate}%)
• Pending: ${status.patches.pending}
• Failed: ${status.patches.failed}
• Reverted: ${status.patches.reverted}

*System:*
• Server Uptime: ${Math.floor(status.uptime)}s
• Memory: ${Math.round(status.memory.heapUsed / 1024 / 1024)}MB
• Timestamp: ${new Date(status.timestamp).toLocaleString()}
    `.trim();

    res.send(statusText);
  } catch (error) {
    console.error('Error getting status:', error);
    res.send(`❌ Error getting status: ${error.message}`);
  }
};