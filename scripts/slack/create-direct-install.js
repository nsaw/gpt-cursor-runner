#!/usr/bin/env node

require('dotenv').config({ path: './config/webhook-thoughtmarks.env' });

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '9175632787408.9142323012087';
const REDIRECT_URI = 'https://webhook-thoughtmarks.thoughtmarks.app/slack/oauth/callback';

// All the scopes that are configured in the Slack app
const ALL_SCOPES = [
  'commands',
  'chat:write', 
  'incoming-webhook',
  'assistant:write',
  'admin.app_activities:read',
  'admin.apps:write'
].join(',');

console.log('🔗 Creating Direct Installation URL');
console.log('===================================');
console.log('');

console.log('📋 App Configuration:');
console.log(`   Client ID: ${SLACK_CLIENT_ID}`);
console.log(`   Redirect URI: ${REDIRECT_URI}`);
console.log(`   Scopes: ${ALL_SCOPES}`);
console.log('');

// Generate the OAuth URL
const oauthUrl = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=${ALL_SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=direct-install-${Date.now()}`;

console.log('🚀 Direct Installation URL:');
console.log('============================');
console.log('');
console.log(oauthUrl);
console.log('');
console.log('📝 Instructions:');
console.log('   1. Copy the URL above');
console.log('   2. Open it in a new browser tab');
console.log('   3. Click "Allow" to install the app');
console.log('   4. The app should redirect to the callback');
console.log('   5. Check for success message');
console.log('');
console.log('🔧 If the installation fails:');
console.log('   • Check that the redirect URL matches exactly');
console.log('   • Verify all scopes are configured in Slack app');
console.log('   • Make sure the app is not already installed');
console.log('');
console.log('📊 Expected Flow:');
console.log('   1. Browser opens Slack authorization page');
console.log('   2. User sees app permissions and clicks "Allow"');
console.log('   3. Slack redirects to our callback with authorization code');
console.log('   4. Our server exchanges code for bot token');
console.log('   5. Bot token is saved to environment file');
console.log('   6. Success message is displayed'); 