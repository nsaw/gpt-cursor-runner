const stateManager = require('../utils/stateManager');

module.exports = async function handleToggleRunnerAuto(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /toggle-runner-auto triggered by:", user_name);
  
  try {
    const currentState = await stateManager.getState();
    const newAutoMode = !currentState.autoMode;
    
    await stateManager.setAutoMode(newAutoMode);
    
    const modeText = newAutoMode ? '🤖 Auto Mode' : '👤 Manual Mode';
    const description = newAutoMode 
      ? 'Runner will automatically process patches without manual approval.'
      : 'Runner will require manual approval for each patch.';
    
    res.send(`🔄 *Auto Mode ${newAutoMode ? 'Enabled' : 'Disabled'}*\n\n${modeText} is now ${newAutoMode ? 'enabled' : 'disabled'} by ${user_name}.\n\n${description}`);
  } catch (error) {
    console.error('Error toggling auto mode:', error);
    res.send(`❌ Error toggling auto mode: ${error.message}`);
  }
};