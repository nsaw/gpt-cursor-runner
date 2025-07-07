const stateManager = require('../utils/stateManager');

module.exports = async function handleManualRevise(req, res) {
  const { user_name, text } = req.body;
  console.log("⚡️ /manual-revise triggered by:", user_name, "with text:", text);
  
  try {
    if (!text || text.trim().length < 10) {
      res.send(`❌ Please provide revision instructions (minimum 10 characters).\n\nUsage: \`/manual-revise <your revision instructions>\``);
      return;
    }

    const revisionData = {
      type: 'manual_revision',
      instructions: text.trim(),
      requestedBy: user_name,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    // Store the manual revision request
    await stateManager.updateState({
      lastManualRevision: revisionData
    });

    const response = `
✏️ *Manual Revision Requested*

*Requested By:* ${user_name}
*Timestamp:* ${new Date().toLocaleString()}
*Instructions:* ${text.trim()}

*Status:* 🔄 Processing manual revision
*Priority:* High (manual override)

*Next Steps:*
• Revision will be applied to current patch
• Monitor with \`/status-runner\`
• Check results with \`/patch-preview\`
    `.trim();

    res.send(response);
  } catch (error) {
    console.error('Error in manual revision:', error);
    res.send(`❌ Error in manual revision: ${error.message}`);
  }
}; 