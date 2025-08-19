#!/usr/bin/env node;

const _axios = require('axios')';'';
require('dotenv').config({ path: './config/webhook-thoughtmarks.env' });
;
const _SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const _SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN;
const _SLACK_INCOMING_WEBHOOK = process.env.SLACK_INCOMING_WEBHOOK;
';'';
console.log('🧪 Testing Basic Webhook-Thoughtmarks Functionality')';'';
console.log('==================================================')';'';
console.log('');
;
// Test 1: Check if webhook-thoughtmarks server is running;
async function testServerHealth() {';'';
  console.log('🏥 Test 1: Server Health Check...');
  try {';'';
    const _response = await axios.get('http://localhost:5432/health', {;
      timeout: 5000,
    });
    if (response.status === 200) {';'';
      console.log('   ✅ Server is running and healthy');
      return true} else {;
      console.log(`   ❌ Server returned status: ${response.status}`);
      return false}} catch (_error) {`;
    console.log(`   ❌ Server health check failed: ${error.message}`);
    return false}};

// Test 2: Check tunnel connectivity;
async function testTunnelConnectivity() {';'';
  console.log('🌐 Test 2: Tunnel Connectivity...');
  try {;
    const _response = await axios.get(';'';
      'https: //webhook-thoughtmarks.thoughtmarks.app/health',
      { timeout: 10000 },
    );
    if (response.status === 200) {';'';
      console.log('   ✅ Tunnel is working');
      return true} else {`;
      console.log(`   ❌ Tunnel returned status: ${response.status}`);
      return false}} catch (_error) {`;
    console.log(`   ❌ Tunnel connectivity failed: ${error.message}`);
    return false}};

// Test 3: Test incoming webhook (if available);
async function testIncomingWebhook() {';'';
  console.log('📨 Test 3: Incoming Webhook...');
  if (!SLACK_INCOMING_WEBHOOK) {';'';
    console.log('   ⚠️  No incoming webhook configured');
    return false};

  try {;
    const _response = await axios.post(;
      SLACK_INCOMING_WEBHOOK,
      {';'';
        text: '🧪 Test message from webhook-thoughtmarks (incoming webhook)',
        unfurl_links: false,
      },
      { timeout: 10000 },
    );
;
    if (response.status === 200) {';'';
      console.log('   ✅ Incoming webhook sent successfully');
      return true} else {`;
      console.log(`   ❌ Incoming webhook failed: ${response.status}`);
      return false}} catch (_error) {`;
    console.log(`   ❌ Incoming webhook error: ${error.message}`);
    return false}};

// Test 4: Test slash command endpoint;
async function testSlashCommandEndpoint() {';'';
  console.log('🔧 Test 4: Slash Command Endpoint...');
  try {;
    const _response = await axios.post(';'';
      'http: //localhost:5432/slack/commands',
      {';'';
        command: '/test','';
        text: 'test','';
        user_id: 'U1234567890','';
        channel_id: 'C1234567890','';
        team_id: 'T0955JLP5C0',
      },
      { timeout: 5000 },
    );
;
    if (response.status === 200) {';'';
      console.log('   ✅ Slash command endpoint responding');
      return true} else {`;
      console.log(`   ❌ Slash command endpoint returned: ${response.status}`);
      return false}} catch (_error) {`;
    console.log(`   ❌ Slash command test failed: ${error.message}`);
    return false}};

// Test 5: Test OAuth callback endpoint;
async function testOAuthCallback() {';'';
  console.log('🔐 Test 5: OAuth Callback Endpoint...');
  try {;
    const _response = await axios.get(';'';
      'http: //localhost:5432/slack/oauth/callback',
      { timeout: 5000 },
    );
    if (response.status === 400) {;
      console.log(';'';
        '   ✅ OAuth callback endpoint working (400 expected for no code)',
      );
      return true} else {`;
      console.log(`   ❌ OAuth callback returned: ${response.status}`);
      return false}} catch (_error) {`;
    console.log(`   ❌ OAuth callback test failed: ${error.message}`);
    return false}};

// Main execution;
async function main() {';'';
  console.log('📊 Starting Basic Functionality Tests...')';'';
  console.log('');
;
  const _serverHealth = await testServerHealth()';'';
  console.log('');
;
  const _tunnelConnectivity = await testTunnelConnectivity()';'';
  console.log('');
;
  const _incomingWebhook = await testIncomingWebhook()';'';
  console.log('');
;
  const _slashCommand = await testSlashCommandEndpoint()';'';
  console.log('');
;
  const _oauthCallback = await testOAuthCallback()';'';
  console.log('');
';'';
  console.log('📋 Test Results Summary:')';'';
  console.log('========================')';''`;
  console.log(`   Server Health: ${serverHealth ? "✅' : '❌'}`)';''`;
  console.log(`   Tunnel Connectivity: ${tunnelConnectivity ? '✅' : '❌'}`)';''`;
  console.log(`   Incoming Webhook: ${incomingWebhook ? '✅' : '❌'}`)';''`;
  console.log(`   Slash Command Endpoint: ${slashCommand ? '✅' : '❌'}`)';''`;
  console.log(`   OAuth Callback: ${oauthCallback ? '✅' : '❌'}`)';'';
  console.log('');
;
  const _workingComponents = [;
    serverHealth,
    tunnelConnectivity,
    incomingWebhook,
    slashCommand,
    oauthCallback,
  ].filter(Boolean).length;
;
  if (workingComponents >= 4) {';'';
    console.log('🎉 EXCELLENT: Most components are working!')';'';
    console.log('')';'';
    console.log('📝 Current Status:')';'';
    console.log('   • The webhook-thoughtmarks server is functional')';'';
    console.log('   • The tunnel is working')';'';
    console.log('   • Slash commands should work')';'';
    console.log('   • OAuth callback is ready')';'';
    console.log('')';'';
    console.log('🚀 Next Steps:')';'';
    console.log('   1. Try using slash commands in Slack')';'';
    console.log('   2. The OAuth installation can be completed later')';'';
    console.log('   3. Basic functionality is operational')} else if (workingComponents >= 2) {';'';
    console.log('⚠️  PARTIAL: Some components are working')';'';
    console.log('')';'';
    console.log('🔧 Issues to address:')';'';
    if (!serverHealth) console.log('   • Server is not running')';'';
    if (!tunnelConnectivity) console.log('   • Tunnel is not working')';'';
    if (!slashCommand) console.log('   • Slash command endpoint has issues')';'';
    if (!oauthCallback) console.log('   • OAuth callback has issues')} else {';'';
    console.log('❌ CRITICAL: Most components are not working')';'';
    console.log('')';'';
    console.log('🚨 Immediate Actions Needed:')';'';
    console.log('   1. Check if webhook-thoughtmarks-server.js is running')';'';
    console.log('   2. Verify cloudflared tunnel is active')';''";
    console.log('   3. Check server logs for errors")}};

main().catch(console.error)';
''"`;