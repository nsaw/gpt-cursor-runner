const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const stateFile = path.join(__dirname, '../../runner.state.json');
    // const patchesDir = path.join(__dirname, '../../patches'); // Unused variable
    
    // Read current state
    let currentState = { current_phase: 'unknown', phases: [] };
    if (fs.existsSync(stateFile)) {
      currentState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
    
    // Find the most recent phase to revert
    const phases = currentState.phases || [];
    if (phases.length === 0) {
      return res.json({
        response_type: 'in_channel',
        text: `🔄 **Phase Revert**\n\nNo phases found to revert.\n\n**Current Phase:** ${currentState.current_phase || 'Unknown'}`
      });
    }
    
    // Get the most recent phase
    const currentPhase = phases[phases.length - 1];
    const previousPhase = phases.length > 1 ? phases[phases.length - 2] : null;
    
    // Revert to previous phase
    if (previousPhase) {
      currentState.current_phase = previousPhase.name;
      currentState.phases = phases.slice(0, -1); // Remove current phase
      currentState.revert_timestamp = new Date().toISOString();
      currentState.reverted_phase = currentPhase.name;
      
      fs.writeFileSync(stateFile, JSON.stringify(currentState, null, 2));
      
      res.json({
        response_type: 'in_channel',
        text: `🔄 **Phase Reverted!**\n\n**From:** ${currentPhase.name}\n**To:** ${previousPhase.name}\n**Timestamp:** ${new Date().toLocaleString()}\n\n**Note:** Phase has been reverted to previous state.`
      });
    } else {
      res.json({
        response_type: 'in_channel',
        text: `🔄 **Phase Revert**\n\nCannot revert further - this is the initial phase.\n\n**Current Phase:** ${currentPhase.name}`
      });
    }
    
  } catch (error) {
    console.error('Error in handleRevertPhase:', error);
    res.json({
      response_type: 'in_channel',
      text: `❌ Error reverting phase: ${error.message}`
    });
  }
};