const stateManager = require('../utils/stateManager');

module.exports = async function handleSendWith(req, res) {
  const { user_name, text } = req.body;
  console.log('⚡️ /send-with triggered by:', user_name, 'with text:', text);
  
  try {
    if (!text || text.trim().length < 5) {
      res.send('❌ Please specify what to send with (logs, context, console, etc.).\n\nUsage: `/send-with <context type>`');
      return;
    }

    const contextType = text.trim().toLowerCase();
    const sendData = {
      type: 'send_with_context',
      contextType,
      requestedBy: user_name,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    // Store the send-with request
    await stateManager.updateState({
      lastSendWith: sendData
    });

    let contextDescription = '';
    switch (contextType) {
    case 'logs':
      contextDescription = 'application logs and error traces';
      break;
    case 'context':
      contextDescription = 'current execution context and state';
      break;
    case 'console':
      contextDescription = 'console output and debugging information';
      break;
    case 'all':
      contextDescription = 'all available context (logs, console, state)';
      break;
    default:
      contextDescription = `custom context: ${contextType}`;
    }

    const response = `
📤 *Send With Context Requested*

*Requested By:* ${user_name}
*Timestamp:* ${new Date().toLocaleString()}
*Context Type:* ${contextType}
*Description:* ${contextDescription}

*Status:* 🔄 Requesting context from AI
*Priority:* High (context enhancement)

*Next Steps:*
• AI will resend with requested context
• Monitor with `/status-runner`
• Check results with `/patch-preview`
    `.trim();

    res.send(response);
  } catch (error) {
    console.error('Error in send-with:', error);
    res.send(`❌ Error in send-with: ${error.message}`);
  }
}; 