const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');

/**
 * Handle recovery status requests
 * Provides information about recovery systems, fallback loops, and repair bridges
 */
async function handleRecoveryStatus(req, res) {
  try {
    const operationUuid = require('crypto').randomUUID();
    const startTime = Date.now();
        
    console.log(`[${new Date().toISOString()}] [${operationUuid}] 🔄 Processing recovery status request`);
        
    // Get recovery status
    const recoveryStatus = await getRecoveryStatus();
        
    // Format response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      operationUuid,
      duration: Date.now() - startTime,
      data: recoveryStatus
    };
        
    console.log(`[${new Date().toISOString()}] [${operationUuid}] ✅ Recovery status retrieved successfully`);
        
    res.json(response);
        
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Recovery status error:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Get comprehensive recovery status
 */
async function getRecoveryStatus() {
  const status = {
    fallbackLoop: null,
    ghostAutoInit: null,
    repairBridge: null,
    cronJobs: null,
    launchdServices: null,
    logFiles: null,
    timestamp: new Date().toISOString()
  };
    
  try {
    // Check fallback runner loop
    try {
      const fallbackScript = path.join(__dirname, '../../scripts/fallback-runner-loop.sh');
      if (fs.existsSync(fallbackScript)) {
        const { stdout } = await execAsync('ps aux | grep fallback-runner-loop | grep -v grep');
        status.fallbackLoop = {
          scriptExists: true,
          running: stdout.trim().length > 0,
          details: stdout.trim() || 'Not running'
        };
      } else {
        status.fallbackLoop = {
          scriptExists: false,
          running: false,
          error: 'Script not found'
        };
      }
    } catch (error) {
      status.fallbackLoop = {
        scriptExists: true,
        running: false,
        error: error.message
      };
    }
        
    // Check GHOST auto-init
    try {
      const ghostScript = path.join(__dirname, '../../scripts/ghost-auto-init.sh');
      if (fs.existsSync(ghostScript)) {
        const { stdout } = await execAsync('ps aux | grep ghost-auto-init | grep -v grep');
        status.ghostAutoInit = {
          scriptExists: true,
          running: stdout.trim().length > 0,
          details: stdout.trim() || 'Not running'
        };
      } else {
        status.ghostAutoInit = {
          scriptExists: false,
          running: false,
          error: 'Script not found'
        };
      }
    } catch (error) {
      status.ghostAutoInit = {
        scriptExists: true,
        running: false,
        error: error.message
      };
    }
        
    // Check repair bridge
    try {
      const repairScript = path.join(__dirname, '../../scripts/repair-bridge.sh');
      if (fs.existsSync(repairScript)) {
        const { stdout } = await execAsync('ps aux | grep repair-bridge | grep -v grep');
        status.repairBridge = {
          scriptExists: true,
          running: stdout.trim().length > 0,
          details: stdout.trim() || 'Not running'
        };
      } else {
        status.repairBridge = {
          scriptExists: false,
          running: false,
          error: 'Script not found'
        };
      }
    } catch (error) {
      status.repairBridge = {
        scriptExists: true,
        running: false,
        error: error.message
      };
    }
        
    // Check cron jobs
    try {
      const { stdout } = await execAsync('crontab -l 2>/dev/null | grep -E "(fallback|watchdog|tunnel)" || echo "No recovery cron jobs found"');
      status.cronJobs = {
        active: stdout.trim().length > 0,
        details: stdout.trim()
      };
    } catch (error) {
      status.cronJobs = {
        active: false,
        error: error.message
      };
    }
        
    // Check launchd services
    try {
      const { stdout } = await execAsync('launchctl list | grep -E "(watchdog|flylog|ghost)" || echo "No recovery launchd services found"');
      status.launchdServices = {
        active: stdout.trim().length > 0,
        details: stdout.trim()
      };
    } catch (error) {
      status.launchdServices = {
        active: false,
        error: error.message
      };
    }
        
    // Check log files
    try {
      const logDir = path.join(__dirname, '../../logs');
      const logFiles = fs.readdirSync(logDir).filter(file => 
        file.includes('fallback') || 
                file.includes('repair') || 
                file.includes('ghost') ||
                file.includes('watchdog')
      );
            
      status.logFiles = {
        count: logFiles.length,
        files: logFiles,
        totalSize: logFiles.reduce((total, file) => {
          try {
            const stats = fs.statSync(path.join(logDir, file));
            return total + stats.size;
          } catch {
            return total;
          }
        }, 0)
      };
    } catch (error) {
      status.logFiles = {
        count: 0,
        error: error.message
      };
    }
        
  } catch (error) {
    console.error('Error getting recovery status:', error);
    status.error = error.message;
  }
    
  return status;
}

/**
 * Get detailed service information
 */
async function getServiceDetails(serviceName) {
  try {
    const { stdout } = await execAsync(`ps aux | grep ${serviceName} | grep -v grep`);
    return {
      active: true,
      details: stdout.trim()
    };
  } catch (error) {
    return {
      active: false,
      error: error.message
    };
  }
}

/**
 * Start a recovery service
 */
async function startRecoveryService(serviceName) {
  try {
    const scriptPath = path.join(__dirname, `../../scripts/${serviceName}.sh`);
    if (!fs.existsSync(scriptPath)) {
      return { success: false, error: `Script ${serviceName}.sh not found` };
    }
        
    await execAsync(`${scriptPath} --init`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Stop a recovery service
 */
async function stopRecoveryService(serviceName) {
  try {
    await execAsync(`pkill -f ${serviceName}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  handleRecoveryStatus,
  getRecoveryStatus,
  getServiceDetails,
  startRecoveryService,
  stopRecoveryService
}; 