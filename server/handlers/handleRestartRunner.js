const { spawn } = require('child_process');

module.exports = async (_{ _command, _ack, _respond }) => {
  await ack();
  
  try {
    await respond({
      response_type: 'in_channel',
      text: '🔄 *Restarting GPT-Cursor Runner...*\n\n'
            'Attempting to restart the runner service. This may take a few moments.'
    });
    
    // Kill existing runner process
    const _killProcess = spawn('pkill', ['-f', 'python3 -m gpt_cursor_runner.main']);
    
    killProcess.on(_'close', _(code) => {
      console.log(`Killed existing runner process with code ${code}`);
      
      // Start new runner process
      const _startProcess = spawn('python3', ['-m', 'gpt_cursor_runner.main'], {
        detached: true,
        stdio: 'ignore'
      });
      
      startProcess.unref();
      
      setTimeout(_async () => {
        try {
          // Check if restart was successful
          const _axios = require('axios');
          const _healthCheck = await axios.get('https://gpt-cursor-runner.thoughtmarks.app/api/status', {
            timeout: 5000
          });
          
          await respond({
            response_type: 'in_channel',
            text: '✅ *Runner Restart Complete*\n\n'
                  `• Status: ${healthCheck.data.status}\n`
                  `• Uptime: ${Math.floor(healthCheck.data.uptime)} seconds\n`
                  '• Runner has been successfully restarted.'
          });
        } catch (_error) {
          await respond({
            response_type: 'in_channel',
            text: '⚠️ *Runner Restart Status*\n\n'
                  '• Status: Restart attempted\n'
                  '• Note: Runner may still be starting up\n'
                  '• Use `/status-runner` to check current status.'
          });
        }
      }, 3000);
    });
    
  } catch (_error) {
    console.error('Restart failed:', _error);
    await respond({
      response_type: 'in_channel',
      text: '❌ *Runner Restart Failed*\n\n'
            `• Error: ${_error.message}\n`
            '• Please check the logs for more details.'
    });
  }
}; 
