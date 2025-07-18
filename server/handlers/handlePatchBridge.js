const patchManager = require('../utils/patchManager');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

module.exports = async function handlePatchBridge(req, res) {
  const { user_name, text } = req.body;
  console.log('⚡️ /patch-bridge triggered by:', user_name);
  
  try {
    const args = text ? text.trim().split(' ') : [];
    const command = args[0] || 'status';
    
    switch (command) {
      case 'status':
        await handleBridgeStatus(req, res);
        break;
      case 'apply':
        await handleBridgeApply(req, res, args.slice(1));
        break;
      case 'revert':
        await handleBridgeRevert(req, res, args.slice(1));
        break;
      case 'list':
        await handleBridgeList(req, res, args.slice(1));
        break;
      case 'metrics':
        await handleBridgeMetrics(req, res);
        break;
      case 'health':
        await handleBridgeHealth(req, res);
        break;
      default:
        res.send(`❌ Unknown bridge command: ${command}\n\nAvailable commands:\n• status - Bridge status\n• apply <patch-id> - Apply patch\n• revert <patch-id> - Revert patch\n• list [limit] - List patches\n• metrics - Get metrics\n• health - Health check`);
    }
  } catch (error) {
    console.error('Error in patch bridge:', error);
    res.send(`❌ Error in patch bridge: ${error.message}`);
  }
};

async function handleBridgeStatus(req, res) {
  try {
    const { user_name } = req.body;
    
    // Get Python runner status
    const runnerStatus = await checkPythonRunnerStatus();
    
    // Get patch statistics
    const patchStats = await patchManager.getPatchStats();
    
    // Get recent activity
    const recentPatches = await patchManager.listPatches(5);
    
    let response = `🌉 *Patch Bridge Status*\n\n*Requested by:* ${user_name}\n*Timestamp:* ${new Date().toLocaleString()}\n\n`;
    
    // Bridge status
    response += '*Bridge Status:*\n';
    response += `• Python Runner: ${runnerStatus.running ? '🟢 Running' : '🔴 Stopped'}\n`;
    response += `• Bridge Active: ✅\n`;
    response += `• Last Check: ${new Date().toLocaleString()}\n\n`;
    
    // Patch statistics
    response += '*Patch Statistics:*\n';
    response += `• Total: ${patchStats.total}\n`;
    response += `• Approved: ${patchStats.approved}\n`;
    response += `• Pending: ${patchStats.pending}\n`;
    response += `• Failed: ${patchStats.failed}\n`;
    response += `• Success Rate: ${patchStats.successRate}%\n\n`;
    
    // Recent activity
    if (recentPatches.length > 0) {
      response += '*Recent Activity:*\n';
      recentPatches.forEach((patch, index) => {
        const status = patch.status === 'approved' ? '✅' : 
                      patch.status === 'pending' ? '⏳' : 
                      patch.status === 'failed' ? '❌' : '🔄';
        response += `${status} ${patch.patch_id || patch.id} - ${patch.target_file || 'Unknown'}\n`;
      });
    }
    
    res.send(response);
  } catch (error) {
    res.send(`❌ Error getting bridge status: ${error.message}`);
  }
}

async function handleBridgeApply(req, res, args) {
  try {
    const { user_name } = req.body;
    const patchId = args[0];
    
    if (!patchId) {
      res.send('❌ Please specify a patch ID.\n\nUsage: `/patch-bridge apply <patch-id>`');
      return;
    }
    
    // Get patch details
    const patchPreview = await patchManager.getPatchPreview(patchId);
    if (!patchPreview.success) {
      res.send(`❌ Patch not found: ${patchId}`);
      return;
    }
    
    // Apply patch using Python runner
    const applyResult = await applyPatchWithPython(patchId);
    
    if (applyResult.success) {
      res.send(`✅ *Patch Applied Successfully*\n\n*Patch ID:* \`${patchId}\`\n*File:* ${patchPreview.patch.file}\n*Applied by:* ${user_name}\n\n${applyResult.message}`);
    } else {
      res.send(`❌ Failed to apply patch: ${applyResult.message}`);
    }
  } catch (error) {
    res.send(`❌ Error applying patch: ${error.message}`);
  }
}

async function handleBridgeRevert(req, res, args) {
  try {
    const { user_name } = req.body;
    const patchId = args[0];
    
    if (!patchId) {
      res.send('❌ Please specify a patch ID.\n\nUsage: `/patch-bridge revert <patch-id>`');
      return;
    }
    
    // Get patch details
    const patchPreview = await patchManager.getPatchPreview(patchId);
    if (!patchPreview.success) {
      res.send(`❌ Patch not found: ${patchId}`);
      return;
    }
    
    // Revert patch using Python runner
    const revertResult = await revertPatchWithPython(patchId);
    
    if (revertResult.success) {
      res.send(`✅ *Patch Reverted Successfully*\n\n*Patch ID:* \`${patchId}\`\n*File:* ${patchPreview.patch.file}\n*Reverted by:* ${user_name}\n\n${revertResult.message}`);
    } else {
      res.send(`❌ Failed to revert patch: ${revertResult.message}`);
    }
  } catch (error) {
    res.send(`❌ Error reverting patch: ${error.message}`);
  }
}

