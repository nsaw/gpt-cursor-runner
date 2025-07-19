const axios = require('axios');

module.exports = async (req, res) => {
  try {
    const runnerUrl = process.env.RUNNER_URL || 'https://gpt-cursor-runner.fly.dev';
    
    // Get current status from multiple endpoints
    const statusChecks = [
      { name: 'Health', url: `${runnerUrl}/health` },
      { name: 'Dashboard', url: `${runnerUrl}/dashboard` },
      { name: 'Webhook', url: `${runnerUrl}/webhook` }
    ];
    
    const results = [];
    let healthyCount = 0;
    
    for (const check of statusChecks) {
      try {
        const response = await axios.get(check.url, { timeout: 3000 });
        const isHealthy = response.status === 200;
        
        if (isHealthy) healthyCount++;
        
        results.push({
          name: check.name,
          status: isHealthy ? '✅ Healthy' : '❌ Unhealthy',
          statusCode: response.status
        });
        
      } catch (error) {
        results.push({
          name: check.name,
          status: '❌ Error',
          error: error.message
        });
      }
    }
    
    // Get system info
    const { exec } = require('child_process');
    exec('uptime', (error, stdout) => {
      const uptime = error ? 'Unknown' : stdout.trim();
      
      const timestamp = new Date().toISOString();
      const healthStatus = healthyCount === statusChecks.length ? '🟢 All Systems Healthy' : 
        healthyCount > 0 ? '🟡 Partial Issues' : '🔴 System Issues';
      
      const statusMessage = `📊 **Status Pulse - ${timestamp}**\n\n${healthStatus}\n\n**Endpoints:**\n${results.map(r => `${r.status} ${r.name}`).join('\n')}\n\n**System Uptime:** ${uptime}\n\n**Health Score:** ${healthyCount}/${statusChecks.length} endpoints healthy`;
      
      // Send status to Slack webhook if configured
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      const channel = process.env.SLACK_CHANNEL || '#runner-control';
      const username = process.env.SLACK_USERNAME || 'GPT-Cursor Runner';
      
      if (webhookUrl) {
        const webhookPayload = {
          text: statusMessage,
          channel,
          username,
          icon_emoji: healthStatus.includes('🟢') ? ':white_check_mark:' : 
            healthStatus.includes('🟡') ? ':warning:' : ':x:'
        };
        
        axios.post(webhookUrl, webhookPayload, {
          headers: {
            'Content-Type': 'application/json'
          }
        }).catch(error => {
          console.error('Error sending status to webhook:', error.message);
        });
      }
      
      res.json({
        response_type: 'in_channel',
        text: statusMessage
      });
    });
    
  } catch (error) {
    console.error('Error in handleStatusPush:', error);
    res.json({
      response_type: 'in_channel',
      text: `❌ Error during status push: ${error.message}`
    });
  }
}; 