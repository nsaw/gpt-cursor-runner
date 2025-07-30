// Emergency Ghost Recovery Script — kill-zombies.js
const { execSync } = require('child_process');

const patterns = [
  'ghost-bridge', 'orchestrator.js', 'summary-monitor', 'patch-executor',
  'heartbeat-loop', 'realtime-monitor', 'node'
];

patterns.forEach(p => {
  try {
    console.log(`[KILL] ${p}`);
    execSync(`pkill -f ${p}`);
  } catch (_e) {
    console.log(`[INFO] ${p} already dead`);
  }
});

console.log('[OK] All zombie processes terminated.'); 