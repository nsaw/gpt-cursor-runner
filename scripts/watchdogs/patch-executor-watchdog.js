// Auto-respawning watchdog for patch-executor
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG = path.join(__dirname, '../../.cursor-cache/logs/patch-runner-watchdog.log');
const EXEC = path.join(__dirname, '../patch-executor.js');

function safeLog(msg) {
  try {
    console.log(msg);
  } catch (_error) {
    // Silent fail for EPIPE or other stream errors
    try {
      fs.appendFileSync('/Users/sawyer/gitSync/gpt-cursor-runner/logs/patch-watchdog.log', 
        `[SAFE_LOG] ${new Date().toISOString()}: ${msg}\n`);
    } catch (logError) {}
  }
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(LOG, line);
  } catch (_error) {
    // Fallback to safe log if file write fails
    safeLog(`[WATCHDOG_LOG_ERROR] ${error.message}`);
  }
  safeLog(line.trim());
}

function startPatchExecutor() {
  log('Starting patch-executor.js...');
  const proc = spawn('node', [EXEC, '--watch'], {
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore']
  });
  proc.unref();
  log(`Patch executor started with PID: ${proc.pid}`);
}

(async function watchdogLoop() {
  log('Patch executor watchdog started - monitoring for crashes and restarts');
  
  while (true) {
    try {
      const out = spawn('pgrep', ['-f', 'patch-executor.js']);
      let data = '';
      
      out.stdout.on('data', chunk => data += chunk);
      out.stderr.on('data', chunk => {
        safeLog(`[WATCHDOG_ERROR] pgrep stderr: ${chunk}`);
      });
      
      out.on('close', code => {
        if (!data.trim()) {
          log('patch-executor.js is not running. Respawning...');
          startPatchExecutor();
        } else {
          const pids = data.trim().split('\n').filter(pid => pid);
          log(`patch-executor.js is running with PIDs: ${pids.join(', ')}`);
        }
      });
      
      out.on('error', error => {
        safeLog(`[WATCHDOG_ERROR] pgrep error: ${error.message}`);
      });
      
    } catch (_error) {
      safeLog(`[WATCHDOG_ERROR] Watchdog loop error: ${error.message}`);
    }
    
    await new Promise(res => setTimeout(res, 15000));
  }
})(); 