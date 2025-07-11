const stateManager = require('../utils/stateManager');

module.exports = async function handleDashboard(req, res) {
  const { user_name } = req.body;
  console.log('⚡️ /dashboard triggered by:', user_name);
  
  try {
    const state = await stateManager.getState();
    const dashboardUrl = state.public_url || process.env.DASHBOARD_URL || 'https://gpt-cursor-runner.fly.dev/dashboard';
    
    const dashboardText = `
📊 *GPT-Cursor Runner Dashboard*

🔗 *Dashboard URL:* ${dashboardUrl}

*Quick Access:*
• Status: \`/status\`
• Roadmap: \`/roadmap\`
• Theme Status: \`/theme-status\`

*Runner Controls:*
• Pause/Resume: \`/pause-runner\` / \`/continue-runner\`
• Toggle Auto: \`/toggle-runner-auto\`
• Lock/Unlock: \`/lock-runner\` / \`/unlock-runner\`

*Patch Management:*
• Approve: \`/patch-approve\`
• Revert: \`/patch-revert\`
• Preview: \`/patch-preview\`

*Emergency Controls:*
• Kill Runner: \`/kill-runner\`
• Restart: \`/restart-runner\`
• Crash Alert: \`/alert-runner-crash\`

*System Info:*
• Environment: ${process.env.NODE_ENV || 'development'}
• Server: ${process.env.PUBLIC_URL || 'https://gpt-cursor-runner.fly.dev'}
• Timestamp: ${new Date().toLocaleString()}
    `.trim();

    res.send(dashboardText);
  } catch (error) {
    console.error('Error getting dashboard info:', error);
    res.send(`❌ Error getting dashboard info: ${error.message}`);
  }
};