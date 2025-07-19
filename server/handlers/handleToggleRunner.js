// const { exec } = require('child_process'); // Unused import
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const stateFile = path.join(__dirname, '../../runner.state.json');
    
    // Read current state
    let currentState = { auto_mode: false, paused: false };
    if (fs.existsSync(stateFile)) {
      currentState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
    
    // Toggle logic: if auto_mode is true, turn off; if false, turn on (auto mode)
    const newAutoMode = !currentState.auto_mode;
    const newPaused = false; // Always unpause when toggling
    
    // Update state
    const newState = {
      ...currentState,
      auto_mode: newAutoMode,
      paused: newPaused
    };
    
    fs.writeFileSync(stateFile, JSON.stringify(newState, null, 2));
    
    const status = newAutoMode ? '🟢 ON (Auto Mode)' : '🔴 OFF';
    const action = newAutoMode ? 'enabled' : 'disabled';
    
    res.json({
      response_type: 'in_channel',
      text: `🔄 Runner ${action}!\n\n**Current Status:** ${status}\n**Auto Mode:** ${newAutoMode ? 'Enabled' : 'Disabled'}\n**Paused:** ${newPaused ? 'Yes' : 'No'}`
    });
    
  } catch (error) {
    console.error('Error in handleToggleRunner:', error);
    res.json({
      response_type: 'in_channel',
      text: `❌ Error toggling runner: ${error.message}`
    });
  }
}; 