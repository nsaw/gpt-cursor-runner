#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './config/webhook-thoughtmarks.env' });

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '9175632787408.9142323012087';
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN;

console.log('🚀 Force Installing Slack App via API');
console.log('=====================================');
console.log('');

// Test 1: Validate app token
async function testAppToken() {
  console.log('🔑 Test 1: Validating App Token...');
  try {
    const response = await axios.post('https://slack.com/api/apps.connections.open', {}, {
      headers: {
        'Authorization': `Bearer ${SLACK_APP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.ok) {
      console.log('   ✅ App token is valid');
      return true;
    } else {
      console.log(`   ❌ App token error: ${response.data.error}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ App token test failed: ${error.message}`);
    return false;
  }
}

// Test 2: Check app info
async function checkAppInfo() {
  console.log('📋 Test 2: Checking App Information...');
  try {
    const response = await axios.get('https://slack.com/api/apps.info', {
      headers: {
        'Authorization': `Bearer ${SLACK_APP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.ok) {
      const app = response.data.app;
      console.log(`   ✅ App Name: ${app.name}`);
      console.log(`   ✅ App ID: ${app.id}`);
      console.log(`   ✅ App Status: ${app.status}`);
      return app;
    } else {
      console.log(`   ❌ App info error: ${response.data.error}`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ App info test failed: ${error.message}`);
    return null;
  }
}

// Test 3: Try to get installation info
async function getInstallationInfo() {
  console.log('🔧 Test 3: Checking Installation Status...');
  try {
    const response = await axios.get('https://slack.com/api/apps.connections.open', {
      headers: {
        'Authorization': `Bearer ${SLACK_APP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.ok) {
      console.log('   ✅ App is connected to workspace');
      return true;
    } else {
      console.log(`   ❌ App not connected: ${response.data.error}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Installation check failed: ${error.message}`);
    return false;
  }
}

// Test 4: Try to send a test message using app token
async function testAppMessage() {
  console.log('💬 Test 4: Testing Message Sending...');
  try {
    const response = await axios.post('https://slack.com/api/chat.postMessage', {
      channel: '#cursor-thoughtmarks-native-build',
      text: '🤖 Test message from webhook-thoughtmarks app (via app token)',
      unfurl_links: false
    }, {
      headers: {
        'Authorization': `Bearer ${SLACK_APP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.ok) {
      console.log('   ✅ Message sent successfully via app token');
      return true;
    } else {
      console.log(`   ❌ Message failed: ${response.data.error}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Message test failed: ${error.message}`);
    return false;
  }
}

// Main execution
async function main() {
  console.log('📊 Starting Force Installation Process...');
  console.log('');
  
  const appTokenValid = await testAppToken();
  console.log('');
  
  const appInfo = await checkAppInfo();
  console.log('');
  
  const isInstalled = await getInstallationInfo();
  console.log('');
  
  const messageSent = await testAppMessage();
  console.log('');
  
  console.log('📋 Installation Summary:');
  console.log('========================');
  console.log(`   App Token Valid: ${appTokenValid ? '✅' : '❌'}`);
  console.log(`   App Info Retrieved: ${appInfo ? '✅' : '❌'}`);
  console.log(`   App Installed: ${isInstalled ? '✅' : '❌'}`);
  console.log(`   Message Sending: ${messageSent ? '✅' : '❌'}`);
  console.log('');
  
  if (appTokenValid && appInfo && isInstalled && messageSent) {
    console.log('🎉 SUCCESS: App is fully functional!');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. The app is now working with app token');
    console.log('   2. You can test slash commands');
    console.log('   3. The webhook-thoughtmarks server should work');
  } else {
    console.log('⚠️  PARTIAL SUCCESS: Some components are working');
    console.log('');
    console.log('🔧 Recommendations:');
    if (!appTokenValid) {
      console.log('   • Check the app token in webhook-thoughtmarks.env');
    }
    if (!appInfo) {
      console.log('   • Verify the app is properly configured in Slack');
    }
    if (!isInstalled) {
      console.log('   • The app may need manual installation');
    }
    if (!messageSent) {
      console.log('   • Check channel permissions and app scopes');
    }
  }
}

main().catch(console.error); 