const patchManager = require('../utils/patchManager');

module.exports = async function handlePatchPreview(req, res) {
  const { user_name, text } = req.body;
  console.log("⚡️ /patch-preview triggered by:", user_name);
  
  try {
    const patchId = text ? text.trim() : '';
    
    if (!patchId) {
      // Get the last patch if no ID specified
      const lastPatch = await patchManager.getLastPatch();
      if (!lastPatch) {
        res.send(`❌ No patches found to preview.`);
        return;
      }
      
      const previewResult = await patchManager.getPatchPreview(lastPatch.id);
      if (previewResult.success) {
        const patch = previewResult.patch;
        res.send(`📋 *Patch Preview*\n\nPatch \`${patch.id}\`\nFile: ${patch.file || 'Unknown'}\nStatus: ${patch.status}\nDescription: ${patch.description || 'No description'}\nCreated: ${patch.createdAt}`);
      } else {
        res.send(`❌ Failed to preview patch: ${previewResult.message}`);
      }
    } else {
      const previewResult = await patchManager.getPatchPreview(patchId);
      if (previewResult.success) {
        const patch = previewResult.patch;
        res.send(`📋 *Patch Preview*\n\nPatch \`${patch.id}\`\nFile: ${patch.file || 'Unknown'}\nStatus: ${patch.status}\nDescription: ${patch.description || 'No description'}\nCreated: ${patch.createdAt}`);
      } else {
        res.send(`❌ Failed to preview patch: ${previewResult.message}`);
      }
    }
  } catch (error) {
    console.error('Error previewing patch:', error);
    res.send(`❌ Error previewing patch: ${error.message}`);
  }
};