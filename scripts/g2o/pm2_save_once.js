/* eslint-disable */
const { spawn } = require('child_process');
const p = spawn('pm2', ['save'], { stdio: 'inherit' });
const t = setTimeout(()=>{ try{ p.kill('SIGKILL'); }catch(_){ } process.exit(124); }, 15000);
p.on('exit', c => { clearTimeout(t); process.exit(c ?? 1); });
