const stateManager = require('../utils/stateManager');

module.exports = async function handleCommandCenter(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /command-center triggered by:", user_name);
  
  try {
    const commandCenterText = `
🎛️ *GPT-Cursor Runner Command Center*

*Slack-Registered Commands (30):*
• \`/dashboard\` - View dashboard and stats
• \`/patch-approve\` - Approve next pending patch
• \`/patch-revert\` - Revert last applied patch
• \`/pause-runner\` - Pause the runner
• \`/status-runner\` - Check runner status and health
• \`/show-roadmap\` - Display development roadmap
• \`/roadmap\` - Show project roadmap
• \`/kill\` - Force stop runner (emergency)
• \`/toggle-runner-on\` - Enable runner
• \`/toggle-runner-off\` - Disable runner
• \`/toggle-runner-auto\` - Toggle automatic processing
• \`/theme\` - Manage Cursor theme settings
• \`/theme-status\` - Check theme status
• \`/theme-fix\` - Fix theme issues
• \`/patch-preview\` - Preview pending patches
• \`/revert-phase\` - Revert to previous phase
• \`/log-phase-status\` - Log current phase status
• \`/cursor-mode\` - Switch Cursor operation modes
• \`/whoami\` - Show current user and permissions
• \`/lock-runner\` - Lock runner (prevent changes)
• \`/unlock-runner\` - Unlock runner (allow changes)
• \`/alert-runner-crash\` - Send crash alert notification
• \`/proceed\` - Proceed with next action
• \`/again\` - Retry failed operation
• \`/manual-revise\` - Manually revise current patch
• \`/manual-append\` - Manually append content
• \`/interrupt\` - Interrupt current operations
• \`/troubleshoot\` - Automated troubleshooting
• \`/troubleshoot-oversight\` - Manual oversight
• \`/send-with\` - Request AI to resend with context
• \`/gpt-slack-dispatch\` - Enable GPT to post to Slack
• \`/cursor-slack-dispatch\` - Enable Cursor to post to Slack

*Dashboard-Only Commands (5):*
• \`/gpt-ping\` - Send ping message to Slack
• \`/approve-screenshot\` - Approve screenshot content
• \`/continue-runner\` - Continue runner operations
• \`/restart-runner\` - Restart the runner
• \`/restart-runner-gpt\` - Restart with GPT settings
• \`/retry-last-failed\` - Retry last failed operation

*Quick Categories:*
🔄 *Runner Control:* /pause-runner, /continue-runner, /restart-runner, /kill
📦 *Patch Management:* /patch-approve, /patch-revert, /patch-preview
🎨 *Theme Management:* /theme, /theme-status, /theme-fix
🔧 *Troubleshooting:* /troubleshoot, /troubleshoot-oversight
📊 *Status & Info:* /status-runner, /dashboard, /whoami
🚨 *Emergency:* /alert-runner-crash, /interrupt, /lock-runner

*System Info:*
• Total Commands: 35
• Slack-Registered: 30
• Dashboard-Only: 5
• Environment: ${process.env.NODE_ENV || 'development'}
• Server: ${process.env.PUBLIC_URL || 'https://gpt-cursor-runner.fly.dev'}
• Timestamp: ${new Date().toLocaleString()}
    `.trim();

    res.send(commandCenterText);
  } catch (error) {
    console.error('Error getting command center:', error);
    res.send(`❌ Error getting command center: ${error.message}`);
  }
}; 