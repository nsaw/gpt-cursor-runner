const patchManager = require('../utils/patchManager');

module.exports = async function handleLogPhaseStatus(req, res) {
  const { user_name, text } = req.body;
  console.log("⚡️ /log-phase-status triggered by:", user_name);
  
  try {
    const phaseId = text ? text.trim() : '';
    
    if (!phaseId) {
      res.send(`❌ Please specify a phase ID.\n\nUsage: \`/log-phase-status <phase-id>\``);
      return;
    }
    
    // Get patch statistics for the phase
    const patchStats = await patchManager.getPatchStats();
    
    // Get recent patches to find phase-specific data
    const recentPatches = await patchManager.listPatches(50);
    const phasePatches = recentPatches.filter(patch => 
      patch.phase === phaseId || patch.id.includes(phaseId)
    );
    
    if (phasePatches.length === 0) {
      res.send(`❌ No patches found for phase \`${phaseId}\`.`);
      return;
    }
    
    // Calculate phase-specific statistics
    const phaseStats = {
      total: phasePatches.length,
      approved: phasePatches.filter(p => p.status === 'approved').length,
      pending: phasePatches.filter(p => p.status === 'pending').length,
      reverted: phasePatches.filter(p => p.status === 'reverted').length,
      failed: phasePatches.filter(p => p.status === 'failed').length
    };
    
    phaseStats.successRate = phaseStats.total > 0 ? 
      ((phaseStats.approved / phaseStats.total) * 100).toFixed(1) : 0;
    
    // Build response
    let response = `📊 *Phase Status Report*\n\n*Phase:* ${phaseId}\n*Requested by:* ${user_name}\n*Timestamp:* ${new Date().toLocaleString()}\n\n`;
    
    response += `📦 *Phase Statistics*\n`;
    response += `• Total Patches: ${phaseStats.total}\n`;
    response += `• Approved: ${phaseStats.approved}\n`;
    response += `• Pending: ${phaseStats.pending}\n`;
    response += `• Reverted: ${phaseStats.reverted}\n`;
    response += `• Failed: ${phaseStats.failed}\n`;
    response += `• Success Rate: ${phaseStats.successRate}%\n`;
    
    // Show recent patches in this phase
    if (phasePatches.length > 0) {
      response += `\n🕒 *Recent Patches in Phase*\n`;
      phasePatches.slice(-5).forEach(patch => {
        const status = patch.status === 'approved' ? '✅' : 
                     patch.status === 'pending' ? '⏳' : 
                     patch.status === 'reverted' ? '🔄' : '❌';
        response += `• ${status} ${patch.id} (${patch.status})\n`;
      });
    }
    
    // Overall system status
    response += `\n🌐 *Overall System Status*\n`;
    response += `• Total Patches: ${patchStats.total}\n`;
    response += `• System Success Rate: ${patchStats.successRate}%\n`;
    
    res.send(response);
  } catch (error) {
    console.error('Error getting phase status:', error);
    res.send(`❌ Error getting phase status: ${error.message}`);
  }
};