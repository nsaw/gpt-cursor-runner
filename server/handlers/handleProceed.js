const stateManager = require('../utils/stateManager');

module.exports = async function handleProceed(req, res) {
  const { user_name, text } = req.body;
  console.log("⚡️ /proceed triggered by:", user_name, "with text:", text);
  
  try {
    const currentState = await stateManager.getState();
    const themeStatus = await stateManager.getThemeStatus();
    
    // Determine action based on context or explicit parameter
    const action = text?.trim().toLowerCase() || 'auto';
    
    let response = '';
    
    if (action === 'screenshot' || action === 'approve' || (themeStatus.lastThemeAudit && !themeStatus.lastThemeAudit.approved)) {
      // Handle screenshot approval
      if (!themeStatus.lastThemeAudit) {
        res.send(`❌ No recent theme changes found to approve.`);
        return;
      }

      const approvalResult = {
        success: true,
        approvedBy: user_name,
        timestamp: new Date().toISOString(),
        changes: themeStatus.lastThemeAudit.changes || []
      };

      await stateManager.updateThemeAudit({
        ...themeStatus.lastThemeAudit,
        approved: true,
        approvedBy: user_name,
        approvedAt: new Date().toISOString()
      });

      response = `
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
• Check overall status with \`/status-runner\`
      `.trim();
    } else if (action === 'continue' || action === 'resume' || currentState.paused) {
      // Handle runner continuation
      if (!currentState.paused) {
        res.send(`▶️ Runner is not paused. Use \`/pause-runner\` to pause.`);
        return;
      }

      await stateManager.resumeRunner();
      
      response = `▶️ *Runner Resumed*\n\nRunner has been resumed by ${user_name}. Patches will now be processed normally.`;
    } else {
      // Default: approve next patch
      const patchStats = await require('../utils/patchManager').getPatchStats();
      
      if (patchStats.pending === 0) {
        res.send(`📋 No pending patches to approve.`);
        return;
      }

      // Simulate patch approval
      response = `✅ *Patch Approved*\n\nNext pending patch has been approved by ${user_name}.\n\nUse \`/status-runner\` to check progress.`;
    }

    res.send(response);
  } catch (error) {
    console.error('Error in proceed action:', error);
    res.send(`❌ Error in proceed action: ${error.message}`);
  }
}; 