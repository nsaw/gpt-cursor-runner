/* eslint-disable */
const { spawn } = require('child_process');
const ports = [8081,19000,19001,19002];
const killPort = (port) => new Promise((resolve)=>{
  const lsof = spawn('lsof', ['-ti', `:${port}`], { stdio: ['ignore','pipe','ignore'] });
  let buf=''; lsof.stdout.on('data', d => buf += d.toString());
  lsof.on('exit', () => {
    const pids = buf.split(/\s+/).filter(Boolean);
    if (!pids.length) return resolve(false);
    let done=0;
    pids.forEach(pid=>{
      try { process.kill(parseInt(pid,10), 'SIGKILL'); } catch {}
      done++;
      if (done===pids.length) resolve(true);
    });
  });
});
(async () => {
  let any=false;
  for (const p of ports) { const k=await killPort(p); any = any || k; }
  console.log(`[kill-packagers:fallback] ${any ? 'killed some ports' : 'no processes on common ports'}`);
  process.exit(0);
})();
