const stateManager = require('../utils/stateManager');

module.exports = async function handleApproveScreenshot(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /approve-screenshot triggered by:", user_name);
  
  try {
    const themeStatus = await stateManager.getThemeStatus();
    
    if (!themeStatus.lastThemeAudit) {
      res.send(`❌ No recent theme changes found to approve.`);
      return;
    }

    // Simulate screenshot approval process
    const approvalResult = {
      success: true,
      approvedBy: user_name,
      timestamp: new Date().toISOString(),
      changes: themeStatus.lastThemeAudit.changes || []
    };

    // Update theme audit with approval
    await stateManager.updateThemeAudit({
      ...themeStatus.lastThemeAudit,
      approved: true,
      approvedBy: user_name,
      approvedAt: new Date().toISOString()
    });

    const approvalText = `
📸 *Screenshot Approved*

*Status:* ✅ Approved by ${user_name}
*Timestamp:* ${new Date(approvalResult.timestamp).toLocaleString()}
*Changes:* ${approvalResult.changes.length} theme changes approved

*Approved Changes:*
${approvalResult.changes.length > 0 
  ? approvalResult.changes.map(change => `• ${change}`).join('\n')
  : '• Theme updates applied'
}

*Next Steps:*
• Theme changes are now live
• Monitor with \`/theme-status\`
• Check overall status with \`/status\`
    `.trim();

    res.send(approvalText);
  } catch (error) {
    console.error('Error approving screenshot:', error);
    res.send(`❌ Error approving screenshot: ${error.message}`);
  }
};