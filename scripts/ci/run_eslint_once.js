/* eslint-disable */
const { spawn } = require('child_process');
const args = ['eslint', '.', '--ext', '.ts,.tsx,.js', '--max-warnings=0'];
const p = spawn('npx', args, { stdio: 'inherit' });
const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch(_){}; process.exitCode = 124; }, 30000);
p.on('exit', (c) => { clearTimeout(t); process.exit(c ?? 1); });
