/* eslint-disable */
const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
const PLAN="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_converge_plan.json";
const RESULT="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_converge_result.json";
const OUT_T="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_converge_out_tail.log";
const ERR_T="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_converge_err_tail.log";
const ROOT="/Users/sawyer/gitSync/gpt-cursor-runner";
const ALLOW=['dashboard','g2o-completed-validator','g2o-executor','g2o-handoff-watcher','g2o-queue-reader','g2o-reporter','main-failure-emitter','main-queue-counters','p0-fail-halt-watch','p0-patch-sla-watch','p0-queue-shape-assessor','p0-release-on-sum','p0-seed-sla-watch','phase-orchestrator','webhook-server'];
const FALLBACK={
  'g2o-executor': path.join(ROOT,'scripts/monitor/g2o_executor_heartbeat_once.js'),
  'p0-queue-shape-assessor': path.join(ROOT,'scripts/monitor/p0_queue_shape_assessor_once.js'),
};
const pm2=(args,ms=15000)=>new Promise(res=>{
  const p=spawn('pm2',args,{stdio:['ignore','pipe','pipe']});
  let out='',err=''; const t=setTimeout(()=>{try{p.kill('SIGKILL');}catch(_){ }res({code:124,out,err:'timeout'})},ms);
  p.stdout.on('data',d=>out+=d); p.stderr.on('data',d=>err+=d);
  p.on('exit',c=>{clearTimeout(t); res({code:c??1,out,err});}); p.on('error',()=>res({code:127,out:'',err:'spawn-error'}));
});
const jlist=async()=>{ const r=await pm2(['jlist']); try{ return JSON.parse(r.out||'[]'); }catch{ return []; } };
const tail=(f,sz=4096)=>{ try{ const st=fs.statSync(f); const pos=Math.max(0,st.size-sz);
  const fd=fs.openSync(f,'r'); const buf=Buffer.alloc(st.size-pos); fs.readSync(fd,buf,0,buf.length,pos); fs.closeSync(fd); return buf.toString('utf8'); }catch{ return ''; } };
(async()=>{
  fs.mkdirSync(path.dirname(PLAN),{recursive:true});
  const actions=[];
  const initial=await jlist();
  // Deduplicate: if multiple of same name, prefer ONLINE newest; delete others
  for(const name of ALLOW){
    const group = initial.filter(p=>p.name===name);
    if (group.length>1){
      const keep = group.find(p=>p.pm2_env?.status==='online') || group[0];
      for(const g of group){ if (g.pm_id!==keep.pm_id){ actions.push({name,step:'delete-duplicate',pm_id:g.pm_id}); await pm2(['delete', String(g.pm_id)]); } }
    }
  }
  // Recover errored or blank status
  const postDedup=await jlist();
  for(const name of ALLOW){
    const svc = postDedup.find(p=>p.name===name);
    const status = svc?.pm2_env?.status || 'unknown';
    if (status!=='online'){
      actions.push({name,step:'delete-if-exists'}); await pm2(['delete', name]);
      const script = (svc?.pm2_env?.pm_exec_path) || FALLBACK[name];
      actions.push({name,step:'start',script});
      if (script) await pm2(['start', script, '--name', name, '--time', '--restart-delay','3000','--max-restarts','5']);
      // verify small wait
      let ok=false, env={};
      for(let i=0;i<5;i++){ const now=(await jlist()).find(p=>p.name===name);
        if(now?.pm2_env?.status==='online'){ ok=true; env=now.pm2_env; break; } await new Promise(r=>setTimeout(r,1000)); }
      if(!ok){
        const outTail = tail(env.pm_out_log_path||''); const errTail = tail(env.pm_err_log_path||'');
        fs.writeFileSync(OUT_T, outTail, {flag:'a'}); fs.writeFileSync(ERR_T, errTail, {flag:'a'});
      }
    }
  }
  await pm2(['save']);
  const final=(await jlist()).filter(p=>ALLOW.includes(p.name)).map(p=>({name:p.name,status:p.pm2_env?.status||'unknown'}));
  fs.writeFileSync(PLAN, JSON.stringify({ allow: ALLOW }, null, 2));
  fs.writeFileSync(RESULT, JSON.stringify({ actions, final }, null, 2));
  process.exit(0);
})();
