/* eslint-disable */
const { spawn } = require('child_process');
const p = spawn('npx', ['tsc', '--noEmit'], { stdio: 'inherit' });
const timer = setTimeout(() => { try { p.kill('SIGKILL'); } catch(_){}; process.exitCode = 124; }, 30000);
p.on('exit', (code) => { clearTimeout(timer); process.exit(code ?? 1); });
