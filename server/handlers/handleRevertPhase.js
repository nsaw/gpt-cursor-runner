const stateManager = require('../utils/stateManager');
const patchManager = require('../utils/patchManager');

module.exports = async function handleRevertPhase(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /revert-phase triggered by:", user_name);
  
  try {
    // Get recent patches to revert
    const recentPatches = await patchManager.listPatches(5);
    const approvedPatches = recentPatches.filter(patch => patch.status === 'approved');
    
    if (approvedPatches.length === 0) {
      res.send(`❌ No approved patches found to revert.`);
      return;
    }

    // Revert the most recent approved patch
    const lastApprovedPatch = approvedPatches[0];
    const revertResult = await patchManager.revertPatch(lastApprovedPatch.id);
    
    if (revertResult.success) {
      res.send(`🔄 *Phase Reverted*\n\n*Reverted Patch:* \`${lastApprovedPatch.id}\`\n*File:* ${lastApprovedPatch.file || 'Unknown'}\n*Description:* ${lastApprovedPatch.description || 'No description'}\n*Reverted By:* ${user_name}\n*Timestamp:* ${new Date().toLocaleString()}\n\nStatus: ${revertResult.message}`);
    } else {
      res.send(`❌ Failed to revert phase: ${revertResult.message}`);
    }
  } catch (error) {
    console.error('Error reverting phase:', error);
    res.send(`❌ Error reverting phase: ${error.message}`);
  }
};