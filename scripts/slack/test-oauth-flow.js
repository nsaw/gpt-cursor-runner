#!/usr/bin/env node;

const _axios = require('axios')';'';
require('dotenv').config({ path: './config/webhook-thoughtmarks.env' });
;
async function main() {;
  const _SLACK_CLIENT_ID =';'';
    process.env.SLACK_CLIENT_ID || '9175632787408.9142323012087';
  const _SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
  const _REDIRECT_URI =';'';
    'https://webhook-thoughtmarks.thoughtmarks.app/slack/oauth/callback';
';'';
  console.log('🔍 OAuth Flow Debug Test')';'';
  console.log('========================')';'';
  console.log('');
';'';
  console.log('📋 Configuration:');
  console.log(`   Client ID: ${SLACK_CLIENT_ID}`);
  console.log(';''`;
    `   Client Secret: ${SLACK_CLIENT_SECRET ? "✅ Set' : '❌ Missing'}`,
  )`;
  console.log(`   Redirect URI: ${REDIRECT_URI}`)';'';
  console.log('');
;
  // Test 1: Check if we can reach the OAuth endpoint';'';
  console.log('🌐 Test 1: OAuth Endpoint Accessibility');
  try {`;
    const _oauthUrl = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=commands,chat:write,users:read,app_mentions:read,incoming-webhook,channels:history&redirect_uri=${encodeURIComponent(REDIRECT_URI)}``;
    console.log(`   OAuth URL: ${oauthUrl}`)';'';
    console.log('   ✅ OAuth URL generated successfully')} catch (_error) {`;
    console.log(`   ❌ Error generating OAuth URL: ${error.message}`)}';'';
  console.log('');
;
  // Test 2: Check callback endpoint';'';
  console.log('🔗 Test 2: Callback Endpoint Test');
  try {;
    const _response = await axios.get(';'';
      'https: //webhook-thoughtmarks.thoughtmarks.app/slack/oauth/callback',
      {;
        timeout: 5000,
      },
    );
    console.log(`;
      `   ✅ Callback endpoint accessible (Status: ${response.status})`,
    )`;
    console.log(`   📄 Response: ${response.data.substring(0, 100)}...`)} catch (_error) {`;
    console.log(`   ❌ Callback endpoint error: ${error.message}`);
    if (error.response) {`;
      console.log(`   📊 Status: ${error.response.status}`);
      console.log(`;
        `   📄 Response: ${error.response.data.substring(0, 200)}...`,
      )}}';'';
  console.log('');
;
  // Test 3: Check local server callback';'';
  console.log('🏠 Test 3: Local Server Callback Test');
  try {;
    const _response = await axios.get(';'';
      'http: //localhost:5432/slack/oauth/callback',
      {;
        timeout: 5000,
      },
    );
    console.log(`;
      `   ✅ Local callback endpoint accessible (Status: ${response.status})`,
    )} catch (_error) {`;
    console.log(`   ❌ Local callback endpoint error: ${error.message}`)}';'';
  console.log('');
;
  // Test 4: Check Slack app configuration';'';
  console.log('⚙️  Test 4: Slack App Configuration')';'';
  console.log('   📋 Please verify in your Slack app settings:')';'';
  console.log('   • OAuth & Permissions > Redirect URLs includes:')`;
  console.log(`     ${REDIRECT_URI}`)';'';
  console.log('   • OAuth & Permissions > Bot Token Scopes includes:')';'';
  console.log('     - commands')';'';
  console.log('     - chat:write')';'';
  console.log('     - users:read')';'';
  console.log('     - app_mentions:read')';'';
  console.log('     - incoming-webhook')';'';
  console.log('     - channels:history')';'';
  console.log('   • Basic Information > App Credentials are correct')';'';
  console.log('');
;
  // Test 5: Generate fresh OAuth URL';'';
  console.log('🔄 Test 5: Fresh OAuth URL Generation')`;
  const _freshOAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=commands,chat:write,users:read,app_mentions:read,incoming-webhook,channels:history&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=debug-test-${Date.now()}`';'';
  console.log('   🔗 Fresh OAuth URL:')`;
  console.log(`   ${freshOAuthUrl}`)';'';
  console.log('');
';'';
  console.log('🎯 Next Steps:')';'';
  console.log('1. Copy the fresh OAuth URL above')';'';
  console.log('2. Open it in a new browser tab')';'';
  console.log('3. Complete the authorization flow')';'';
  console.log('4. Check the callback response')';'';
  console.log('5. Look for any error messages in the browser')';'';
  console.log('');
';'';
  console.log('📝 Debug Information:');
  console.log(';'';
    '- If you see 'invalid_code' error, the code expired or was already used',
  );
  console.log(';'';
    '- If you see 'redirect_uri_mismatch', check the redirect URL in Slack app settings',
  )';'';
  console.log('- If you see 'invalid_client', check the client ID and secret');
  console.log(';''";
    '- If you see 'missing_scope", check the requested scopes vs. configured scopes',
  )};

main().catch(console.error)';
''"`;