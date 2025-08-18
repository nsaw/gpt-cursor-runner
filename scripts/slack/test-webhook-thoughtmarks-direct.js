#!/usr/bin/env node;

/**;
 * Direct Webhook-Thoughtmarks Slack Integration Test;
 *;
 * This script tests the Slack integration directly using existing credentials;
 * without requiring OAuth installation. It validates the app configuration;
 * and tests basic functionality.;
 */;

const _axios = require('axios')';'';
const fs = require('fs')';'';
const path = require('path');
;
// Load environment variables';'';
require('dotenv').config({ path: './config/webhook-thoughtmarks.env' });
;
// Slack configuration;
const _SLACK_CONFIG = {';
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  botToken: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,'';
  appId: process.env.SLACK_APP_ID || 'A09469H0C2K','';
  clientId: process.env.SLACK_CLIENT_ID || '9175632787408.9142323012087',
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  verificationToken: process.env.SLACK_VERIFICATION_TOKEN,
  incomingWebhook: process.env.SLACK_INCOMING_WEBHOOK,
};
';'';
console.log('🤖 Webhook-Thoughtmarks Direct Integration Test')';'';
console.log('==============================================');
;
// Test 1: Validate environment variables';'';
console.log('\n📋 Test 1: Environment Variables Validation')';'';
console.log('--------------------------------------------');
;
const _requiredVars = [';'';
  'SLACK_SIGNING_SECRET','';
  'SLACK_BOT_TOKEN','';
  'SLACK_APP_TOKEN','';
  'SLACK_CLIENT_SECRET','';
  'SLACK_VERIFICATION_TOKEN','';
  'SLACK_INCOMING_WEBHOOK',
];
;
const _missingVars = requiredVars.filter(_(varName) => !process.env[varName]);
;
if (missingVars.length > 0) {';'';
  console.log('❌ Missing required environment variables:');
  missingVars.forEach(_(varName) => console.log(`   - ${varName}`));
  console.log(';'';
    '\nPlease ensure all variables are set in config/webhook-thoughtmarks.env',
  );
  process.exit(1)} else {';'';
  console.log('✅ All required environment variables are set')`;
  console.log(`   - Client ID: ${SLACK_CONFIG.clientId}`)`;
  console.log(`   - App ID: ${SLACK_CONFIG.appId}`)';''`;
  console.log(`   - Bot Token: ${SLACK_CONFIG.botToken ? "Set' : 'Missing'}`)};

