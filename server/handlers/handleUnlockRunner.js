const _stateManager = require('../utils/stateManager');

module.exports = async function handleUnlockRunner(_req, _res) {
  const { _user_name } = req.body;
  console.log('⚡️ /unlock-runner triggered by:', user_name);
  
  try {
    const _currentState = await stateManager.getState();
    
    if (!currentState.lockdown) {
      res.send('🔓 Runner is not locked. Use `/lock-runner` to lock.');
      return;
    }

    await stateManager.unlockRunner();
    
    res.send(`🔓 *Runner Unlocked*\n\nRunner has been unlocked by ${user_name}. Patches will now be processed normally.`);
  } catch (_error) {
    console.error('Error unlocking runner:', error);
    res.send(`❌ Error unlocking runner: ${error.message}`);
  }
};