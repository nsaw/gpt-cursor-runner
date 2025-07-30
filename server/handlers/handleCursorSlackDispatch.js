const { WebClient } = require('@slack/web-api');
const _stateManager = require('../utils/stateManager');

// Initialize Slack Web API client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

module.exports = async function handleCursorSlackDispatch(req, res) {
  const { user_name, text } = req.body;
  console.log('⚡️ /cursor-slack-dispatch triggered by:', user_name, 'with text:', text);
  
  try {
    // Parse the Cursor dispatch request
    let dispatchRequest;
    try {
      dispatchRequest = JSON.parse(text);
    } catch (error) {
      res.send('❌ Invalid JSON format. Expected: {"action": "slack.postMessage", "channel": "#channel", "text": "message"}');
      return;
    }

    const { action, channel, blocks, text, ts, context } = dispatchRequest;
    
    // Validate required fields
    if (!action || !channel) {
      res.send('❌ Missing required fields. Need \'action\' and \'channel\'');
      return;
    }

    // Check if action is allowed
    const allowedActions = ['postMessage', 'updateMessage', 'deleteMessage', 'postCodeBlock'];
    if (!allowedActions.includes(action)) {
      res.send(`❌ Action '${action}' not allowed. Allowed: ${allowedActions.join(', ')}`);
      return;
    }

    let result;
    
    switch (action) {
    case 'postMessage':
      if (!text && (!blocks || blocks.length === 0)) {
        res.send('❌ Missing \'text\' or \'blocks\' for postMessage');
        return;
      }
        
      result = await slack.chat.postMessage({
        channel,
        text: text || '',
        blocks: blocks || undefined,
        username: 'Cursor Editor',
        icon_emoji: ':cursor:'
      });
        
      break;
        
    case 'postCodeBlock':
      if (!text) {
        res.send('❌ Missing \'text\' for postCodeBlock');
        return;
      }
        
      const codeBlocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Cursor Code Block*\n${context ? `*Context:* ${context}\n` : ''}\`\`\`\n${text}\n\`\`\``
          }
        }
      ];
        
      result = await slack.chat.postMessage({
        channel,
        text: `Cursor Code Block: ${text.substring(0, 100)}...`,
        blocks: codeBlocks,
        username: 'Cursor Editor',
        icon_emoji: ':cursor:'
      });
        
      break;
        
    case 'updateMessage':
      if (!ts) {
        res.send('❌ Missing \'ts\' (timestamp) for updateMessage');
        return;
      }
        
      if (!text && (!blocks || blocks.length === 0)) {
        res.send('❌ Missing \'text\' or \'blocks\' for updateMessage');
        return;
      }
        
      result = await slack.chat.update({
        channel,
        ts,
        text: text || '',
        blocks: blocks || undefined
      });
        
      break;
        
    case 'deleteMessage':
      if (!ts) {
        res.send('❌ Missing \'ts\' (timestamp) for deleteMessage');
        return;
      }
        
      result = await slack.chat.delete({
        channel,
        ts
      });
        
      break;
        
    default:
      res.send(`❌ Unknown action: ${action}`);
      return;
    }

    // Log the dispatch
    await stateManager.updateState({
      lastCursorSlackDispatch: {
        action,
        channel,
        requestedBy: user_name,
        timestamp: new Date().toISOString(),
        success: true,
        result,
        context: context || null
      }
    });

    const response = `
✅ *Cursor Slack Dispatch Successful*

*Action:* ${action}
*Channel:* ${channel}
*Requested By:* ${user_name}
*Timestamp:* ${new Date().toLocaleString()}
${context ? `*Context:* ${context}` : ''}

*Result:* ${result.ok ? '✅ Success' : '❌ Failed'}
${result.ts ? `*Message TS:* ${result.ts}` : ''}
${result.channel ? `*Channel ID:* ${result.channel}` : ''}

*Next:* Monitor with \`/status-runner\`
    `.trim();

    res.send(response);
  } catch (error) {
    console.error('Error in Cursor Slack dispatch:', error);
    
    // Log the failed dispatch
    await stateManager.updateState({
      lastCursorSlackDispatch: {
        action: action || 'unknown',
        channel: channel || 'unknown',
        requestedBy: user_name,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      }
    });
    
    res.send(`❌ Error in Cursor Slack dispatch: ${error.message}`);
  }
}; 