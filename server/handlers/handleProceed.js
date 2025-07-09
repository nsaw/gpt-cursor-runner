const patchManager = require('../utils/patchManager');
const runnerController = require('../utils/runnerController');

module.exports = async function handleProceed(req, res) {
  const { user_name, text } = req.body;
  console.log("⚡️ /proceed triggered by:", user_name, "with text:", text);
  
  try {
    const action = text ? text.trim().toLowerCase() : 'auto';
    
    // Get current status
    const runnerStatus = runnerController.getRunnerStatus();
    const patchStats = await patchManager.getPatchStats();
    
    let response = `🚀 *Proceed Command*\n\n*Requested by:* ${user_name}\n*Action:* ${action}\n*Timestamp:* ${new Date().toLocaleString()}\n\n`;
    
    if (action === 'approve' || action === 'patch') {
      // Approve next pending patch
      const pendingPatches = await patchManager.getPendingPatches();
      if (pendingPatches.length === 0) {
        response += `❌ No pending patches to approve.\n\nUse \`/patch-approve\` to approve specific patches.`;
      } else {
        const nextPatch = pendingPatches[0];
        const approveResult = await patchManager.approvePatch(nextPatch.id);
        if (approveResult.success) {
          response += `✅ *Patch Approved*\n\nPatch \`${nextPatch.id}\` has been approved.\n\nFile: ${nextPatch.file || 'Unknown'}\nDescription: ${nextPatch.description || 'No description'}`;
        } else {
          response += `❌ Failed to approve patch: ${approveResult.message}`;
        }
      }
    } else if (action === 'runner' || action === 'start') {
      // Start the runner
      if (runnerStatus.isRunning) {
        response += `✅ Runner is already running.\n\nUse \`/status-runner\` to check current status.`;
      } else {
        const startResult = await runnerController.startRunner();
        if (startResult.success) {
          response += `✅ *Runner Started*\n\nThe GPT-Cursor Runner has been started successfully.`;
        } else {
          response += `❌ Failed to start runner: ${startResult.message}`;
        }
      }
    } else {
      // Auto mode - check what needs to be done
      response += `🤖 *Auto Proceed Mode*\n\n`;
      
      if (!runnerStatus.isRunning) {
        response += `🔴 Runner is not running.\n\nUse \`/toggle-runner-on\` to start the runner.`;
      } else if (patchStats.pending > 0) {
        response += `⏳ ${patchStats.pending} pending patches found.\n\nUse \`/patch-approve\` to approve the next patch.`;
      } else {
        response += `✅ All systems operational.\n\nNo pending actions required.`;
      }
    }
    
    res.send(response);
  } catch (error) {
    console.error('Error in proceed action:', error);
    res.send(`❌ Error processing proceed command: ${error.message}`);
  }
}; 