#!/usr/bin/env node

require('dotenv').config({ path: './config/webhook-thoughtmarks.env' });

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '9175632787408.9142323012087';
const REDIRECT_URI = 'https://webhook-thoughtmarks.thoughtmarks.app/slack/oauth/callback';

// All required scopes for webhook-thoughtmarks functionality
const REQUIRED_SCOPES = [
  'commands',
  'chat:write',
  'users:read',
  'app_mentions:read',
  'incoming-webhook',
  'channels:history',
  'chat:write.customize',
  'assistant:write'
].join(',');

const oauthUrl = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=${REQUIRED_SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=webhook-thoughtmarks-install-${Date.now()}`;

console.log('🔗 Fresh OAuth URL with All Required Scopes:');
console.log('');
console.log(oauthUrl);
console.log('');
console.log('📋 Scopes included:');
REQUIRED_SCOPES.split(',').forEach(scope => {
  console.log(`   • ${scope}`);
});
console.log('');
console.log('🎯 Instructions:');
console.log('1. Copy the URL above');
console.log('2. Open it in a new browser tab');
console.log('3. Complete the OAuth authorization');
console.log('4. The app should redirect to the callback endpoint');
console.log('5. Check for success message or error details'); 