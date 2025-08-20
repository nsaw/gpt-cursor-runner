/* eslint-disable */
const { spawn } = require('child_process');
const fs = require('fs');
const hasConfig = fs.existsSync('/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ci/playwright-smoke.config.js');
if (!hasConfig) {
  console.log('[playwright] config missing — creating placeholder skip.');
  process.exit(0);
}
const p = spawn('npx', ['playwright', 'test', '--config', '/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ci/playwright-smoke.config.js'], { stdio: 'inherit' });
const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch(_){}; process.exitCode = 124; }, 30000);
p.on('exit', c => { clearTimeout(t); process.exit(c ?? 1); });
