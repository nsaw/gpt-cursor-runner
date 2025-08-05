#!/usr/bin/env node

require('dotenv').config({ path: './config/webhook-thoughtmarks.env' });

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '9175632787408.9142323012087';
const REDIRECT_URI = 'https://webhook-thoughtmarks.thoughtmarks.app/slack/oauth/callback';

// Only the scopes that are actually configured in the Slack app
// Based on what you showed me in the OAuth & Permissions section
const VALID_SCOPES = [
  'commands',
  'chat:write', 
  'incoming-webhook',
  'assistant:write'
].join(',');

console.log('🔗 Creating Corrected OAuth URL');
console.log('================================');
console.log('');

console.log('📋 App Configuration:');
console.log(`   Client ID: ${SLACK_CLIENT_ID}`);
console.log(`   Redirect URI: ${REDIRECT_URI}`);
console.log(`   Valid Scopes: ${VALID_SCOPES}`);
console.log('');

console.log('⚠️  Note: Using only the scopes that are actually configured in the Slack app');
console.log('   This should resolve the "invalid_scope" error');
console.log('');

// Generate the OAuth URL with only valid scopes
const oauthUrl = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=${VALID_SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=corrected-install-${Date.now()}`;

console.log('🚀 Corrected OAuth URL:');
console.log('========================');
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
console.log('🔧 What Changed:');
console.log('   • Removed admin scopes that may not be valid');
console.log('   • Using only the core scopes that are configured');
console.log('   • This should resolve the "invalid_scope" error');
console.log('');
console.log('📊 Expected Scopes After Installation:');
console.log('   • commands - For slash commands');
console.log('   • chat:write - For sending messages');
console.log('   • incoming-webhook - For webhook posting');
console.log('   • assistant:write - For app agent functionality'); 