async function handleBridgeList(req, res, args) {
  try {
    const limit = parseInt(args[0]) || 10;
    const patches = await patchManager.listPatches(limit);
    
    if (patches.length === 0) {
      res.send('📋 No patches found.');
      return;
    }
    
    let response = `📋 *Recent Patches (${patches.length})*\n\n`;
    
    patches.forEach((patch, index) => {
      const status = patch.status === 'approved' ? '✅' : 
                    patch.status === 'pending' ? '⏳' : 
                    patch.status === 'failed' ? '❌' : '🔄';
      const id = patch.patch_id || patch.id;
      const file = patch.target_file || 'Unknown';
      const description = patch.description || 'No description';
      
      response += `${index + 1}. ${status} \`${id}\`\n`;
      response += `   File: ${file}\n`;
      response += `   Status: ${patch.status}\n`;
      response += `   Description: ${description}\n\n`;
    });
    
    res.send(response);
  } catch (error) {
    res.send(`❌ Error listing patches: ${error.message}`);
  }
}

async function handleBridgeMetrics(req, res) {
  try {
    // Get metrics from Python runner
    const metrics = await getPythonMetrics();
    
    let response = `📊 *Bridge Metrics*\n\n`;
    response += `*Python Runner Metrics:*\n`;
    response += `• Total Patches: ${metrics.total_patches || 0}\n`;
    response += `• Successful: ${metrics.successful_patches || 0}\n`;
    response += `• Success Rate: ${metrics.success_rate || 0}%\n`;
    response += `• Average Duration: ${metrics.average_duration_ms || 0}ms\n`;
    response += `• Total Matches: ${metrics.total_matches || 0}\n`;
    response += `• Average Complexity: ${metrics.average_complexity || 0}\n\n`;
    
    response += `*Bridge Performance:*\n`;
    response += `• Bridge Calls: ${metrics.bridge_calls || 0}\n`;
    response += `• Last Bridge Call: ${metrics.last_bridge_call || 'Never'}\n`;
    response += `• Bridge Health: ${metrics.bridge_health || 'Unknown'}\n`;
    
    res.send(response);
  } catch (error) {
    res.send(`❌ Error getting metrics: ${error.message}`);
  }
}

async function handleBridgeHealth(req, res) {
  try {
    const healthChecks = await performHealthChecks();
    
    let response = `🏥 *Bridge Health Check*\n\n`;
    
    Object.entries(healthChecks).forEach(([component, status]) => {
      const icon = status.healthy ? '✅' : '❌';
      response += `${icon} *${component}:* ${status.healthy ? 'Healthy' : 'Unhealthy'}\n`;
      if (!status.healthy && status.message) {
        response += `   ${status.message}\n`;
      }
    });
    
    const allHealthy = Object.values(healthChecks).every(check => check.healthy);
    response += `\n*Overall Status:* ${allHealthy ? '🟢 All Systems Healthy' : '🔴 Issues Detected'}`;
    
    res.send(response);
  } catch (error) {
    res.send(`❌ Error performing health check: ${error.message}`);
  }
}

// Helper functions for Python integration
async function checkPythonRunnerStatus() {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python3', ['-c', 'import gpt_cursor_runner.main; print("RUNNER_ACTIVE")'], {
      cwd: process.cwd()
    });
    
    let output = '';
    let error = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      resolve({
        running: output.includes('RUNNER_ACTIVE'),
        code,
        error: error || null
      });
    });
  });
}

async function applyPatchWithPython(patchId) {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python3', ['-m', 'gpt_cursor_runner.patch_runner', '--apply', patchId], {
      cwd: process.cwd()
    });
    
    let output = '';
    let error = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, message: output.trim() });
      } else {
        resolve({ success: false, message: error.trim() || 'Unknown error' });
      }
    });
  });
}

async function revertPatchWithPython(patchId) {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python3', ['-m', 'gpt_cursor_runner.patch_runner', '--revert', patchId], {
      cwd: process.cwd()
    });
    
    let output = '';
    let error = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, message: output.trim() });
      } else {
        resolve({ success: false, message: error.trim() || 'Unknown error' });
      }
    });
  });
}

async function getPythonMetrics() {
  try {
    const metricsFile = path.join(process.cwd(), 'data', 'patch-metrics.json');
    const data = await fs.readFile(metricsFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function performHealthChecks() {
  const checks = {};
  
  // Check Python runner
  const runnerStatus = await checkPythonRunnerStatus();
  checks['Python Runner'] = {
    healthy: runnerStatus.running,
    message: runnerStatus.error
  };
  
  // Check patch manager
  try {
    await patchManager.getPatchStats();
    checks['Patch Manager'] = { healthy: true };
  } catch (error) {
    checks['Patch Manager'] = { healthy: false, message: error.message };
  }
  
  // Check file system
  try {
    await fs.access(path.join(process.cwd(), 'patches'));
    await fs.access(path.join(process.cwd(), 'data'));
    checks['File System'] = { healthy: true };
  } catch (error) {
    checks['File System'] = { healthy: false, message: error.message };
  }
  
  return checks;
} 