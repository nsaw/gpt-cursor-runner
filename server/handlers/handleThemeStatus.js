const stateManager = require('../utils/stateManager');

module.exports = async function handleThemeStatus(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /theme-status triggered by:", user_name);
  
  try {
    const themeStatus = await stateManager.getThemeStatus();
    
    const statusText = `
🎨 *Theme Status Report*

*Last Audit:* ${themeStatus.lastThemeAudit ? new Date(themeStatus.lastThemeAudit.timestamp).toLocaleString() : 'Never'}
*Needs Fix:* ${themeStatus.needsFix ? '🔴 Yes' : '🟢 No'}

*Theme Issues:*
${themeStatus.themeIssues.length > 0 
  ? themeStatus.themeIssues.map(issue => `• ${issue}`).join('\n')
  : '✅ No issues detected'
}

*Theme Health:* ${themeStatus.needsFix ? '⚠️ Needs Attention' : '✅ Healthy'}

*Actions:*
• Use \`/theme\` to view current theme
• Use \`/theme-fix\` to apply theme fixes
• Use \`/approve-screenshot\` to approve theme changes
    `.trim();

    res.send(statusText);
  } catch (error) {
    console.error('Error getting theme status:', error);
    res.send(`❌ Error getting theme status: ${error.message}`);
  }
};