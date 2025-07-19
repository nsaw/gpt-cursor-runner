const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const { text } = req.body;
    const patchesDir = path.join(__dirname, '../../patches');
    const pendingPatches = [];
    
    // Parse the command text for options
    const options = text ? text.trim().toLowerCase() : 'next';
    const validOptions = ['next', 'task', 'patch', 'phase', 'all', 'queued'];
    
    if (!validOptions.includes(options)) {
      return res.json({
        response_type: 'in_channel',
        text: `❌ Invalid option: ${options}\n\n**Valid options:** ${validOptions.join(', ')}\n\n**Usage:** /patch-pass <next|task|patch|phase|all|queued>`
      });
    }
    
    // Find pending patches
    if (fs.existsSync(patchesDir)) {
      const files = fs.readdirSync(patchesDir);
      
      for (const file of files) {
        if (file.endsWith('.json') && !file.startsWith('approved_') && !file.startsWith('reverted_')) {
          const patchPath = path.join(patchesDir, file);
          const patchData = JSON.parse(fs.readFileSync(patchPath, 'utf8'));
          
          pendingPatches.push({
            file,
            data: patchData,
            timestamp: fs.statSync(patchPath).mtime
          });
        }
      }
    }
    
    if (pendingPatches.length === 0) {
      return res.json({
        response_type: 'in_channel',
        text: `📦 **Patch Pass**\n\nNo pending patches found to pass.\n\n**Option:** ${options}`
      });
    }
    
    // Sort by timestamp (oldest first for next)
    pendingPatches.sort((a, b) => a.timestamp - b.timestamp);
    
    let patchesToPass = [];
    
    switch (options) {
    case 'next':
      patchesToPass = [pendingPatches[0]];
      break;
    case 'all':
    case 'queued':
      patchesToPass = pendingPatches;
      break;
    case 'task':
      patchesToPass = pendingPatches.filter(p => p.data.type === 'task');
      break;
    case 'patch':
      patchesToPass = pendingPatches.filter(p => p.data.type === 'patch');
      break;
    case 'phase':
      patchesToPass = pendingPatches.filter(p => p.data.type === 'phase');
      break;
    }
    
    if (patchesToPass.length === 0) {
      return res.json({
        response_type: 'in_channel',
        text: `📦 **Patch Pass**\n\nNo patches found matching option: ${options}\n\n**Available patches:** ${pendingPatches.length} total`
      });
    }
    
    // Pass the patches
    const passedPatches = [];
    for (const patch of patchesToPass) {
      const approvedPath = path.join(patchesDir, `approved_${patch.file}`);
      fs.renameSync(path.join(patchesDir, patch.file), approvedPath);
      passedPatches.push(patch.file);
    }
    
    res.json({
      response_type: 'in_channel',
      text: `✅ **Patches Passed!**\n\n**Option:** ${options}\n**Count:** ${passedPatches.length} patches\n**Files:** ${passedPatches.join(', ')}\n\n**Timestamp:** ${new Date().toLocaleString()}`
    });
    
  } catch (error) {
    console.error('Error in handlePatchPass:', error);
    res.json({
      response_type: 'in_channel',
      text: `❌ Error passing patches: ${error.message}`
    });
  }
}; 