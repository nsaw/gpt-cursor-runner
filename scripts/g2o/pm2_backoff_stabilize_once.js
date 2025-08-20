/* eslint-disable */
const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
const OUT = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_backoff_result.json';
const allow = (process.env.PM2_ALLOW||'g2o-completed-validator,g2o-executor,g2o-handoff-watcher,main-failure-emitter,main-queue-counters,p0-patch-sla-watch,p0-queue-shape-assessor').split(',');
const pm2=(args,ms=20000)=>new Promise(r=>{ const p=spawn('pm2',args,{stdio:['ignore','pipe','pipe']});
  let out='',err=''; const t=setTimeout(()=>{try{p.kill('SIGKILL');}catch(_){};r({code:124,out,err:'timeout'});},ms);
  p.stdout.on('data',d=>out+=d); p.stderr.on('data',d=>err+=d);
  p.on('exit',c=>{clearTimeout(t); r({code:c??1,out,err});}); p.on('error',()=>r({code:127,out:'',err:'spawn-error'}));});
const jlist=async()=>{ const r=await pm2(['jlist']); try{return JSON.parse(r.out||'[]');}catch{return[];} };
const tailFile=(f,bytes=8192)=>{ try{ const st=fs.statSync(f); const pos=Math.max(0,st.size-bytes); const fd=fs.openSync(f,'r'); const buf=Buffer.alloc(st.size-pos); fs.readSync(fd,buf,0,buf.length,pos); fs.closeSync(fd); return buf.toString('utf8'); }catch{ return ''; } };
(async()=>{
  const log={allow, actions:[]};
  const list=await jlist();
  const bad=list.filter(p=>allow.includes(p.name)&&['errored','stopped','unknown'].includes(p.pm2_env?.status||''));
  for(const svc of bad){
    const steps=[1000,2000,4000]; let online=false;
    for(let i=0;i<steps.length;i++){
      log.actions.push({name:svc.name, step:`restart-attempt-${i+1}`});
      await pm2(['restart',svc.name],15000);
      const end=Date.now()+steps[i];
      while(Date.now()<end) await new Promise(rr=>setTimeout(rr,250));
      const now=(await jlist()).find(x=>x.name===svc.name);
      if(now && now.pm2_env?.status==='online'){ online=true; break; }
    }
    const env=(await jlist()).find(x=>x.name===svc.name)?.pm2_env||{};
    log.actions.push({
      name:svc.name, finalStatus: (await jlist()).find(x=>x.name===svc.name)?.pm2_env?.status||'unknown',
      out_tail: tailFile(env.pm_out_log_path||''), err_tail: tailFile(env.pm_err_log_path||'')
    });
    if(!online) log.actions.push({name:svc.name, step:'escalate:manual-investigation'});
  }
  fs.mkdirSync(path.dirname(OUT),{recursive:true}); fs.writeFileSync(OUT, JSON.stringify(log,null,2));
  console.log('[pm2-backoff] wrote', OUT);
  process.exit(0);
})();
