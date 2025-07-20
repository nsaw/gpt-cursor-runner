const { spawn } = require('child_process');

module.exports = async ({ command, ack, respond }) => {
  await ack();
  
  try {
    await respond({
      response_type: 'in_channel',
      text: `🔄 *Restarting GPT-Cursor Runner...*\n\n` +
            `Attempting to restart the runner service. This may take a few moments.`
    });
    
    // Kill existing runner process
    const killProcess = spawn('pkill', ['-f', 'python3 -m gpt_cursor_runner.main']);
    
    killProcess.on('close', (code) => {
      console.log(`Killed existing runner process with code ${code}`);
      
      // Start new runner process
      const startProcess = spawn('python3', ['-m', 'gpt_cursor_runner.main'], {
        detached: true,
        stdio: 'ignore'
      });
      
      startProcess.unref();
      
      setTimeout(async () => {
        try {
          // Check if restart was successful
          const axios = require('axios');
          const healthCheck = await axios.get('http://runner.thoughtmarks.app/health', {
            timeout: 5000
          });
          
          await respond({
            response_type: 'in_channel',
            text: `✅ *Runner Restart Complete*\n\n` +
                  `• Status: ${healthCheck.data.status}\n` +
                  `• Uptime: ${Math.floor(healthCheck.data.uptime)} seconds\n` +
                  `• Runner has been successfully restarted.`
          });
        } catch (error) {
          await respond({
            response_type: 'in_channel',
            text: `⚠️ *Runner Restart Status*\n\n` +
                  `• Status: Restart attempted\n` +
                  `• Note: Runner may still be starting up\n` +
                  `• Use \`/status-runner\` to check current status.`
          });
        }
      }, 3000);
    });
    
  } catch (error) {
    console.error('Restart failed:', error);
    await respond({
      response_type: 'in_channel',
      text: `❌ *Runner Restart Failed*\n\n` +
            `• Error: ${error.message}\n` +
            `• Please check the logs for more details.`
    });
  }
}; 