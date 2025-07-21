const axios = require('axios');

module.exports = async ({ command, ack, respond }) => {
  await ack();
  
  try {
    // Check if the runner server is running
    const healthCheck = await axios.get('http://localhost:5556/health', {
      timeout: 5000
    });
    
    const status = healthCheck.data;
    const uptime = Math.floor(status.uptime);
    const memoryMB = Math.round(status.memory.heapUsed / 1024 / 1024);
    
    await respond({
      response_type: 'in_channel',
      text: `✅ *GPT-Cursor Runner Status*\n\n` +
            `• Status: ${status.status}\n` +
            `• Uptime: ${uptime} seconds\n` +
            `• Memory: ${memoryMB}MB\n` +
            `• Environment: ${status.env}\n` +
            `• Timestamp: ${new Date(status.timestamp).toLocaleString()}`
    });
  } catch (error) {
    console.error('Status check failed:', error.message);
    await respond({
      response_type: 'in_channel',
      text: `❌ *GPT-Cursor Runner Status*\n\n` +
            `• Status: OFFLINE\n` +
            `• Error: Runner server is not responding\n` +
            `• Check: http://localhost:5556/health`
    });
  }
}; 