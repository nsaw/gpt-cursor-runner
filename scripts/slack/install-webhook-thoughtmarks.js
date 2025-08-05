#!/usr/bin/env node

/**
 * Webhook-Thoughtmarks Slack App Installation Script
 * 
 * This script helps install the webhook-thoughtmarks Slack app to a workspace
 * using the Slack OAuth API. It handles the OAuth flow and provides the
 * necessary tokens for the app to function.
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: './config/webhook-thoughtmarks.env' });

const app = express();
const PORT = 3000;

// Slack OAuth configuration
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '9175632787408.9142323012087';
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SLACK_REDIRECT_URI = 'https://webhook-thoughtmarks.thoughtmarks.app/slack/oauth/callback';

// Scopes required for the app
const REQUIRED_SCOPES = [
  'commands',
  'chat:write',
  'users:read',
  'app_mentions:read',
  'incoming-webhook',
  'channels:history'
].join(',');

// Store installation state
let installationState = {
  code: null,
  accessToken: null,
  botUserId: null,
  teamId: null,
  teamName: null
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve installation page
app.get('/', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Webhook-Thoughtmarks Slack App Installation</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .container { background: #f5f5f5; padding: 30px; border-radius: 8px; }
        .button { background: #4A154B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
        .status { margin: 20px 0; padding: 15px; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 Webhook-Thoughtmarks Slack App Installation</h1>
        
        <p>This will install the webhook-thoughtmarks Slack app to your workspace, enabling all 25 slash commands for controlling the GPT-Cursor automation system.</p>
        
        <h3>Required Permissions:</h3>
        <ul>
          <li><strong>Slash Commands</strong> - Execute commands like /dashboard, /status-webhook-thoughtmarks</li>
          <li><strong>Send Messages</strong> - Post responses and notifications</li>
          <li><strong>Read User Info</strong> - Identify command users</li>
          <li><strong>Read Channel Messages</strong> - Process app mentions and interactions</li>
          <li><strong>Incoming Webhooks</strong> - Send notifications to channels</li>
        </ul>
        
        <h3>Installation Steps:</h3>
        <ol>
          <li>Click the "Install to Slack" button below</li>
          <li>Authorize the app in Slack</li>
          <li>Copy the provided tokens to your environment file</li>
          <li>Restart the webhook-thoughtmarks server</li>
        </ol>
        
        <a href="https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=${REQUIRED_SCOPES}&redirect_uri=${encodeURIComponent(SLACK_REDIRECT_URI)}" class="button">
          🚀 Install to Slack
        </a>
        
        <div id="status"></div>
        
        <h3>Manual Installation URL:</h3>
        <p>If the button doesn't work, use this URL:</p>
        <pre>https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=${REQUIRED_SCOPES}&redirect_uri=${encodeURIComponent(SLACK_REDIRECT_URI)}</pre>
        
        <h3>Current Configuration:</h3>
        <ul>
          <li><strong>Client ID:</strong> ${SLACK_CLIENT_ID}</li>
          <li><strong>Redirect URI:</strong> ${SLACK_REDIRECT_URI}</li>
          <li><strong>Required Scopes:</strong> ${REQUIRED_SCOPES}</li>
        </ul>
      </div>
      
      <script>
        // Check for installation status
        fetch('/status')
          .then(response => response.json())
          .then(data => {
            if (data.installed) {
              document.getElementById('status').innerHTML = 
                '<div class="status success"><h3>✅ Installation Complete!</h3>' +
                '<p><strong>Team:</strong> ' + data.teamName + '</p>' +
                '<p><strong>Bot User ID:</strong> ' + data.botUserId + '</p>' +
                '<p><strong>Access Token:</strong> ' + data.accessToken.substring(0, 20) + '...</p>' +
                '<p>Please copy the access token to your environment file and restart the server.</p></div>';
            }
          })
          .catch(error => console.log('No installation status available'));
      </script>
    </body>
    </html>
  `;
  res.send(html);
});

// OAuth callback endpoint
app.get('/slack/oauth/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }
  
  try {
    console.log('[INSTALL] Received OAuth code, exchanging for access token...');
    
    // Exchange code for access token
    const tokenResponse = await axios.post('https://slack.com/api/oauth.v2.access', {
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      code: code,
      redirect_uri: SLACK_REDIRECT_URI
    });
    
    const { ok, access_token, bot_user_id, team } = tokenResponse.data;
    
    if (!ok) {
      console.error('[INSTALL] OAuth exchange failed:', tokenResponse.data);
      return res.status(400).json({ error: 'OAuth exchange failed', details: tokenResponse.data });
    }
    
    // Store installation data
    installationState = {
      code,
      accessToken: access_token,
      botUserId: bot_user_id,
      teamId: team.id,
      teamName: team.name
    };
    
    console.log('[INSTALL] ✅ Successfully installed to team:', team.name);
    console.log('[INSTALL] Bot User ID:', bot_user_id);
    console.log('[INSTALL] Access Token:', access_token.substring(0, 20) + '...');
    
    // Update environment file with new token
    await updateEnvironmentFile(access_token);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Installation Complete</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .token { background: #f8f9fa; padding: 15px; border-radius: 4px; font-family: monospace; word-break: break-all; }
          .button { background: #4A154B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>✅ Installation Complete!</h1>
          <p><strong>Team:</strong> ${team.name}</p>
          <p><strong>Bot User ID:</strong> ${bot_user_id}</p>
          <p><strong>Access Token:</strong></p>
          <div class="token">${access_token}</div>
          <p>The access token has been automatically saved to your environment file.</p>
          <p>You can now restart the webhook-thoughtmarks server to use the new installation.</p>
          <a href="/" class="button">← Back to Installation Page</a>
        </div>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('[INSTALL] Error during OAuth exchange:', error.message);
    res.status(500).json({ error: 'Installation failed', details: error.message });
  }
});

// Status endpoint
app.get('/status', (req, res) => {
  if (installationState.accessToken) {
    res.json({
      installed: true,
      teamName: installationState.teamName,
      botUserId: installationState.botUserId,
      accessToken: installationState.accessToken
    });
  } else {
    res.json({ installed: false });
  }
});

// Update environment file with new token
async function updateEnvironmentFile(accessToken) {
  try {
    const envPath = path.join(__dirname, '..', 'config', 'webhook-thoughtmarks.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update or add the bot token
    if (envContent.includes('SLACK_BOT_TOKEN=')) {
      envContent = envContent.replace(/SLACK_BOT_TOKEN=.*/g, `SLACK_BOT_TOKEN=${accessToken}`);
    } else {
      envContent += `\nSLACK_BOT_TOKEN=${accessToken}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('[INSTALL] ✅ Updated environment file with new bot token');
    
  } catch (error) {
    console.error('[INSTALL] Error updating environment file:', error.message);
  }
}

// Test the installation
app.get('/test', async (req, res) => {
  if (!installationState.accessToken) {
    return res.json({ error: 'No installation found. Please install the app first.' });
  }
  
  try {
    // Test the bot token by calling auth.test
    const testResponse = await axios.post('https://slack.com/api/auth.test', {}, {
      headers: {
        'Authorization': `Bearer ${installationState.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (testResponse.data.ok) {
      res.json({
        success: true,
        bot: testResponse.data.bot_id,
        user: testResponse.data.user_id,
        team: testResponse.data.team_id,
        teamName: testResponse.data.team
      });
    } else {
      res.json({ error: 'Token test failed', details: testResponse.data });
    }
    
  } catch (error) {
    res.json({ error: 'Test failed', details: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`[INSTALL] 🚀 Installation server running on http://localhost:${PORT}`);
  console.log(`[INSTALL] 📋 Open this URL in your browser to install the app`);
  console.log(`[INSTALL] 🔗 OAuth Redirect URI: ${SLACK_REDIRECT_URI}`);
  console.log(`[INSTALL] 🆔 Client ID: ${SLACK_CLIENT_ID}`);
});

module.exports = app; 