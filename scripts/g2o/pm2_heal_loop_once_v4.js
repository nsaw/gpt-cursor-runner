/* eslint-disable */
const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
const PLAN="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_heal_v4_plan.json";
const RESULT="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_heal_v4_result.json";
const OUT_T="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_heal_v4_out_tail.log";
const ERR_T="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_heal_v4_err_tail.log";
const ROOT="/Users/sawyer/gitSync/gpt-cursor-runner";
const ALLOW=['dashboard','g2o-completed-validator','g2o-executor','g2o-handoff-watcher','g2o-queue-reader','g2o-reporter','main-failure-emitter','main-queue-counters','p0-fail-halt-watch','p0-patch-sla-watch','p0-queue-shape-assessor','p0-release-on-sum','p0-seed-sla-watch','phase-orchestrator','webhook-server'];
const FALLBACK={
  'g2o-executor': path.join(ROOT,'scripts/monitor/g2o_executor_heartbeat_once.js'),
  'p0-queue-shape-assessor': path.join(ROOT,'scripts/monitor/p0_queue_shape_assessor_once.js'),
};
const pm2=(args,ms=20000)=>new Promise(res=>{
  const p=spawn('pm2',args,{stdio:['ignore','pipe','pipe']});
  let out='',err=''; const t=setTimeout(()=>{try{p.kill('SIGKILL');}catch(_){ }res({code:124,out,err:'timeout'})},ms);
  p.stdout.on('data',d=>out+=d); p.stderr.on('data',d=>err+=d);
  p.on('exit',c=>{clearTimeout(t);res({code:c??1,out,err});}); p.on('error',()=>res({code:127,out:'',err:'spawn-error'}));
});
const jlist=async()=>{ const r=await pm2(['jlist']); try{return JSON.parse(r.out||'[]');}catch{return[];}};
const tail=(f,sz=4096)=>{ try{ const st=fs.statSync(f); const pos=Math.max(0,st.size-sz);
  const fd=fs.openSync(f,'r'); const buf=Buffer.alloc(st.size-pos); fs.readSync(fd,buf,0,buf.length,pos); fs.closeSync(fd); return buf.toString('utf8'); }catch{ return ''; } };
(async()=>{
  fs.mkdirSync(path.dirname(PLAN),{recursive:true});
  const actions=[]; let cycles=0;
  while(cycles<6){
    cycles++;
    const list=await jlist();
    // 1) Deduplicate by name
    for(const name of ALLOW){
      const group=list.filter(p=>p.name===name);
      if(group.length>1){
        const keep = group.find(p=>p.pm2_env?.status==='online') || group[group.length-1];
        for(const g of group){ if (g.pm_id!==keep.pm_id){ actions.push({cycle:cycles,name,step:'delete-duplicate',pm_id:g.pm_id}); await pm2(['delete', String(g.pm_id)]); } }
      }
    }
    // 2) Recover non-online or blank
    const after=await jlist();
    for(const name of ALLOW){
      const svc = after.find(p=>p.name===name);
      const status = (svc?.pm2_env?.status||'').trim();
      if(status!=='online'){
        actions.push({cycle:cycles,name,step:'delete-if-exists'}); await pm2(['delete', name]);
        const script = (svc?.pm2_env?.pm_exec_path) || FALLBACK[name];
        actions.push({cycle:cycles,name,step:'start',script});
        if(script) await pm2(['start', script, '--name', name, '--time', '--restart-delay','5000','--max-restarts','8']);
        // Verify
        let ok=false, env={};
        for(let i=0;i<8;i++){ const chk=(await jlist()).find(p=>p.name===name);
          if(chk?.pm2_env?.status==='online'){ ok=true; env=chk.pm2_env; break; } await new Promise(r=>setTimeout(r,1000)); }
        if(!ok){
          const outTail=tail(env.pm_out_log_path||''); const errTail=tail(env.pm_err_log_path||'');
          fs.writeFileSync(OUT_T, outTail, {flag:'a'}); fs.writeFileSync(ERR_T, errTail, {flag:'a'});
        }
      }
    }
    await pm2(['save']);
    const chk=(await jlist()).filter(p=>ALLOW.includes(p.name));
    const allOnline = chk.every(p=>p.pm2_env?.status==='online');
    if(allOnline) break;
    await new Promise(r=>setTimeout(r,1500));
  }
  const final=(await jlist()).filter(p=>ALLOW.includes(p.name)).map(p=>({name:p.name,status:p.pm2_env?.status||'unknown'}));
  fs.writeFileSync(PLAN, JSON.stringify({ allow: ALLOW }, null, 2));
  fs.writeFileSync(RESULT, JSON.stringify({ cycles, final }, null, 2));
  process.exit(0);
})();
