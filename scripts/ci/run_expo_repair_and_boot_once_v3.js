/* eslint-disable */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const MAIN = "/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh";
const run = (bin, args, timeoutMs=30000, stdio='inherit', detached=false) => new Promise((res)=>{
  const p = spawn(bin, args, { cwd: MAIN, stdio, detached });
  const t = setTimeout(()=>{ try{ p.kill('SIGKILL'); }catch(_){ } res(124); }, timeoutMs);
  p.on('exit', c => { clearTimeout(t); res(c ?? 1); });
  p.on('error', ()=> res(127));
});
const ping = (port=8081) => new Promise((resolve)=>{
  const req = http.get({ host:'127.0.0.1', port, path:'/' }, (r)=>{ r.resume(); resolve(r.statusCode||0); });
  req.on('error', ()=> resolve(0));
});
(async () => {
  // Step 1: kill packagers (if present)
  await run('npm', ['run','kill:packagers','--silent'], 30000).catch(()=>{});
  // Step 2: clean caches
  await run('npm', ['run','clean:caches','--silent'], 30000).catch(()=>{});
  // Step 3: validate:runtime (user-proven)
  await run('npm', ['run','validate:runtime','--silent'], 60000).catch(()=>{});
  // Step 4: verify Metro (8081) or fallback start
  let status = 0; const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    status = await ping(8081); if (status>=200 && status<500) break;
    await new Promise(r=>setTimeout(r,1500));
  }
  if (!(status>=200 && status<500)) {
    await run('npx', ['expo','start','--ios','--clear'], 5000, 'ignore', true);
    const dl = Date.now() + 30000;
    while (Date.now() < dl) {
      status = await ping(8081); if (status>=200 && status<500) break;
      await new Promise(r=>setTimeout(r,1500));
    }
  }
  process.exit((status>=200 && status<500) ? 0 : 1);
})();
