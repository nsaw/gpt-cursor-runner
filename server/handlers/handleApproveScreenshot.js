const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const patchesDir = path.join(__dirname, '../../patches');
    const screenshotPatches = [];
    
    // Find screenshot-based patches
    if (fs.existsSync(patchesDir)) {
      const files = fs.readdirSync(patchesDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const patchPath = path.join(patchesDir, file);
          const patchData = JSON.parse(fs.readFileSync(patchPath, 'utf8'));
          
          // Check if this is a screenshot-based patch
          if (patchData.type === 'screenshot' || patchData.source === 'screenshot') {
            screenshotPatches.push({
              file,
              data: patchData,
              timestamp: fs.statSync(patchPath).mtime
            });
          }
        }
      }
    }
    
    if (screenshotPatches.length === 0) {
      return res.json({
        response_type: 'in_channel',
        text: '📸 **Screenshot Approval**\n\nNo screenshot-based patches found to approve.'
      });
    }
    
    // Sort by timestamp (newest first)
    screenshotPatches.sort((a, b) => b.timestamp - a.timestamp);
    
    // Approve the most recent screenshot patch
    const patchToApprove = screenshotPatches[0];
    const approvedPath = path.join(patchesDir, `approved_${patchToApprove.file}`);
    
    // Move to approved status
    fs.renameSync(path.join(patchesDir, patchToApprove.file), approvedPath);
    
    res.json({
      response_type: 'in_channel',
      text: `✅ **Screenshot Approved!**\n\n**Patch:** ${patchToApprove.file}\n**Type:** Screenshot-based\n**Status:** Approved\n**Timestamp:** ${patchToApprove.timestamp.toLocaleString()}\n\n**Description:** ${patchToApprove.data.description || 'No description provided'}`
    });
    
  } catch (error) {
    console.error('Error in handleApproveScreenshot:', error);
    res.json({
      response_type: 'in_channel',
      text: `❌ Error approving screenshot: ${error.message}`
    });
  }
}; 