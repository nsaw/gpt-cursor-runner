const stateManager = require('../utils/stateManager');
const runnerController = require('../utils/runnerController');

module.exports = async function handleTroubleshootOversight(req, res) {
  const { user_name, text } = req.body;
  console.log("⚡️ /troubleshoot-oversight triggered by:", user_name, "with text:", text);
  
  try {
    const currentState = await stateManager.getState();
    const runnerStatus = await runnerController.getRunnerStatus();
    const action = text?.trim().toLowerCase() || 'review';
    
    // Get recent troubleshooting history
    const troubleshootHistory = currentState.troubleshootHistory || [];
    const lastTroubleshoot = troubleshootHistory[troubleshootHistory.length - 1];
    
    let response = '';
    
    if (action === 'approve' || action === 'confirm') {
      // Approve last automated fix
      if (!lastTroubleshoot) {
        res.send(`❌ No recent automated troubleshooting to approve.`);
        return;
      }
      
      await stateManager.updateState({
        lastOversightApproval: {
          approvedBy: user_name,
          approvedAt: new Date().toISOString(),
          troubleshootId: lastTroubleshoot.id
        }
      });
      
      response = `
✅ *Troubleshoot Oversight Approved*

*Approved By:* ${user_name}
*Timestamp:* ${new Date().toLocaleString()}
*Previous Fix:* ${lastTroubleshoot.fixes?.join(', ') || 'Automated fixes'}

*Status:* ✅ Manual oversight confirmed
*Next:* Monitor with `/status-runner`
      `.trim();
    } else if (action === 'reject' || action === 'rollback') {
      // Reject and rollback last automated fix
      if (!lastTroubleshoot) {
        res.send(`❌ No recent automated troubleshooting to reject.`);
        return;
      }
      
      // Rollback changes
      await stateManager.updateState({
        lastOversightRejection: {
          rejectedBy: user_name,
          rejectedAt: new Date().toISOString(),
          troubleshootId: lastTroubleshoot.id,
          reason: text || 'Manual rejection'
        }
      });
      
      response = `
❌ *Troubleshoot Oversight Rejected*

*Rejected By:* ${user_name}
*Timestamp:* ${new Date().toLocaleString()}
*Reason:* ${text || 'Manual rejection'}

*Status:* 🔄 Rolling back automated fixes
*Next:* Manual intervention required
      `.trim();
    } else {
      // Review mode - show last automated troubleshooting
      if (!lastTroubleshoot) {
        response = `
🔍 *Troubleshoot Oversight Review*

*Status:* No recent automated troubleshooting found
*Current State:* Manual review not needed

*Available Actions:*
• Use \`/troubleshoot\` to run automated diagnostics
• Use \`/troubleshoot-oversight approve\` to approve fixes
• Use \`/troubleshoot-oversight reject\` to reject fixes
        `.trim();
      } else {
        response = `
🔍 *Troubleshoot Oversight Review*

*Last Automated Fix:* ${new Date(lastTroubleshoot.timestamp).toLocaleString()}
*Issues Found:* ${lastTroubleshoot.issues?.length || 0}
*Fixes Applied:* ${lastTroubleshoot.fixes?.length || 0}

*Issues:*
${lastTroubleshoot.issues?.map(issue => `• ${issue}`).join('\n') || '• None'}

*Fixes:*
${lastTroubleshoot.fixes?.map(fix => `• ${fix}`).join('\n') || '• None'}

*Available Actions:*
• \`/troubleshoot-oversight approve\` - Confirm fixes
• \`/troubleshoot-oversight reject\` - Reject and rollback
        `.trim();
      }
    }

    res.send(response);
  } catch (error) {
    console.error('Error in troubleshoot oversight:', error);
    res.send(`❌ Error in troubleshoot oversight: ${error.message}`);
  }
}; 