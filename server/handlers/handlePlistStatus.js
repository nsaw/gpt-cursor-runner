const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Handle plist status requests
 * Provides launchd status for watchdog and other services
 */
async function handlePlistStatus(req, res) {
  try {
    const operationUuid = require('crypto').randomUUID();
    const startTime = Date.now();
        
    console.log(`[${new Date().toISOString()}] [${operationUuid}] 📋 Processing plist status request`);
        
    // Get launchd status for all relevant services
    const plistStatus = await getPlistStatus();
        
    // Format response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      operationUuid,
      duration: Date.now() - startTime,
      data: plistStatus
    };
        
    console.log(`[${new Date().toISOString()}] [${operationUuid}] ✅ Plist status retrieved successfully`);
        
    res.json(response);
        
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Plist status error:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Get launchd status for all relevant services
 */
async function getPlistStatus() {
  const status = {
    watchdog: null,
    flylog: null,
    ghost: null,
    timestamp: new Date().toISOString()
  };
    
  try {
    // Check watchdog plist status
    try {
      const { stdout: watchdogOutput } = await execAsync('launchctl list | grep com.thoughtmarks.watchdog');
      status.watchdog = {
        active: true,
        details: watchdogOutput.trim()
      };
    } catch (error) {
      status.watchdog = {
        active: false,
        error: error.message
      };
    }
        
    // Check Fly log daemon status
    try {
      const { stdout: flylogOutput } = await execAsync('launchctl list | grep com.gpt.flylog');
      status.flylog = {
        active: true,
        details: flylogOutput.trim()
      };
    } catch (error) {
      status.flylog = {
        active: false,
        error: error.message
      };
    }
        
    // Check for any GHOST-related services
    try {
      const { stdout: ghostOutput } = await execAsync('launchctl list | grep -i ghost');
      status.ghost = {
        active: ghostOutput.trim().length > 0,
        details: ghostOutput.trim() || 'No GHOST services found'
      };
    } catch (error) {
      status.ghost = {
        active: false,
        error: error.message
      };
    }
        
    // Get overall launchd status
    try {
      const { stdout: overallOutput } = await execAsync('launchctl list | wc -l');
      status.totalServices = parseInt(overallOutput.trim());
    } catch (error) {
      status.totalServices = 'unknown';
    }
        
  } catch (error) {
    console.error('Error getting plist status:', error);
    status.error = error.message;
  }
    
  return status;
}

/**
 * Get detailed service information
 */
async function getServiceDetails(serviceName) {
  try {
    const { stdout } = await execAsync(`launchctl list | grep ${serviceName}`);
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
 * Load a plist file
 */
async function loadPlist(plistPath) {
  try {
    await execAsync(`launchctl load "${plistPath}"`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Unload a plist file
 */
async function unloadPlist(plistPath) {
  try {
    await execAsync(`launchctl unload "${plistPath}"`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  handlePlistStatus,
  getPlistStatus,
  getServiceDetails,
  loadPlist,
  unloadPlist
}; 