/* eslint-disable */
const { spawn } = require('child_process');
const fs = require('fs');
const OUT = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_monitor.json';
const p = spawn('pm2', ['jlist'], { stdio: ['ignore','pipe','ignore'] });
let buf=''; p.stdout.on('data', d=> buf += d.toString());
const t=setTimeout(()=>{ try{ p.kill('SIGKILL'); }catch(_){ } try{ fs.writeFileSync(OUT, JSON.stringify({ error: 'timeout' })); }catch{} process.exit(0); }, 15000);
p.on('exit', ()=>{ clearTimeout(t);
  let json=null; try{ json = JSON.parse(buf); }catch{}
  const list = Array.isArray(json) ? json : [];
  const degraded = list.filter(p=>['errored','stopped','unknown'].includes((p.pm2_env&&p.pm2_env.status)||''));
  const summary = { total: list.length, degraded: degraded.map(d=>({ name:d.name, status:d.pm2_env?.status, restarts:d.pm2_env?.restart_time })) };
  try { fs.writeFileSync(OUT, JSON.stringify({ list, summary }, null, 2)); } catch {}
  process.exit(0);
});
