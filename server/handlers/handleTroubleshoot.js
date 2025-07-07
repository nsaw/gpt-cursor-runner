const stateManager = require('../utils/stateManager');
const runnerController = require('../utils/runnerController');

module.exports = async function handleTroubleshoot(req, res) {
  const { user_name, text } = req.body;
  console.log("⚡️ /troubleshoot triggered by:", user_name, "with text:", text);
  
  try {
    const currentState = await stateManager.getState();
    const runnerStatus = await runnerController.getRunnerStatus();
    const action = text?.trim().toLowerCase() || 'auto';
    
    // Analyze current state for issues
    const issues = [];
    const recommendations = [];
    
    if (!currentState.runner.isRunning) {
      issues.push('Runner is not running');
      recommendations.push('Use `/again` to restart runner');
    }
    
    if (currentState.paused) {
      issues.push('Runner is paused');
      recommendations.push('Use `/proceed` to resume');
    }
    
    if (currentState.lastError) {
      issues.push(`Last error: ${currentState.lastError}`);
      recommendations.push('Use `/again` to retry failed operation');
    }
    
    if (runnerStatus.lastError) {
      issues.push(`Runner error: ${runnerStatus.lastError}`);
      recommendations.push('Use `/again restart` to restart runner');
    }
    
    if (currentState.lockdown) {
      issues.push('Runner is locked');
      recommendations.push('Use `/unlock-runner` to unlock');
    }
    
    if (currentState.crashFence) {
      issues.push('Crash fence is active');
      recommendations.push('Check logs and use `/again` to restart');
    }
    
    let response = '';
    
    if (action === 'fix' || action === 'auto') {
      // Auto-fix mode
      if (issues.length === 0) {
        response = `
🔍 *Troubleshoot Complete*

*Status:* ✅ No issues detected
*Runner:* ${currentState.runner.isRunning ? '🟢 Running' : '🔴 Stopped'}
*Paused:* ${currentState.paused ? 'Yes' : 'No'}
*Locked:* ${currentState.lockdown ? 'Yes' : 'No'}

*System:* All systems operational
        `.trim();
      } else {
        // Apply auto-fixes
        const fixes = [];
        
        if (!currentState.runner.isRunning) {
          await runnerController.startRunner();
          fixes.push('✅ Restarted runner');
        }
        
        if (currentState.paused) {
          await stateManager.resumeRunner();
          fixes.push('✅ Resumed runner');
        }
        
        if (currentState.lockdown) {
          await stateManager.updateState({ lockdown: false });
          fixes.push('✅ Unlocked runner');
        }
        
        response = `
🔧 *Auto-Troubleshoot Applied*

*Issues Found:* ${issues.length}
*Fixes Applied:* ${fixes.length}

*Issues:*
${issues.map(issue => `• ${issue}`).join('\n')}

*Fixes:*
${fixes.map(fix => `• ${fix}`).join('\n')}

*Status:* 🔄 Auto-fixes applied
*Next:* Monitor with `/status-runner`
        `.trim();
      }
    } else {
      // Manual analysis mode
      response = `
🔍 *Troubleshoot Analysis*

*Analyzed By:* ${user_name}
*Timestamp:* ${new Date().toLocaleString()}

*Issues Found:* ${issues.length}
${issues.length > 0 ? issues.map(issue => `• ${issue}`).join('\n') : '• No issues detected'}

*Recommendations:*
${recommendations.length > 0 ? recommendations.map(rec => `• ${rec}`).join('\n') : '• System appears healthy'}

*Current State:*
• Runner: ${currentState.runner.isRunning ? '🟢 Running' : '🔴 Stopped'}
• Paused: ${currentState.paused ? 'Yes' : 'No'}
• Locked: ${currentState.lockdown ? 'Yes' : 'No'}
• Crash Fence: ${currentState.crashFence ? 'Active' : 'Clear'}
      `.trim();
    }

    res.send(response);
  } catch (error) {
    console.error('Error in troubleshoot:', error);
    res.send(`❌ Error in troubleshoot: ${error.message}`);
  }
}; 