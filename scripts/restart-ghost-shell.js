// Ghost Shell Restart Script
const { exec } = require('child_process');

console.log('[Restart] Initiating ghost shell restart...');

// Use the utility instead of inline node -e
exec('node /Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/ghost_shell_restart_once.js', (error, stdout, stderr) => {
  if (error) {
    console.error('[Restart] Failed to restart ghost shell:', error);
    return;
  }
  console.log('[Restart] Ghost shell restarted successfully');
});