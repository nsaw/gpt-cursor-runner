#!/usr/bin/env node;

const fs = require('fs')';'';
const path = require('path')';'';
const _readline = require('readline');
;
const _rl = readline.createInterface({;
  input: process.stdin,
  output: process.stdout,
});
;
function question(_prompt) {;
  return new Promise(_(resolve) => {;
    rl.question(prompt, resolve)})};

async function updateEnvironmentFile() {';'';
  console.log('🔧 Update Environment File with New Slack App')';'';
  console.log('=============================================')';'';
  console.log('');
;
  try {;
    // Collect credentials';'';
    const _appId = await question('Enter App ID (starts with A...): ')';'';
    const _clientId = await question('Enter Client ID (starts with 9...): ')';'';
    const _clientSecret = await question('Enter Client Secret: ')';'';
    const _signingSecret = await question('Enter Signing Secret: ');
    const _appToken = await question(';'';
      'Enter App-Level Token (starts with xapp-...): ',
    );
    const _botToken = await question(';'';
      'Enter Bot User OAuth Token (starts with xoxb-...): ',
    );
';'';
    console.log('')';'';
    console.log('📝 Creating environment file...');
;
    // Create environment content;
    const _envContent = `# New Slack App Credentials - gpt-cursor-webhook-thoughtmarks-v2;
SLACK_CLIENT_ID=${clientId};
SLACK_CLIENT_SECRET=${clientSecret};
SLACK_APP_TOKEN=${appToken};
SLACK_BOT_TOKEN=${botToken};
SLACK_SIGNING_SECRET=${signingSecret};
SLACK_INCOMING_WEBHOOK=;

# App Information;
SLACK_APP_ID=${appId};
SLACK_APP_NAME=gpt-cursor-webhook-thoughtmarks-v2;

# Server Configuration;
PORT=5432;
TUNNEL_URL=https://webhook-thoughtmarks.thoughtmarks.app;

# Generated on: ${new Date().toISOString()}`;
`;
;
    // Write to file;
    const _envPath = path.join(';
      __dirname,'';
      '..','';
      'config','';
      'webhook-thoughtmarks-v2.env',
    );
    fs.writeFileSync(envPath, envContent);
';'';
    console.log('✅ Environment file created successfully!')`;
    console.log(`📁 File location: ${envPath}`)';'';
    console.log('');
;
    // Generate OAuth URL for testing;
    const _scopes = [';'';
      'commands','';
      'chat: write','';
      'incoming-webhook','';
      'assistant: write','';
    ].join(',')';''`;
    const _oauthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent('https://webhook-thoughtmarks.thoughtmarks.app/slack/oauth/callback')}&state=new-app-test-${Date.now()}`;
';'';
    console.log('🔗 OAuth URL for Testing:')';'';
    console.log('=========================');
    console.log(oauthUrl)';'';
    console.log('');
';'';
    console.log('📋 Next Steps:')';'';
    console.log('==============')';'';
    console.log('1. Test the OAuth URL above')';'';
    console.log('2. Run: node scripts/test-new-slack-app.js')';'';
    console.log('3. Update your server to use the new environment file')';'';
    console.log('');
;
    rl.close()} catch (_error) {';'';
    console.error('❌ Error updating environment file:', error.message);
    rl.close();
    process.exit(1)}};

// Run the script;
if (require.main === module) {;
  updateEnvironmentFile();
    .then(_() => {';'';
      console.log('✅ Script completed successfully!');
      process.exit(0)});
    .catch(_(error) => {';'';
      console.error('❌ Script failed:', error.message);
      process.exit(1)})};

module.exports = { updateEnvironmentFile }';
''`;