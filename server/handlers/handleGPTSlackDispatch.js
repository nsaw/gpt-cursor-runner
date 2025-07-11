const { WebClient } = require('@slack/web-api');
const stateManager = require('../utils/stateManager');

// Initialize Slack Web API client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

module.exports = async function handleGPTSlackDispatch(req, res) {
  const fs = require('fs');
  const log = (msg) => fs.appendFileSync('logs/ghost-dispatch.log', `[${new Date().toISOString()}] ${msg}\n`);
  
  const { user_name, text } = req.body;
  console.log('⚡️ /gpt-slack-dispatch triggered by:', user_name, 'with text:', text);
  log(`GHOST Dispatch triggered by: ${user_name} with text: ${text}`);
  
  try {
    // Additional crash protection
    if (!req || !res) {
      console.error('❌ Invalid request/response objects');
      return;
    }
    // Parse the GPT dispatch request
    let dispatchRequest;
    try {
      console.log('🔍 Attempting to parse JSON:', text);
      console.log('🔍 Text type:', typeof text);
      console.log('🔍 Text length:', text.length);
      dispatchRequest = JSON.parse(text);
      console.log('✅ JSON parsed successfully:', dispatchRequest);
    } catch (error) {
      console.error('❌ JSON parse error:', error.message);
      console.error('❌ Raw text:', text);
      res.send('❌ Invalid JSON format. Expected: {"action": "slack.postMessage", "channel": "#channel", "text": "message"}');
      return;
    }

    const { action, channel, blocks, text, ts } = dispatchRequest;
    
    // Validate required fields
    if (!action || !channel) {
      res.send('❌ Missing required fields. Need \'action\' and \'channel\'');
      return;
    }

    // Check if action is allowed
    const allowedActions = ['postMessage', 'updateMessage', 'deleteMessage'];
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
        channel: channel,
        text: text || '',
        blocks: blocks || undefined,
        username: 'GPT-Cursor Runner',
        icon_emoji: ':robot_face:'
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
        channel: channel,
        ts: ts,
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
        channel: channel,
        ts: ts
      });
        
      break;
        
    default:
      res.send(`❌ Unknown action: ${action}`);
      return;
    }

    // Log the dispatch
    await stateManager.updateState({
      lastGPTSlackDispatch: {
        action: action,
        channel: channel,
        requestedBy: user_name,
        timestamp: new Date().toISOString(),
        success: true,
        result: result
      }
    });

    const response = `
✅ *GPT Slack Dispatch Successful*

*Action:* ${action}
*Channel:* ${channel}
*Requested By:* ${user_name}
*Timestamp:* ${new Date().toLocaleString()}

*Result:* ${result.ok ? '✅ Success' : '❌ Failed'}
${result.ts ? `*Message TS:* ${result.ts}` : ''}
${result.channel ? `*Channel ID:* ${result.channel}` : ''}

*Next:* Monitor with \`/status-runner\`
    `.trim();

    log(`Slack Dispatch Response: ${response}`);
    res.send(response);
  } catch (error) {
    console.error('Error in GPT Slack dispatch:', error);
    
    // Log the failed dispatch
    await stateManager.updateState({
      lastGPTSlackDispatch: {
        action: action || 'unknown',
        channel: channel || 'unknown',
        requestedBy: user_name,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      }
    });
    
    log(`Slack Dispatch Error: ${error.message}`);
    res.send(`❌ Error in GPT Slack dispatch: ${error.message}`);
  }
}; 