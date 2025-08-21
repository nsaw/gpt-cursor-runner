// Webhook handler for GitHub-based Slack integration
const express = require('express');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Verify GitHub webhook signature
function verifyGitHubWebhook(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  
  if (!signature || !secret) {
    return res.status(401).json({ error: 'Missing signature or secret' });
  }
  
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`;
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
}

// GitHub webhook endpoint
app.post('/github/webhook', verifyGitHubWebhook, (req, res) => {
  const { action, repository, _sender } = req.body;
  
  console.log(`GitHub webhook received: ${action} on ${repository?.full_name}`);
  
  // Handle different GitHub events
  switch (req.headers['x-github-event']) {
  case 'push':
    handlePushEvent(req.body);
    break;
  case 'pull_request':
    handlePullRequestEvent(req.body);
    break;
  case 'issues':
    handleIssuesEvent(req.body);
    break;
  default:
    console.log(`Unhandled event: ${req.headers['x-github-event']}`);
  }
  
  res.status(200).json({ received: true });
});

// Slack webhook endpoint
app.post('/slack/webhook', (req, res) => {
  const { type, event } = req.body;
  
  console.log(`Slack webhook received: ${type}`);
  
  // Handle Slack events
  switch (type) {
  case 'url_verification':
    res.json({ challenge: req.body.challenge });
    break;
  case 'event_callback':
    handleSlackEvent(event);
    res.json({ ok: true });
    break;
  default:
    res.json({ ok: true });
  }
});

// Slack slash command endpoint
app.post('/slack/commands', (req, res) => {
  const { command, text, user_id, _channel_id } = req.body;
  
  console.log(`Slack command received: ${command} from ${user_id}`);
  
  // Handle different slash commands
  switch (command) {
  case '/status-runner':
    res.json({
      response_type: 'in_channel',
      text: '🟢 Runner is operational and healthy!'
    });
    break;
  case '/dashboard':
    res.json({
      response_type: 'in_channel',
      text: '📊 Dashboard: https://your-username.github.io/gpt-cursor-runner/'
    });
    break;
  default:
    res.json({
      response_type: 'in_channel',
      text: `Command "${command}" received with text: "${text}"`
    });
  }
});

// Event handlers
function handlePushEvent(data) {
  const { ref, commits, repository } = data;
  console.log(`Push to ${ref} in ${repository.full_name}`);
  
  // You can add Slack notifications here
  if (commits && commits.length > 0) {
    console.log(`Latest commit: ${commits[0].message}`);
  }
}

function handlePullRequestEvent(data) {
  const { action, pull_request, repository } = data;
  console.log(`PR ${action}: ${pull_request.title} in ${repository.full_name}`);
}

function handleIssuesEvent(data) {
  const { action, issue, repository } = data;
  console.log(`Issue ${action}: ${issue.title} in ${repository.full_name}`);
}

function handleSlackEvent(event) {
  console.log(`Slack event: ${event.type}`);
  
  switch (event.type) {
  case 'app_mention':
    console.log(`Bot mentioned: ${event.text}`);
    break;
  case 'message':
    console.log(`Message in ${event.channel}: ${event.text}`);
    break;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'GitHub Webhook Handler',
    endpoints: {
      github: '/github/webhook',
      slack: '/slack/webhook',
      commands: '/slack/commands'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GitHub Webhook Handler running on port ${PORT}`);
  console.log(`📡 GitHub webhook: http://localhost:${PORT}/github/webhook`);
  console.log(`📡 Slack webhook: http://localhost:${PORT}/slack/webhook`);
  console.log(`📡 Slack commands: http://localhost:${PORT}/slack/commands`);
});

module.exports = app; 
