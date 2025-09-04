#!/usr/bin/env node
const { SlackCommandHandler } = require('../handlers/slackCommands');

// Export the router function
module.exports = function(express) {
  const router = express.Router();

  // Initialize Slack command handler
  const slackHandler = new SlackCommandHandler(process.env.SLACK_BOT_TOKEN || '');

  // Middleware to verify Slack requests (basic implementation)
  const verifySlackRequest = (req, res, next) => {
    // In production, implement proper Slack signature verification
    // For now, just check if it's a POST request
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    next();
  };

  // Handle /patch new command
  router.post('/patch-new', verifySlackRequest, async (req, res) => {
    try {
      const { text, channel_id, user_id, user_name } = req.body;
      
      if (!text || !channel_id || !user_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const response = await slackHandler.handlePatchNew(text, channel_id, user_name || user_id);
      
      res.json({
        response_type: 'in_channel',
        text: response
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error handling /patch new:', err);
      res.status(500).json({
        response_type: 'ephemeral',
        text: `❌ Internal error: ${errorMessage}`
      });
    }
  });

  // Handle /ask command
  router.post('/ask', verifySlackRequest, async (req, res) => {
    try {
      const { text, channel_id, user_id, user_name } = req.body;
      
      if (!text || !channel_id || !user_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const response = await slackHandler.handleAsk(text, channel_id, user_name || user_id);
      
      res.json({
        response_type: 'in_channel',
        text: response
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error handling /ask:', err);
      res.status(500).json({
        response_type: 'ephemeral',
        text: `❌ Internal error: ${errorMessage}`
      });
    }
  });

  // Handle /help command
  router.post('/help', verifySlackRequest, async (req, res) => {
    try {
      const response = await slackHandler.handleHelp();
      
      res.json({
        response_type: 'ephemeral',
        text: response
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error handling /help:', err);
      res.status(500).json({
        response_type: 'ephemeral',
        text: `❌ Internal error: ${errorMessage}`
      });
    }
  });

  // Health check endpoint for Slack integration
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      commands: ['/patch new', '/ask', '/help'],
      version: 'v2.3.58'
    });
  });

  return router;
};
