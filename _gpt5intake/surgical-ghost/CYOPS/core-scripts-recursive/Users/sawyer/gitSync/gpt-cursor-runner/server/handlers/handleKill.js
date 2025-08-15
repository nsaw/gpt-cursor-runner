const { spawn } = require('child_process');

module.exports = async ({ command, ack, respond }) => {
  await ack();
  
  try {
    await respond({
      response_type: 'in_channel',
      text: '🛑 *Emergency Stop - Killing Runner*\n\n'
            'Force stopping the GPT-Cursor Runner service.'
    });
    
    // Kill runner process
    const killProcess = spawn('pkill', ['-f', 'python3 -m gpt_cursor_runner.main']);
    
    killProcess.on('close', (code) => {
      console.log(`Killed runner process with code ${code}`);
      
      setTimeout(async () => {
        try {
          // Verify runner is stopped
          const axios = require('axios');
          await axios.get('http://runner.thoughtmarks.app/health', {
            timeout: 2000
          });
          
          await respond({
            response_type: 'in_channel',
            text: '⚠️ *Kill Command Executed*\n\n'
                  '• Status: Runner process killed\n'
                  '• Note: Runner server may still be responding\n'
                  '• Use `/restart-runner` to restart when ready.'
          });
        } catch (error) {
          await respond({
            response_type: 'in_channel',
            text: '✅ *Runner Successfully Killed*\n\n'
                  '• Status: Runner is now stopped\n'
                  '• Server is not responding\n'
                  '• Use `/restart-runner` to restart when ready.'
          });
        }
      }, 2000);
    });
    
  } catch (error) {
    console.error('Kill command failed:', error);
    await respond({
      response_type: 'in_channel',
      text: '❌ *Kill Command Failed*\n\n'
            `• Error: ${error.message}\n`
            '• Runner may still be running.'
    });
  }
}; 
