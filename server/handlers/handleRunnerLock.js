const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const stateFile = path.join(__dirname, '../../runner.state.json');
    
    // Read current state
    let currentState = { locked: false, auto_mode: false, paused: false };
    if (fs.existsSync(stateFile)) {
      currentState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
    
    // Toggle lock state
    const newLocked = !currentState.locked;
    
    // Update state
    const newState = {
      ...currentState,
      locked: newLocked,
      lock_timestamp: new Date().toISOString(),
      lock_user: req.body.user_name || 'unknown'
    };
    
    fs.writeFileSync(stateFile, JSON.stringify(newState, null, 2));
    
    const status = newLocked ? '🔒 LOCKED' : '🔓 UNLOCKED';
    const action = newLocked ? 'locked' : 'unlocked';
    const icon = newLocked ? '🔒' : '🔓';
    
    res.json({
      response_type: 'in_channel',
      text: `${icon} **Runner ${action}!**\n\n**Status:** ${status}\n**User:** ${req.body.user_name || 'Unknown'}\n**Timestamp:** ${new Date().toLocaleString()}\n\n**Note:** ${newLocked ? 'Changes are now prevented.' : 'Changes are now allowed.'}`
    });
    
  } catch (error) {
    console.error('Error in handleRunnerLock:', error);
    res.json({
      response_type: 'in_channel',
      text: `❌ Error toggling runner lock: ${error.message}`
    });
  }
}; 