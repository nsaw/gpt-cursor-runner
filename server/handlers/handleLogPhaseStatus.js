const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const stateFile = path.join(__dirname, '../../runner.state.json');
    const patchesDir = path.join(__dirname, '../../patches');
    
    // Read current state
    let currentState = { current_phase: 'unknown', phases: [] };
    if (fs.existsSync(stateFile)) {
      currentState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
    
    // Get current phase info
    const currentPhase = currentState.current_phase || 'Unknown';
    const phases = currentState.phases || [];
    const phaseCount = phases.length;
    
    // Count patches by status
    let approvedCount = 0;
    let pendingCount = 0;
    let revertedCount = 0;
    
    if (fs.existsSync(patchesDir)) {
      const files = fs.readdirSync(patchesDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          if (file.startsWith('approved_')) {
            approvedCount++;
          } else if (file.startsWith('reverted_')) {
            revertedCount++;
          } else {
            pendingCount++;
          }
        }
      }
    }
    
    // Get recent activity
    const recentActivity = [];
    if (currentState.last_activity) {
      recentActivity.push(`Last Activity: ${currentState.last_activity}`);
    }
    if (currentState.phase_start_time) {
      recentActivity.push(`Phase Start: ${new Date(currentState.phase_start_time).toLocaleString()}`);
    }
    
    res.json({
      response_type: 'in_channel',
      text: `📊 **Phase Status Log**\n\n**Current Phase:** ${currentPhase}\n**Total Phases:** ${phaseCount}\n\n**Patch Status:**\n• Approved: ${approvedCount}\n• Pending: ${pendingCount}\n• Reverted: ${revertedCount}\n\n**Recent Activity:**\n${recentActivity.length > 0 ? recentActivity.join('\n') : 'No recent activity'}\n\n**Timestamp:** ${new Date().toLocaleString()}`
    });
    
  } catch (error) {
    console.error('Error in handleLogPhaseStatus:', error);
    res.json({
      response_type: 'in_channel',
      text: `❌ Error logging phase status: ${error.message}`
    });
  }
};