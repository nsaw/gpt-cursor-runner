const _stateManager = require('../utils/stateManager');

module.exports = async ({ command, ack, respond }) => {
  await ack();
  
  const dashboardUrl = process.env.PUBLIC_RUNNER_URL || 'http://runner.thoughtmarks.app';
  
  await respond({
    response_type: 'in_channel',
    text: '📊 *GPT-Cursor Runner Dashboard*\n\n'
          `• Dashboard: ${dashboardUrl}/dashboard\n`
          `• Health Check: ${dashboardUrl}/health\n`
          `• Slack Test: ${dashboardUrl}/slack/test\n\n`
          'Use `/status-runner` to check current status.'
  });
};
