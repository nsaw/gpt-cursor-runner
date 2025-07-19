const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const { text } = req.body;
    const stateFile = path.join(__dirname, '../../runner.state.json');
    
    // Read current state
    let currentState = { cursor_mode: 'default' };
    if (fs.existsSync(stateFile)) {
      currentState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
    
    const validModes = ['default', 'debug', 'verbose', 'silent', 'auto', 'manual'];
    
    if (!text) {
      // Show current mode
      return res.json({
        response_type: 'in_channel',
        text: `🎛️ **Cursor Mode**\n\n**Current Mode:** ${currentState.cursor_mode}\n**Valid Modes:** ${validModes.join(', ')}\n\n**Usage:** /cursor-mode <mode>`
      });
    }
    
    const newMode = text.trim().toLowerCase();
    
    if (!validModes.includes(newMode)) {
      return res.json({
        response_type: 'in_channel',
        text: `❌ Invalid mode: ${newMode}\n\n**Valid Modes:** ${validModes.join(', ')}\n\n**Current Mode:** ${currentState.cursor_mode}`
      });
    }
    
    // Update state
    const oldMode = currentState.cursor_mode;
    currentState.cursor_mode = newMode;
    currentState.mode_change_timestamp = new Date().toISOString();
    currentState.mode_change_user = req.body.user_name || 'unknown';
    
    fs.writeFileSync(stateFile, JSON.stringify(currentState, null, 2));
    
    const modeDescriptions = {
      'default': 'Standard operation mode',
      'debug': 'Verbose logging and debugging',
      'verbose': 'Detailed output and logging',
      'silent': 'Minimal output and logging',
      'auto': 'Automatic operation without prompts',
      'manual': 'Manual operation with prompts'
    };
    
    res.json({
      response_type: 'in_channel',
      text: `🎛️ **Cursor Mode Changed!**\n\n**From:** ${oldMode}\n**To:** ${newMode}\n**Description:** ${modeDescriptions[newMode]}\n**User:** ${req.body.user_name || 'Unknown'}\n**Timestamp:** ${new Date().toLocaleString()}`
    });
    
  } catch (error) {
    console.error('Error in handleCursorMode:', error);
    res.json({
      response_type: 'in_channel',
      text: `❌ Error changing cursor mode: ${error.message}`
    });
  }
};