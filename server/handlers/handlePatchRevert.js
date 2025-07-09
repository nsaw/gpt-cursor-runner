const patchManager = require('../utils/patchManager');

module.exports = async function handlePatchRevert(req, res) {
  const { user_name, text } = req.body;
  console.log("⚡️ /patch-revert triggered by:", user_name);
  
  try {
    const patchId = text ? text.trim() : '';
    
    if (!patchId) {
      // Get the last approved patch if no ID specified
      const lastPatch = await patchManager.getLastPatch();
      if (!lastPatch || lastPatch.status !== 'approved') {
        res.send(`❌ No approved patches to revert.`);
        return;
      }
      
      const revertResult = await patchManager.revertPatch(lastPatch.id);
      if (revertResult.success) {
        res.send(`✅ *Patch Reverted*\n\nPatch \`${lastPatch.id}\` has been reverted by ${user_name}.\n\nFile: ${lastPatch.file || 'Unknown'}\nDescription: ${lastPatch.description || 'No description'}`);
      } else {
        res.send(`❌ Failed to revert patch: ${revertResult.message}`);
      }
    } else {
      const revertResult = await patchManager.revertPatch(patchId);
      if (revertResult.success) {
        res.send(`✅ *Patch Reverted*\n\nPatch \`${patchId}\` has been reverted by ${user_name}.`);
      } else {
        res.send(`❌ Failed to revert patch: ${revertResult.message}`);
      }
    }
  } catch (error) {
    console.error('Error reverting patch:', error);
    res.send(`❌ Error reverting patch: ${error.message}`);
  }
};