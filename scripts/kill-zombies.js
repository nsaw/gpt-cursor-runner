const { execSync } = require('child_process');

console.log('[CLEANUP] Scanning for zombie ghost processes...');

try {
  // Find ghost-related processes
  const pids = execSync("ps aux | grep ghost | grep -v grep | awk '{print $2}'").toString().split('\n').filter(Boolean);
  
  if (pids.length === 0) {
    console.log('[CLEANUP] No zombie ghost processes found.');
    return;
  }
  
  console.log(`[CLEANUP] Found ${pids.length} ghost processes:`, pids);
  
  // Kill each process
  for (const pid of pids) {
    try {
      execSync(`kill -9 ${pid}`);
      console.log(`[CLEANUP] Killed process ${pid}`);
    } catch (e) {
      console.log(`[CLEANUP] Failed to kill ${pid}: ${e.message}`);
    }
  }
  
  console.log('[CLEANUP] Zombie ghost processes cleanup complete.');
} catch (e) {
  console.log('[CLEANUP] Error during cleanup:', e.message);
} 