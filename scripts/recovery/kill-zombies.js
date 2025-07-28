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
  } catch (e) {
    console.log(`[INFO] ${p} already dead`);
  }
});

console.log('[OK] All zombie processes terminated.'); 