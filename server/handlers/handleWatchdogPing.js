const axios = require('axios');

module.exports = async (req, res) => {
  try {
    const endpoints = [
      { name: 'GPT-Cursor Runner', url: 'https://gpt-cursor-runner.fly.dev/health' },
      { name: 'GPT-Cursor Runner Dashboard', url: 'https://gpt-cursor-runner.fly.dev/dashboard' },
      { name: 'GPT-Cursor Runner Webhook', url: 'https://gpt-cursor-runner.fly.dev/webhook' }
    ];
    
    const results = [];
    let healthyCount = 0;
    const totalCount = endpoints.length;
    
    // Ping each endpoint
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, { timeout: 5000 });
        const isHealthy = response.status === 200;
        
        if (isHealthy) healthyCount++;
        
        results.push({
          name: endpoint.name,
          status: isHealthy ? '✅ Healthy' : '❌ Unhealthy',
          responseTime: response.headers['x-response-time'] || 'N/A',
          statusCode: response.status
        });
        
      } catch (error) {
        results.push({
          name: endpoint.name,
          status: '❌ Error',
          error: error.message,
          statusCode: error.response?.status || 'N/A'
        });
      }
    }
    
    // Check for running processes
    const { exec } = require('child_process');
    exec('ps aux | grep -E "(python|node)" | grep -v grep | wc -l', (error, stdout) => {
      const processCount = parseInt(stdout.trim()) || 0;
      
      const healthStatus = healthyCount === totalCount ? '🟢 All Systems Healthy' : 
        healthyCount > 0 ? '🟡 Partial Health Issues' : '🔴 System Issues';
      
      const response = {
        response_type: 'in_channel',
        text: `🔍 **Watchdog Ping Results**\n\n${healthStatus}\n\n**Endpoints:**\n${results.map(r => `${r.status} ${r.name} (${r.statusCode})`).join('\n')}\n\n**Processes:** ${processCount} Python/Node processes running\n\n**Health Score:** ${healthyCount}/${totalCount} endpoints healthy`
      };
      
      res.json(response);
    });
    
  } catch (error) {
    console.error('Error in handleWatchdogPing:', error);
    res.json({
      response_type: 'in_channel',
      text: `❌ Error during watchdog ping: ${error.message}`
    });
  }
}; 