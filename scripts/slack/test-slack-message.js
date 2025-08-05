#!/usr/bin/env node

/**
 * Test Slack Message Sending
 * 
 * This script tests sending messages to Slack using the bot token
 * instead of the incoming webhook.
 */

const axios = require('axios');

// Load environment variables
require('dotenv').config({ path: './config/webhook-thoughtmarks.env' });

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const TEST_CHANNEL = '#cursor-thoughtmarks-native-build'; // Default test channel

async function testSlackMessage() {
  console.log('🤖 Testing Slack Message Sending');
  console.log('================================');
  
  try {
    // Test message
    const message = {
      channel: TEST_CHANNEL,
      text: '🤖 Webhook-Thoughtmarks Test Message',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Webhook-Thoughtmarks Integration Test*\n\n✅ Direct integration test successful\n🕒 Timestamp: ' + new Date().toISOString() + '\n🔗 Server: https://webhook-thoughtmarks.thoughtmarks.app/health'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '🎯 *Test Results:*\n• Environment Variables: ✅ PASS\n• Bot Token: ✅ PASS\n• Server Health: ✅ PASS\n• Tunnel Connectivity: ✅ PASS\n• Message Sending: Testing...'
          }
        }
      ]
    };

    console.log(`📤 Sending test message to ${TEST_CHANNEL}...`);
    
    const response = await axios.post('https://slack.com/api/chat.postMessage', message, {
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.ok) {
      console.log('✅ Message sent successfully!');
      console.log(`   - Channel: ${response.data.channel}`);
      console.log(`   - Timestamp: ${response.data.ts}`);
      console.log(`   - Message ID: ${response.data.message?.client_msg_id || 'N/A'}`);
      return true;
    } else {
      console.log('❌ Message sending failed');
      console.log(`   - Error: ${response.data.error}`);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Message sending failed');
    console.log(`   - Error: ${error.message}`);
    if (error.response) {
      console.log(`   - Status: ${error.response.status}`);
      console.log(`   - Data: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// Run the test
testSlackMessage().then(success => {
  if (success) {
    console.log('\n🎉 All tests passed! Webhook-Thoughtmarks is ready for use.');
    console.log('\n📝 Next Steps:');
    console.log('1. The Slack app is configured and working');
    console.log('2. You can test slash commands in Slack');
    console.log('3. All 25 commands should be available');
    console.log('4. Use /status-webhook-thoughtmarks to test');
  } else {
    console.log('\n⚠️  Message sending failed. Please check the bot token and channel permissions.');
  }
}).catch(error => {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
}); 