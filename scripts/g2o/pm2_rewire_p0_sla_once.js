/* eslint-disable */
const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
const NAME='p0-patch-sla-watch';
const SCRIPT='/Users/sawyer/gitSync/gpt-cursor-runner/scripts/monitor/p0_patch_sla_watch_once.js';
const RESULT='/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_rewire_p0_sla_result.json';
const pm2=(args,ms=15000)=>new Promise(res=>{
  const p=spawn('pm2',args,{stdio:['ignore','pipe','pipe']});
  let out='',err=''; const t=setTimeout(()=>{try{p.kill('SIGKILL');}catch(_){ }res({code:124,out,err:'timeout'});},ms);
  p.stdout.on('data',d=>out+=d); p.stderr.on('data',d=>err+=d);
  p.on('exit',c=>{clearTimeout(t); res({code:c??1,out,err});}); p.on('error',()=>res({code:127,out:'',err:'spawn-error'}));
});
(async()=>{
  const actions=[];
  actions.push({step:'start-or-restart', name:NAME});
  await pm2(['start', SCRIPT, '--name', NAME]);
  // verify online
  let ok=false;
  for (let i=0;i<4;i++){
    const j = await pm2(['jlist']); let list=[]; try{ list = JSON.parse(j.out||'[]'); }catch{}
    const svc = list.find(x=>x.name===NAME);
    if (svc?.pm2_env?.status==='online'){ ok=true; break; }
    await new Promise(r=>setTimeout(r,1000));
  }
  if (ok) await pm2(['save']);
  fs.mkdirSync(path.dirname(RESULT),{recursive:true});
  fs.writeFileSync(RESULT, JSON.stringify({ actions, verifiedOnline: ok }, null, 2));
  process.exit(ok?0:1);
})();
