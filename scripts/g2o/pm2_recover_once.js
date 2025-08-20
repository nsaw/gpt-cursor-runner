/* eslint-disable */
const { spawn } = require('child_process');
const fs = require('fs');
const PLAN = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_recover_plan.json';
const RESULT = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_recover_result.json';
const allow = (process.env.PM2_ALLOW||'g2o-completed-validator,g2o-executor,g2o-handoff-watcher,main-failure-emitter,main-queue-counters,p0-patch-sla-watch,p0-queue-shape-assessor').split(',');
const pm2 = (args, ms=15000) => new Promise((res)=>{
  const p = spawn('pm2', args, { stdio:['ignore','pipe','pipe'] });
  const t = setTimeout(()=>{ try{ p.kill('SIGKILL'); }catch(_){ } res({code:124, out:'', err:'timeout'}); }, ms);
  let out='', err=''; p.stdout.on('data',d=> out+=d); p.stderr.on('data',d=> err+=d);
  p.on('exit',c=>{ clearTimeout(t); res({code:c??1,out,err}); });
  p.on('error',()=> res({code:127,out:'',err:'spawn-error'}));
});
const jlist = async ()=> {
  const r = await pm2(['jlist'], 15000); try { return JSON.parse(r.out||'[]'); } catch { return []; }
};
(async ()=>{
  const list = await jlist();
  const bad = list.filter(p=> allow.includes(p.name) && ['errored','stopped','unknown'].includes(p.pm2_env?.status||''));
  fs.writeFileSync(PLAN, JSON.stringify({ allow, candidates: bad.map(b=>({name:b.name,status:b.pm2_env?.status})) }, null, 2));
  const actions = [];
  for (const b of bad) {
    actions.push({ name:b.name, step:'restart' });
    await pm2(['restart', b.name], 15000);
    // Verify
    let ok=false;
    for (let i=0;i<3;i++){
      const after = await jlist();
      const now = after.find(x=>x.name===b.name);
      if (now && now.pm2_env && now.pm2_env.status==='online') { ok=true; break; }
      await new Promise(r=>setTimeout(r,1000));
    }
    if (!ok) {
      actions.push({ name:b.name, step:'restart-failed' });
    } else {
      actions.push({ name:b.name, step:'online' });
    }
  }
  fs.writeFileSync(RESULT, JSON.stringify({ actions }, null, 2));
  process.exit(0);
})();
