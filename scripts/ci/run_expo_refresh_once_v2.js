/* eslint-disable */
const { spawn } = require('child_process');
const http = require('http');
const PORT = 8081;
const p = spawn('npx', ['expo', 'start', '--ios', '--clear'], {
  cwd: '/Users/sawyer/gitSync/gpt-cursor-runner',
  stdio: 'ignore',
  detached: true
});
const deadline = Date.now() + 30000;
const ping = () => new Promise((resolve)=>{
  const req = http.get({ host:'127.0.0.1', port: PORT, path: '/' }, (res)=>{ res.resume(); resolve(res.statusCode||0); });
  req.on('error', ()=> resolve(0));
});
(async () => {
  let status = 0;
  while (Date.now() < deadline) {
    status = await ping();
    if (status >= 200 && status < 500) break;
    await new Promise(r=>setTimeout(r,1500));
  }
  try { process.kill(-p.pid, 0); } catch {}
  process.exit(status ? 0 : 1);
})();
