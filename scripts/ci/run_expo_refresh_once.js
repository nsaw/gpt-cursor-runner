/* eslint-disable */
const { spawn, execSync } = require('child_process');
const http = require('http');
const PORT = 8081;
try { execSync(`lsof -ti:${PORT}`); } catch {}
// Kill anything on 8081 quietly (best-effort) - NB2.0 compliant
try { 
  const pids = execSync(`lsof -ti:${PORT}`, { encoding: 'utf8' }).trim().split('\n').filter(pid => pid);
  pids.forEach(pid => {
    try { execSync(`kill ${pid}`); } catch {}
  });
} catch {}
const p = spawn('npx', ['expo', 'start', '--ios', '--clear'], { stdio: 'ignore', detached: true });
const deadline = Date.now() + 30000;
const check = () => new Promise((resolve)=> {
  const req = http.get({ host: '127.0.0.1', port: PORT, path: '/' }, (res)=>{ res.resume(); resolve(res.statusCode); });
  req.on('error', ()=> resolve(0));
});
(async () => {
  let status = 0;
  while (Date.now() < deadline) {
    status = await check();
    if (status >= 200 && status < 500) break;
    await new Promise(r => setTimeout(r, 1500));
  }
  try { process.kill(-p.pid, 0); } catch {}
  // Do not kill Expo; leave running for validation pipeline
  process.exit(status ? 0 : 1);
})();
