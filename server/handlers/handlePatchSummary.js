const patchManager = require('../utils/patchManager');
const fs = require('fs').promises;
const path = require('path');

module.exports = async function handlePatchSummary(req, res) {
  const { user_name, text } = req.body;
  console.log('⚡️ /patch-summary triggered by:', user_name);
  
  try {
    const patchId = text ? text.trim() : '';
    
    if (!patchId) {
      // Get the last patch if no ID specified
      const lastPatch = await patchManager.getLastPatch();
      if (!lastPatch) {
        res.send('❌ No patches found to summarize.');
        return;
      }
      
      const summaryResult = await getPatchSummary(lastPatch.id);
      if (summaryResult.success) {
        res.send(`📋 *Patch Summary*\n\nPatch \`${lastPatch.id}\`\n\n${summaryResult.summary}`);
      } else {
        res.send(`❌ Failed to get patch summary: ${summaryResult.message}`);
      }
    } else {
      const summaryResult = await getPatchSummary(patchId);
      if (summaryResult.success) {
        res.send(`📋 *Patch Summary*\n\nPatch \`${patchId}\`\n\n${summaryResult.summary}`);
      } else {
        res.send(`❌ Failed to get patch summary: ${summaryResult.message}`);
      }
    }
  } catch (error) {
    console.error('Error getting patch summary:', error);
    res.send(`❌ Error getting patch summary: ${error.message}`);
  }
};

async function getPatchSummary(patchId) {
  try {
    // Get patch details
    const patchPreview = await patchManager.getPatchPreview(patchId);
    if (!patchPreview.success) {
      return { success: false, message: 'Patch not found' };
    }
    
    const patch = patchPreview.patch;
    
    // Get related summaries
    const summaries = await findRelatedSummaries(patchId);
    
    // Build comprehensive summary
    let summary = `*File:* ${patch.file || 'Unknown'}\n`;
    summary += `*Status:* ${patch.status}\n`;
    summary += `*Created:* ${patch.createdAt}\n`;
    summary += `*Description:* ${patch.description || 'No description'}\n\n`;
    
    if (patch.changes) {
      summary += '*Changes:*\n';
      if (patch.changes.additions) {
        summary += `• Additions: ${patch.changes.additions}\n`;
      }
      if (patch.changes.deletions) {
        summary += `• Deletions: ${patch.changes.deletions}\n`;
      }
      if (patch.changes.modifications) {
        summary += `• Modifications: ${patch.changes.modifications}\n`;
      }
      summary += '\n';
    }
    
    if (summaries.length > 0) {
      summary += '*Related Summaries:*\n';
      summaries.forEach((summaryFile, index) => {
        summary += `${index + 1}. ${path.basename(summaryFile)}\n`;
      });
    }
    
    return { success: true, summary };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function findRelatedSummaries(patchId) {
  try {
    const summariesDir = path.join(__dirname, '../../summaries');
    const files = await fs.readdir(summariesDir);
    
    const relatedSummaries = [];
    for (const file of files) {
      if (file.endsWith('.md') && file.includes('summary-')) {
        const filePath = path.join(summariesDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        
        // Check if summary content mentions the patch ID
        if (content.includes(patchId)) {
          relatedSummaries.push(filePath);
        }
      }
    }
    
    return relatedSummaries;
  } catch (error) {
    console.error('Error finding related summaries:', error);
    return [];
  }
} 