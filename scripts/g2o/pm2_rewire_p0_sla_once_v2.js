/* eslint-disable */
const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
const NAME='p0-patch-sla-watch';
const SCRIPT='/Users/sawyer/gitSync/gpt-cursor-runner/scripts/monitor/p0_patch_sla_watch_once.js';
const RESULT='/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_rewire_p0_sla_result.json';
const OUT_T='/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_p0_out_tail.log';
const ERR_T='/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_p0_err_tail.log';
const pm2=(args,ms=15000)=>new Promise(res=>{
  const p=spawn('pm2',args,{stdio:['ignore','pipe','pipe']});
  let out='',err=''; const t=setTimeout(()=>{try{p.kill('SIGKILL');}catch(_){ }res({code:124,out,err:'timeout'});},ms);
  p.stdout.on('data',d=>out+=d); p.stderr.on('data',d=>err+=d);
  p.on('exit',c=>{clearTimeout(t); res({code:c??1,out,err});}); p.on('error',()=>res({code:127,out:'',err:'spawn-error'}));
});
const jlist=async()=>{ const r=await pm2(['jlist']); try{ return JSON.parse(r.out||'[]'); }catch{ return []; } };
const tail=(f,sz=8192)=>{ try{ const st=fs.statSync(f); const pos=Math.max(0,st.size-sz);
  const fd=fs.openSync(f,'r'); const buf=Buffer.alloc(st.size-pos); fs.readSync(fd,buf,0,buf.length,pos); fs.closeSync(fd); return buf.toString('utf8'); }catch{ return ''; } };
(async()=>{
  const actions=[];
  // delete (if exists)
  actions.push({step:'delete', name:NAME}); await pm2(['delete', NAME]);
  // start clean
  actions.push({step:'start', name:NAME});
  await pm2(['start', SCRIPT, '--name', NAME, '--time', '--restart-delay', '3000', '--max-restarts', '5']);
  // verify up to 4s
  let ok=false, env={};
  for(let i=0;i<4;i++){
    const list=await jlist(); const svc=list.find(x=>x.name===NAME);
    if(svc){ env=svc.pm2_env||{}; if(env.status==='online'){ ok=true; break; } }
    await new Promise(r=>setTimeout(r,1000));
  }
  const outTail = tail(env.pm_out_log_path||''); const errTail = tail(env.pm_err_log_path||'');
  fs.mkdirSync(path.dirname(OUT_T),{recursive:true});
  fs.writeFileSync(OUT_T, outTail); fs.writeFileSync(ERR_T, errTail);
  if (ok) await pm2(['save']);
  fs.mkdirSync(path.dirname(RESULT),{recursive:true});
  fs.writeFileSync(RESULT, JSON.stringify({ ok, envSummary:{status:env.status, out:env.pm_out_log_path, err:env.pm_err_log_path} }, null, 2));
  process.exit(ok?0:1);
})();
