const stateManager = require('../utils/stateManager');

module.exports = async function handleCursorMode(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /cursor-mode triggered by:", user_name);
  
  try {
    const state = await stateManager.getState();
    
    const modeText = `
🎯 *Cursor Mode Status*

*Current Mode:* ${state.autoMode ? '🤖 Auto Mode' : '👤 Manual Mode'}

*Auto Mode Features:*
• Automatic patch processing
• Continuous monitoring
• Self-healing capabilities
• Background optimization

*Manual Mode Features:*
• Manual patch approval required
• Step-by-step control
• Detailed review process
• Selective processing

*Mode Controls:*
• \`/toggle-runner-auto\` - Switch between modes
• \`/pause-runner\` - Pause processing
• \`/continue-runner\` - Resume processing
• \`/lock-runner\` - Emergency lock

*Current Settings:*
• Auto Mode: ${state.autoMode ? 'Enabled' : 'Disabled'}
• Paused: ${state.paused ? 'Yes' : 'No'}
• Locked: ${state.lockdown ? 'Yes' : 'No'}
• Crash Fence: ${state.crashFence ? 'Active' : 'Inactive'}
    `.trim();

    res.send(modeText);
  } catch (error) {
    console.error('Error getting cursor mode:', error);
    res.send(`❌ Error getting cursor mode: ${error.message}`);
  }
};