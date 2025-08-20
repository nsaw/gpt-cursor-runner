/* eslint-disable */
const { spawn } = require('child_process');
const http = require('http');
const { existsSync } = require('fs');
const ROOT = '/Users/sawyer/gitSync/gpt-cursor-runner';
const run = (bin, args, timeoutMs=30000, stdio='ignore', detached=false) => new Promise((res)=>{
  const p = spawn(bin, args, { cwd: ROOT, stdio, detached });
  const t = setTimeout(()=>{ try{ p.kill('SIGKILL'); }catch(_){ } res(124); }, timeoutMs);
  p.on('exit', c => { clearTimeout(t); res(c ?? 1); });
  p.on('error', ()=> res(127));
});
const ping = (port=8081) => new Promise((resolve)=>{
  const req = http.get({ host:'127.0.0.1', port, path:'/' }, (r)=>{ r.resume(); resolve(r.statusCode||0); });
  req.on('error', ()=> resolve(0));
});

(async () => {
  // Step 1: kill:packagers
  let code = await run('node', ['scripts/ci/run_npm_script_once.js','kill:packagers'], 30000, 'inherit');
  if (code !== 0) { await run('node', ['scripts/ci/kill_packagers_fallback_once.js'], 30000, 'inherit'); }

  // Step 2: clean:caches
  code = await run('node', ['scripts/ci/run_npm_script_once.js','clean:caches'], 30000, 'inherit');
  if (code !== 0) { await run('node', ['scripts/ci/clean_caches_fallback_once.js'], 30000, 'inherit'); }

  // Step 3: validate:runtime (user-proven)
  code = await run('node', ['scripts/ci/run_npm_script_once.js','validate:runtime'], 60000, 'inherit');
  // Step 4: verify Metro port (8081). If not up, fallback to starting Expo directly.
  let status = 0; const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    status = await ping(8081);
    if (status >= 200 && status < 500) break;
    await new Promise(r=>setTimeout(r,1500));
  }
  if (!(status >= 200 && status < 500)) {
    // Fallback: start expo (detached) and re-ping
    await run('npx', ['expo','start','--ios','--clear'], 5000, 'ignore', true);
    const dl = Date.now() + 30000; status = 0;
    while (Date.now() < dl) {
      status = await ping(8081);
      if (status >= 200 && status < 500) break;
      await new Promise(r=>setTimeout(r,1500));
    }
  }
  process.exit((status >= 200 && status < 500) ? 0 : 1);
})();
