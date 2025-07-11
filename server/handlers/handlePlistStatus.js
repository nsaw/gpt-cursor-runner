const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Handle /plist-status command
 * Returns per-agent launchd .plist health status
 */
async function handlePlistStatus(req, res) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    console.log('🔍 Checking launchd .plist status across agents...');
    
    // Get all launchd services
    const { stdout: launchctlOutput } = await execAsync('launchctl list');
    
    // Parse launchd output to find our watchdog services
    const watchdogServices = [];
    const lines = launchctlOutput.split('\n');
    
    for (const line of lines) {
      if (line.includes('com.thoughtmarks.watchdog')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const pid = parts[0];
          const exitCode = parts[1];
          const label = parts[2];
          
          watchdogServices.push({
            label,
            pid: pid === '-' ? null : parseInt(pid),
            exitCode: exitCode === '-' ? null : parseInt(exitCode),
            isRunning: pid !== '-' && exitCode === '0',
            lastExitCode: exitCode === '-' ? null : parseInt(exitCode)
          });
        }
      }
    }
    
    // Check .plist file existence for each service
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const launchAgentsDir = path.join(homeDir, 'Library', 'LaunchAgents');
    
    for (const service of watchdogServices) {
      const plistPath = path.join(launchAgentsDir, `${service.label}.plist`);
      service.plistExists = fs.existsSync(plistPath);
      service.plistPath = plistPath;
      
      // Get .plist file info if it exists
      if (service.plistExists) {
        try {
          const stats = fs.statSync(plistPath);
          service.plistLastModified = stats.mtime;
          service.plistSize = stats.size;
        } catch (error) {
          service.plistError = error.message;
        }
      }
    }
    
    // Get process info for running services
    for (const service of watchdogServices) {
      if (service.pid && service.isRunning) {
        try {
          const { stdout: psOutput } = await execAsync(`ps -p ${service.pid} -o pid,ppid,etime,pcpu,pmem,command`);
          const psLines = psOutput.trim().split('\n');
          if (psLines.length > 1) {
            const processInfo = psLines[1].trim().split(/\s+/);
            service.processInfo = {
              pid: service.pid,
              ppid: parseInt(processInfo[1]),
              elapsed: processInfo[2],
              cpu: parseFloat(processInfo[3]),
              memory: parseFloat(processInfo[4]),
              command: processInfo.slice(5).join(' ')
            };
          }
        } catch (error) {
          service.processError = error.message;
        }
      }
    }
    
    // Get system-wide launchd status
    const systemStatus = {
      timestamp: new Date().toISOString(),
      hostname: require('os').hostname(),
      user: process.env.USER || process.env.USERNAME,
      totalServices: watchdogServices.length,
      runningServices: watchdogServices.filter(s => s.isRunning).length,
      failedServices: watchdogServices.filter(s => s.exitCode && s.exitCode !== 0).length
    };
    
    const response = {
      success: true,
      systemStatus,
      services: watchdogServices,
      summary: {
        healthy: watchdogServices.filter(s => s.isRunning && s.plistExists).length,
        unhealthy: watchdogServices.filter(s => !s.isRunning || !s.plistExists).length,
        missing: watchdogServices.filter(s => !s.plistExists).length,
        crashed: watchdogServices.filter(s => s.exitCode && s.exitCode !== 0).length
      }
    };
    
    // Format response for Slack
    if (req.body && req.body.command === '/plist-status') {
      const slackResponse = formatSlackResponse(response);
      res.json(slackResponse);
    } else {
      // API response
      res.json(response);
    }
    
  } catch (error) {
    console.error('❌ Error checking plist status:', error);
    
    const errorResponse = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    if (req.body && req.body.command === '/plist-status') {
      res.json({
        response_type: 'ephemeral',
        text: `❌ Error checking plist status: ${error.message}`
      });
    } else {
      res.status(500).json(errorResponse);
    }
  }
}

/**
 * Format response for Slack
 */
function formatSlackResponse(data) {
  const { systemStatus, services, summary } = data;
  
  let text = `🔍 *Launchd .plist Status Report*\n`;
  text += `📊 *System Overview*\n`;
  text += `• Host: ${systemStatus.hostname}\n`;
  text += `• User: ${systemStatus.user}\n`;
  text += `• Total Services: ${systemStatus.totalServices}\n`;
  text += `• Running: ${systemStatus.runningServices} ✅\n`;
  text += `• Failed: ${systemStatus.failedServices} ❌\n\n`;
  
  text += `📈 *Summary*\n`;
  text += `• Healthy: ${summary.healthy} ✅\n`;
  text += `• Unhealthy: ${summary.unhealthy} ⚠️\n`;
  text += `• Missing .plist: ${summary.missing} ❌\n`;
  text += `• Crashed: ${summary.crashed} 💥\n\n`;
  
  if (services.length > 0) {
    text += `🔧 *Service Details*\n`;
    services.forEach(service => {
      const status = service.isRunning ? '✅' : '❌';
      const plistStatus = service.plistExists ? '📄' : '❌';
      const crashInfo = service.exitCode && service.exitCode !== 0 ? ` (exit: ${service.exitCode})` : '';
      
      text += `${status} ${plistStatus} \`${service.label}\`\n`;
      if (service.pid) {
        text += `  • PID: ${service.pid}\n`;
      }
      if (service.processInfo) {
        text += `  • Uptime: ${service.processInfo.elapsed}\n`;
        text += `  • CPU: ${service.processInfo.cpu}% | Memory: ${service.processInfo.memory}%\n`;
      }
      if (crashInfo) {
        text += `  • ${crashInfo}\n`;
      }
      text += '\n';
    });
  } else {
    text += `⚠️ No watchdog services found\n`;
  }
  
  return {
    response_type: 'ephemeral',
    text: text,
    attachments: [{
      color: summary.unhealthy > 0 ? 'warning' : 'good',
      fields: [
        {
          title: 'Healthy Services',
          value: summary.healthy.toString(),
          short: true
        },
        {
          title: 'Unhealthy Services',
          value: summary.unhealthy.toString(),
          short: true
        },
        {
          title: 'Crashed Services',
          value: summary.crashed.toString(),
          short: true
        },
        {
          title: 'Missing .plist Files',
          value: summary.missing.toString(),
          short: true
        }
      ],
      footer: `Last updated: ${new Date().toLocaleString()}`
    }]
  };
}

module.exports = handlePlistStatus; 