/* eslint-disable */
const { spawn } = require('child_process');
const http = require('http');
const MAIN = "/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh";
const run = (bin, args, timeoutMs=15000) => new Promise((res)=>{
  const p = spawn(bin, args, { cwd: MAIN, stdio: 'ignore' });
  const t = setTimeout(()=>{ try{ p.kill('SIGKILL'); }catch(_){ } res(124); }, timeoutMs);
  p.on('exit', c => { clearTimeout(t); res(c ?? 1); });
  p.on('error', ()=> res(127));
});
const ping = (port=8081) => new Promise((resolve)=>{
  const req = http.get({ host:'127.0.0.1', port, path:'/' }, (r)=>{ r.resume(); resolve(r.statusCode||0); });
  req.on('error', ()=> resolve(0));
});
(async () => {
  await run('npx', ['expo','--version'], 10000); // visibility only
  const status = await ping(8081);
  console.log(`[runtime] metro:${status||0}`);
  process.exit(0);
})();