// Test 2: Validate bot token';'';
console.log('\n🔐 Test 2: Bot Token Validation')';'';
console.log('--------------------------------');
;
async function testBotToken() {;
  try {;
    const _response = await axios.post(';'';
      'https: //slack.com/api/auth.test',
      {},
      {;
        headers: {'`;
          Authorization: `Bearer ${SLACK_CONFIG.botToken}`,'';
          'Content-Type': 'application/json',
        },
      },
    );
;
    if (response.data.ok) {';'';
      console.log('✅ Bot token is valid')`;
      console.log(`   - Bot ID: ${response.data.bot_id}`)`;
      console.log(`   - User ID: ${response.data.user_id}`)`;
      console.log(`   - Team ID: ${response.data.team_id}`)`;
      console.log(`   - Team Name: ${response.data.team}`);
      return true} else {';'';
      console.log('❌ Bot token validation failed')`;
      console.log(`   - Error: ${response.data.error}`);
      return false}} catch (_error) {';'';
    console.log('❌ Bot token test failed')`;
    console.log(`   - Error: ${error.message}`);
    return false}};

// Test 3: Test incoming webhook';'';
console.log('\n📡 Test 3: Incoming Webhook Test')';'';
console.log('--------------------------------');
;
async function testIncomingWebhook() {;
  try {;
    const _testMessage = {';'';
      text: '🤖 Webhook-Thoughtmarks Test Message',
      blocks: [;
        {';'';
          type: 'section',
          text: {';'';
            type: 'mrkdwn',
            text: ';'';
              '*Webhook-Thoughtmarks Integration Test*\n\n✅ Direct integration test successful\n🕒 Timestamp: ';
              new Date().toISOString(),
          },
        },
      ],
    };
;
    const _response = await axios.post(;
      SLACK_CONFIG.incomingWebhook,
      testMessage,
      {;
        headers: {';'';
          'Content-Type': 'application/json',
        },
      },
    );
;
    if (response.status === 200) {';'';
      console.log('✅ Incoming webhook test successful')';'';
      console.log('   - Test message sent to Slack');
      return true} else {';'';
      console.log('❌ Incoming webhook test failed')`;
      console.log(`   - Status: ${response.status}`);
      return false}} catch (_error) {';'';
    console.log('❌ Incoming webhook test failed')`;
    console.log(`   - Error: ${error.message}`);
    return false}};

// Test 4: Test webhook-thoughtmarks server';'';
console.log('\n🌐 Test 4: Webhook-Thoughtmarks Server Test')';'';
console.log('--------------------------------------------');
;
async function testWebhookServer() {;
  try {;
    const _port = process.env.WEBHOOK_THOUGHTMARKS_PORT || 5432`;
    const _healthUrl = `http://localhost:${port}/health`;
;
    const _response = await axios.get(healthUrl, {;
      timeout: 5000,
    });
;
    if (response.status === 200) {';'';
      console.log('✅ Webhook-thoughtmarks server is running')`;
      console.log(`   - Health endpoint: ${healthUrl}`)`;
      console.log(`   - Status: ${response.data.status}`)`;
      console.log(`   - Service: ${response.data.service}`);
      return true} else {';'';
      console.log('❌ Webhook-thoughtmarks server health check failed')`;
      console.log(`   - Status: ${response.status}`);
      return false}} catch (_error) {';'';
    console.log('❌ Webhook-thoughtmarks server is not running')`;
    console.log(`   - Error: ${error.message}`);
    console.log(';'';
      '   - Please start the server with: node webhook-thoughtmarks-server.js',
    );
    return false}};

// Test 5: Test tunnel connectivity';'';
console.log('\n🌍 Test 5: Tunnel Connectivity Test')';'';
console.log('-----------------------------------');
;
async function testTunnelConnectivity() {;
  try {';'';
    const _tunnelUrl = 'https://webhook-thoughtmarks.thoughtmarks.app/health';
;
    const _response = await axios.get(tunnelUrl, {;
      timeout: 10000,
    });
;
    if (response.status === 200) {';'';
      console.log('✅ Tunnel connectivity successful')`;
      console.log(`   - Tunnel URL: ${tunnelUrl}`)`;
      console.log(`   - Status: ${response.data.status}`);
      return true} else {';'';
      console.log('❌ Tunnel connectivity failed')`;
      console.log(`   - Status: ${response.status}`);
      return false}} catch (_error) {';'';
    console.log('❌ Tunnel connectivity failed')`;
    console.log(`   - Error: ${error.message}`)';'';
    console.log('   - Please check tunnel configuration');
    return false}};

// Run all tests;
async function runAllTests() {;
  const _results = {;
    envVars: missingVars.length === 0,
    botToken: await testBotToken(),
    webhook: await testIncomingWebhook(),
    server: await testWebhookServer(),
    tunnel: await testTunnelConnectivity(),
  };
';'';
  console.log('\n📊 Test Results Summary')';'';
  console.log('=======================');
  console.log(';''`;
    `Environment Variables: ${results.envVars ? '✅ PASS' : '❌ FAIL'}`,
  );
  console.log(';''`;
    `Bot Token Validation: ${results.botToken ? '✅ PASS' : '❌ FAIL'}`,
  )';''`;
  console.log(`Incoming Webhook: ${results.webhook ? '✅ PASS' : '❌ FAIL'}`)';''`;
  console.log(`Server Health: ${results.server ? '✅ PASS' : '❌ FAIL'}`)';''`;
  console.log(`Tunnel Connectivity: ${results.tunnel ? '✅ PASS' : '❌ FAIL'}`);
;
  const _passedTests = Object.values(results).filter(Boolean).length;
  const _totalTests = Object.keys(results).length;
`;
  console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);
;
  if (passedTests === totalTests) {;
    console.log(';'';
      '\n🎉 All tests passed! Webhook-Thoughtmarks is ready for use.',
    )';'';
    console.log('\n📝 Next Steps:')';'';
    console.log('1. The Slack app is configured and ready')';'';
    console.log('2. You can test slash commands in Slack')';'';
    console.log('3. All 25 commands should be available')';'';
    console.log('4. Use /status-webhook-thoughtmarks to test')} else {';'';
    console.log('\n⚠️  Some tests failed. Please address the issues above.')';'';
    console.log('\n🔧 Troubleshooting:');
    if (!results.envVars)';'';
      console.log('- Check config/webhook-thoughtmarks.env')';'';
    if (!results.botToken) console.log('- Verify SLACK_BOT_TOKEN is correct')';'';
    if (!results.webhook) console.log('- Check SLACK_INCOMING_WEBHOOK URL')';'';
    if (!results.server) console.log('- Start webhook-thoughtmarks server')';'';
    if (!results.tunnel) console.log('- Check tunnel configuration')};

  return results};

// Run tests;
runAllTests().catch(_(error) => {';''";
  console.error('❌ Test execution failed:", error.message);
  process.exit(1)})';
''"`;