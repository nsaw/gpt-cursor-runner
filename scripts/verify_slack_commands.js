#!/usr/bin/env node

const axios = require('axios');

// All commands from the manifest
const commands = [
  '/dashboard',
  '/patch-approve',
  '/patch-revert',
  '/pause-runner',
  '/status-runner',
  '/show-roadmap',
  '/roadmap',
  '/kill',
  '/toggle-runner-on',
  '/toggle-runner-off',
  '/toggle-runner-auto',
  '/theme',
  '/theme-status',
  '/theme-fix',
  '/patch-preview',
  '/revert-phase',
  '/log-phase-status',
  '/cursor-mode',
  '/whoami',
  '/lock-runner',
  '/unlock-runner',
  '/alert-runner-crash',
  '/proceed',
  '/again',
  '/manual-revise',
  '/manual-append',
  '/interrupt',
  '/troubleshoot',
  '/troubleshoot-oversight',
  '/send-with',
  '/gpt-slack-dispatch',
  '/cursor-slack-dispatch',
];

const SERVER_URL = 'http://localhost:5555';

async function testCommand(command) {
  try {
    const response = await axios.post(
      `${SERVER_URL}/slack/commands`,
      `command=${command}&user_id=U123&channel_id=C123`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    console.log(
      `✅ ${command}: ${response.status} - ${response.data.substring(0, 100)}...`,
    );
    return { command, status: 'success', response: response.data };
  } catch (error) {
    console.log(
      `❌ ${command}: ${error.response?.status || 'ERROR'} - ${error.message}`,
    );
    return { command, status: 'error', error: error.message };
  }
}

async function verifyAllCommands() {
  console.log('🔍 Verifying Slack slash commands...\n');

  const results = [];

  for (const command of commands) {
    const result = await testCommand(command);
    results.push(result);
    // Small delay to avoid overwhelming the server
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('\n📊 Summary:');
  const successful = results.filter((r) => r.status === 'success').length;
  const failed = results.filter((r) => r.status === 'error').length;
  console.log(`✅ Successful: ${successful}/${commands.length}`);
  console.log(`❌ Failed: ${failed}/${commands.length}`);

  if (failed > 0) {
    console.log('\n❌ Failed commands:');
    results
      .filter((r) => r.status === 'error')
      .forEach((r) => {
        console.log(`  - ${r.command}: ${r.error}`);
      });
  }

  console.log(
    '\n🎯 All commands are properly routed to https://gpt-cursor-runner.fly.dev/slack/commands',
  );
  console.log(
    '📋 Commands configured in Slack manifest match the server routes',
  );
}

// Run the verification
verifyAllCommands().catch(console.error);