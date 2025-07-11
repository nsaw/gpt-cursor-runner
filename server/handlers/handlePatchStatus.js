const patchManager = require('../utils/patchManager');

module.exports = async function handlePatchStatus(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /patch-status triggered by:", user_name);
  
  try {
    const patchStats = await patchManager.getPatchStats();
    const recentPatches = await patchManager.listPatches(10);
    
    const statusText = `
📦 *Patch Status Report*

*Statistics:*
• Total Patches: ${patchStats.total}
• Approved: ${patchStats.approved} (${patchStats.successRate}%)
• Pending: ${patchStats.pending}
• Failed: ${patchStats.failed}
• Reverted: ${patchStats.reverted}

*Recent Patches:*
${recentPatches.length > 0 
  ? recentPatches.map(patch => {
      const status = patch.status === 'approved' ? '✅' : 
                   patch.status === 'pending' ? '⏳' : 
                   patch.status === 'reverted' ? '🔄' : '❌';
      return `• ${status} ${patch.id} (${patch.status})`;
    }).join('\n')
  : '• No patches found'
}

*Current Status:*
• Last Patch: ${recentPatches.length > 0 ? recentPatches[0].id : 'None'}
• Last Status: ${recentPatches.length > 0 ? recentPatches[0].status : 'None'}
• Success Rate: ${patchStats.successRate}%

*Quick Actions:*
• \`/patch-approve\` - Approve next pending patch
• \`/patch-revert\` - Revert last applied patch
• \`/patch-preview\` - Preview pending patches
• \`/status-runner\` - Check runner status

*Requested by:* ${user_name}
*Timestamp:* ${new Date().toLocaleString()}
    `.trim();

    res.send(statusText);
  } catch (error) {
    console.error('Error getting patch status:', error);
    res.send(`❌ Error getting patch status: ${error.message}`);
  }
}; 