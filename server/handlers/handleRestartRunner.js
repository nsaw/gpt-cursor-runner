const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const stateFile = path.join(__dirname, '../../runner.state.json');
    
    // Update state to indicate restart
    const currentState = fs.existsSync(stateFile) ? 
      JSON.parse(fs.readFileSync(stateFile, 'utf8')) : 
      { auto_mode: false, paused: false };
    
    const newState = {
      ...currentState,
      restart_requested: true,
      restart_timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(stateFile, JSON.stringify(newState, null, 2));
    
    // Send immediate response
    res.json({
      response_type: 'in_channel',
      text: `🔄 **Runner Restart Initiated**\n\n**Status:** Restarting GPT-Cursor Runner service\n**Timestamp:** ${new Date().toLocaleString()}\n\n**Note:** Service will be temporarily unavailable during restart.`
    });
    
    // Execute restart in background
    setTimeout(() => {
      exec('pkill -f "python.*gpt_cursor_runner"', (error) => {
        if (error) {
          console.log('No existing runner processes to kill');
        }
        
        // Start new runner process
        exec('python3 -m gpt_cursor_runner.main', (error, _stdout, _stderr) => {
          if (error) {
            console.error('Restart error:', error);
          } else {
            console.log('Runner restarted successfully');
          }
        });
      });
    }, 1000);
    
  } catch (error) {
    console.error('Error in handleRestartRunner:', error);
    res.json({
      response_type: 'in_channel',
      text: `❌ Error restarting runner: ${error.message}`
    });
  }
}; 