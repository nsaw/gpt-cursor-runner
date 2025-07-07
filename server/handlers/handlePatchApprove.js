const patchManager = require('../utils/patchManager');

module.exports = async function handlePatchApprove(req, res) {
  const { user_name, text } = req.body;
  console.log("⚡️ /patch-approve triggered by:", user_name);
  
  try {
    const patchId = text.trim();
    
    if (!patchId) {
      // Get the last pending patch if no ID specified
      const lastPatch = await patchManager.getLastPatch();
      if (!lastPatch || lastPatch.status !== 'pending') {
        res.send(`❌ No pending patches to approve.`);
        return;
      }
      
      const approveResult = await patchManager.approvePatch(lastPatch.id);
      if (approveResult.success) {
        res.send(`✅ *Patch Approved*\n\nPatch \`${lastPatch.id}\` has been approved by ${user_name}.\n\nFile: ${lastPatch.file || 'Unknown'}\nDescription: ${lastPatch.description || 'No description'}`);
      } else {
        res.send(`❌ Failed to approve patch: ${approveResult.message}`);
      }
    } else {
      const approveResult = await patchManager.approvePatch(patchId);
      if (approveResult.success) {
        res.send(`✅ *Patch Approved*\n\nPatch \`${patchId}\` has been approved by ${user_name}.`);
      } else {
        res.send(`❌ Failed to approve patch: ${approveResult.message}`);
      }
    }
  } catch (error) {
    console.error('Error approving patch:', error);
    res.send(`❌ Error approving patch: ${error.message}`);
  }
};