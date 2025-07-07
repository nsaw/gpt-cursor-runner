const patchManager = require('../utils/patchManager');

module.exports = async function handleRetryLastFailed(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /retry-last-failed triggered by:", user_name);
  
  try {
    const failedPatches = await patchManager.getFailedPatches();
    
    if (failedPatches.length === 0) {
      res.send(`✅ No failed patches found. All patches are successful or pending.`);
      return;
    }

    const lastFailedPatch = failedPatches[failedPatches.length - 1];
    const retryResult = await patchManager.retryFailedPatch(lastFailedPatch.id);
    
    if (retryResult.success) {
      res.send(`🔄 *Retrying Last Failed Patch*\n\n*Patch ID:* \`${lastFailedPatch.id}\`\n*File:* ${lastFailedPatch.file || 'Unknown'}\n*Description:* ${lastFailedPatch.description || 'No description'}\n*Retry Count:* ${(lastFailedPatch.retryCount || 0) + 1}\n\nStatus: ${retryResult.message}`);
    } else {
      res.send(`❌ Failed to retry patch: ${retryResult.message}`);
    }
  } catch (error) {
    console.error('Error retrying failed patch:', error);
    res.send(`❌ Error retrying failed patch: ${error.message}`);
  }
};