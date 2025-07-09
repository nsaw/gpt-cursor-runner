const patchManager = require('../utils/patchManager');

module.exports = async function handleRevertPhase(req, res) {
  const { user_name, text } = req.body;
  console.log("⚡️ /revert-phase triggered by:", user_name);
  
  try {
    const phaseId = text ? text.trim() : '';
    
    if (!phaseId) {
      res.send(`❌ Please specify a phase ID to revert.\n\nUsage: \`/revert-phase <phase-id>\``);
      return;
    }
    
    // Get recent patches to find the phase
    const recentPatches = await patchManager.listPatches(20);
    const phasePatches = recentPatches.filter(patch => 
      patch.phase === phaseId || patch.id.includes(phaseId)
    );
    
    if (phasePatches.length === 0) {
      res.send(`❌ No patches found for phase \`${phaseId}\`.`);
      return;
    }
    
    // Revert all patches in the phase
    let revertedCount = 0;
    let failedCount = 0;
    
    for (const patch of phasePatches) {
      if (patch.status === 'approved') {
        const revertResult = await patchManager.revertPatch(patch.id);
        if (revertResult.success) {
          revertedCount++;
        } else {
          failedCount++;
        }
      }
    }
    
    if (revertedCount > 0) {
      res.send(`✅ *Phase Reverted*\n\nPhase \`${phaseId}\` has been reverted by ${user_name}.\n\n• Patches reverted: ${revertedCount}\n• Failed reverts: ${failedCount}\n• Total patches in phase: ${phasePatches.length}`);
    } else {
      res.send(`❌ No patches were reverted for phase \`${phaseId}\`.\n\n• Approved patches: ${phasePatches.filter(p => p.status === 'approved').length}\n• Total patches: ${phasePatches.length}`);
    }
  } catch (error) {
    console.error('Error reverting phase:', error);
    res.send(`❌ Error reverting phase: ${error.message}`);
  }
};