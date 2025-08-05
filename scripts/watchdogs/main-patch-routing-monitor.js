// MAIN Patch Routing Monitor - Ensures MAIN patch routing is always working
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

// ABSOLUTE PATHS ONLY
const PATHS = {
  MAIN_PATCHES: '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches',
  MAIN_INBOX: '/Users/sawyer/gitSync/.cursor-cache/MAIN/ui-patch-inbox',
  MAIN_SUMMARIES: '/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries',
  LOGS: '/Users/sawyer/gitSync/gpt-cursor-runner/logs'
};

const LOG_FILE = path.join(PATHS.LOGS, 'main-patch-routing-monitor.log');

// Ensure log directory exists
if (!fs.existsSync(PATHS.LOGS)) {
  fs.mkdirSync(PATHS.LOGS, { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [MAIN-ROUTING-MONITOR] ${message}\n`;
  
  // Write to console
  console.log(logMessage.trim());
  
  // Write to log file
  try {
    fs.appendFileSync(LOG_FILE, logMessage);
  } catch (_e) {
    console.error(`[LOG ERROR] ${e.message}`);
  }
}

// Check if process is running
function isProcessRunning(processName) {
  try {
    const result = execSync(`ps aux | grep "${processName}" | grep -v grep | wc -l`, { encoding: 'utf8' });
    return parseInt(result.trim()) > 0;
  } catch (_e) {
    return false;
  }
}

// Start process if not running
function startProcess(processName, scriptPath) {
  if (!isProcessRunning(processName)) {
    log(`🚀 Starting ${processName}...`);
    spawn('node', [scriptPath], {
      detached: true,
      stdio: 'ignore'
    }).unref();
    return true;
  }
  return false;
}

// Check patch routing health
function checkPatchRoutingHealth() {
  const health = {
    timestamp: new Date().toISOString(),
    processes: {},
    directories: {},
    routing: {}
  };

  // Check critical processes
  health.processes.ghostBridge = isProcessRunning('ghost-bridge');
  health.processes.patchRelayMain = isProcessRunning('patch-relay-main');
  health.processes.patchExecutor = isProcessRunning('patch_executor_daemon.py');

  // Check directories
  health.directories.mainPatches = fs.existsSync(PATHS.MAIN_PATCHES);
  health.directories.mainInbox = fs.existsSync(PATHS.MAIN_INBOX);
  health.directories.mainSummaries = fs.existsSync(PATHS.MAIN_SUMMARIES);

  // Check routing activity
  try {
    const inboxFiles = fs.readdirSync(PATHS.MAIN_INBOX).filter(f => f.endsWith('.json'));
    const patchFiles = fs.readdirSync(PATHS.MAIN_PATCHES).filter(f => f.endsWith('.json'));
    const completedFiles = fs.readdirSync(path.join(PATHS.MAIN_PATCHES, '.completed')).filter(f => f.endsWith('.json'));
    
    health.routing = {
      inboxCount: inboxFiles.length,
      patchCount: patchFiles.length,
      completedCount: completedFiles.length,
      lastActivity: getLastActivity()
    };
  } catch (_e) {
    health.routing = { error: e.message };
  }

  return health;
}

// Get last activity timestamp
function getLastActivity() {
  try {
    const stats = fs.statSync(PATHS.MAIN_PATCHES);
    return stats.mtime.toISOString();
  } catch (_e) {
    return null;
  }
}

// Restart failed processes
function restartFailedProcesses() {
  let restarted = 0;

  if (!isProcessRunning('ghost-bridge')) {
    startProcess('ghost-bridge', 'scripts/hooks/ghost-bridge.js');
    restarted++;
  }

  if (!isProcessRunning('patch-relay-main')) {
    startProcess('patch-relay-main', 'scripts/bridge/patch-relay-main.js');
    restarted++;
  }

  if (!isProcessRunning('patch_executor_daemon.py')) {
    startProcess('patch_executor_daemon.py', 'python3 patch_executor_daemon.py --patches-dir /Users/sawyer/gitSync/.cursor-cache/MAIN/patches');
    restarted++;
  }

  if (restarted > 0) {
    log(`🔄 Restarted ${restarted} failed processes`);
  }

  return restarted;
}

// Main monitoring loop
function monitor() {
  log('🔍 Starting MAIN patch routing health check...');
  
  const health = checkPatchRoutingHealth();
  
  // Log health status
  log('📊 Health Status:');
  log(`  - Ghost Bridge: ${health.processes.ghostBridge ? '✅' : '❌'}`);
  log(`  - Patch Relay MAIN: ${health.processes.patchRelayMain ? '✅' : '❌'}`);
  log(`  - Patch Executor: ${health.processes.patchExecutor ? '✅' : '❌'}`);
  log(`  - MAIN Patches Dir: ${health.directories.mainPatches ? '✅' : '❌'}`);
  log(`  - MAIN Inbox Dir: ${health.directories.mainInbox ? '✅' : '❌'}`);
  log(`  - MAIN Summaries Dir: ${health.directories.mainSummaries ? '✅' : '❌'}`);
  log(`  - Inbox Files: ${health.routing.inboxCount || 0}`);
  log(`  - Patch Files: ${health.routing.patchCount || 0}`);
  log(`  - Completed Files: ${health.routing.completedCount || 0}`);

  // Restart failed processes
  const restarted = restartFailedProcesses();
  
  if (restarted > 0) {
    log(`⚠️  System recovery: ${restarted} processes restarted`);
  } else {
    log('✅ All systems healthy');
  }

  // Check for stuck patches
  if (health.routing.inboxCount > 0) {
    log(`⚠️  Warning: ${health.routing.inboxCount} patches stuck in inbox`);
  }

  if (health.routing.patchCount > 5) {
    log(`⚠️  Warning: ${health.routing.patchCount} patches in queue (high)`);
  }
}

// Start monitoring
log('🚀 MAIN Patch Routing Monitor started');
log('📁 Monitoring paths:');
log(`  - MAIN Patches: ${PATHS.MAIN_PATCHES}`);
log(`  - MAIN Inbox: ${PATHS.MAIN_INBOX}`);
log(`  - MAIN Summaries: ${PATHS.MAIN_SUMMARIES}`);

// Initial health check
monitor();

// Monitor every 30 seconds
setInterval(monitor, 30000);

// Graceful shutdown
process.on('SIGINT', () => {
  log('🛑 MAIN Patch Routing Monitor shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('🛑 MAIN Patch Routing Monitor shutting down...');
  process.exit(0);
}); 