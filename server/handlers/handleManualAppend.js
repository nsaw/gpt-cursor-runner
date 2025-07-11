const stateManager = require('../utils/stateManager');

module.exports = async function handleManualAppend(req, res) {
  const { user_name, text } = req.body;
  console.log('⚡️ /manual-append triggered by:', user_name, 'with text:', text);
  
  try {
    if (!text || text.trim().length < 5) {
      res.send('❌ Please provide content to append (minimum 5 characters).\n\nUsage: `/manual-append <content to append>`');
      return;
    }

    const appendData = {
      type: 'manual_append',
      content: text.trim(),
      requestedBy: user_name,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    // Store the manual append request
    await stateManager.updateState({
      lastManualAppend: appendData
    });

    const response = `
➕ *Manual Append Requested*

*Requested By:* ${user_name}
*Timestamp:* ${new Date().toLocaleString()}
*Content:* ${text.trim()}

*Status:* 🔄 Appending content to current patch
*Priority:* High (manual override)

*Next Steps:*
• Content will be appended to current patch
• Monitor with \`/status-runner\`
• Check results with \`/patch-preview\`
    `.trim();

    res.send(response);
  } catch (error) {
    console.error('Error in manual append:', error);
    res.send(`❌ Error in manual append: ${error.message}`);
  }
}; 