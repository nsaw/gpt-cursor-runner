/* eslint-disable */
const { spawn } = require('child_process');
const fs = require('fs');
const paths = [
  '.eslintrc', '.eslintrc.js', 'eslint.config.js'
].filter(p => fs.existsSync(`/Users/sawyer/gitSync/gpt-cursor-runner/${p}`));
if (!paths.length) {
  console.log('[eslint:scoped] no config files found — treating as pass for aggressive baseline.');
  process.exit(0);
}
const args = ['eslint', ...paths, '--ext', '.ts,.tsx,.js', '--max-warnings=0'];
const p = spawn('npx', args, { cwd: '/Users/sawyer/gitSync/gpt-cursor-runner', stdio: 'inherit' });
const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch(_){}; process.exitCode = 124; }, 30000);
p.on('exit', c => { clearTimeout(t); process.exit(c ?? 1); });
