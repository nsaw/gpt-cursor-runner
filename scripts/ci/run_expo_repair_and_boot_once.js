/* eslint-disable */
const { spawn } = require('child_process');
const http = require('http');
const { existsSync } = require('fs');
const ROOT = '/Users/sawyer/gitSync/gpt-cursor-runner';
const EXPO_ROOT = '/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh';

const run = (bin, args, timeoutMs=30000, stdio='ignore', detached=false, cwd=ROOT) => new Promise((res)=>{
  const p = spawn(bin, args, { cwd, stdio, detached });
  const t = setTimeout(()=>{ try{ p.kill('SIGKILL'); }catch(_){ } res(124); }, timeoutMs);
  p.on('exit', c => { clearTimeout(t); res(c ?? 1); });
  p.on('error', ()=> res(127));
});

const ping = (port=8081) => new Promise((resolve)=>{
  const req = http.get({ host:'127.0.0.1', port, path:'/' }, (r)=>{ r.resume(); resolve(r.statusCode||0); });
  req.on('error', ()=> resolve(0));
});

(async () => {
  // Step 1: kill:packagers (from gpt-cursor-runner)
  let code = await run('node', ['scripts/ci/kill_packagers_fallback_once.js'], 15000, 'inherit');
  console.log(`[expo-repair] kill:packagers exit: ${code}`);

  // Step 2: clean:caches (from gpt-cursor-runner)
  code = await run('node', ['scripts/ci/clean_caches_fallback_once.js'], 15000, 'inherit');
  console.log(`[expo-repair] clean:caches exit: ${code}`);

  // Step 3: validate:runtime (from gpt-cursor-runner)
  code = await run('node', ['scripts/ci/run_validate_runtime_once.js'], 30000, 'inherit');
  console.log(`[expo-repair] validate:runtime exit: ${code}`);

  // Step 4: Start Expo (from mobile-native-fresh directory)
  console.log('[expo-repair] Starting Expo from mobile-native-fresh...');
  const expo = spawn('npx', ['expo', 'start', '--ios', '--clear'], {
    cwd: EXPO_ROOT,
    stdio: 'ignore',
    detached: true
  });

  // Step 5: Wait for port 8081 to respond
  const deadline = Date.now() + 30000;
  let status = 0;
  while (Date.now() < deadline) {
    status = await ping(8081);
    if (status >= 200 && status < 500) {
      console.log(`[expo-repair] Expo started successfully (port 8081: ${status})`);
      break;
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  // Cleanup
  try { process.kill(-expo.pid, 0); } catch {}
  process.exit((status >= 200 && status < 500) ? 0 : 1);
})();
