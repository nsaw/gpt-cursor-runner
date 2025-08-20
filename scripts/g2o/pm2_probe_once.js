/* eslint-disable */
const { spawn } = require('child_process'); const fs = require('fs');
const OUT = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_probe.json';
const allow = (process.env.PM2_ALLOW||'g2o-completed-validator,g2o-executor,g2o-handoff-watcher,main-failure-emitter,main-queue-counters,p0-patch-sla-watch,p0-queue-shape-assessor').split(',');
const pm2=(args,ms=15000)=>new Promise(r=>{ const p=spawn('pm2',args,{stdio:['ignore','pipe','pipe']});
  let out='',err=''; const t=setTimeout(()=>{try{p.kill('SIGKILL');}catch(_){};r({code:124,out,err:'timeout'});},ms);
  p.stdout.on('data',d=>out+=d); p.stderr.on('data',d=>err+=d);
  p.on('exit',c=>{clearTimeout(t); r({code:c??1,out,err});}); p.on('error',()=>r({code:127,out:'',err:'spawn-error'}));});
(async()=>{
  const list = await pm2(['jlist']); let j=[]; try{ j=JSON.parse(list.out||'[]'); }catch{}
  const desc = {};
  for(const name of allow){
    const d = await pm2(['describe', name]); desc[name]=d.out||'';
  }
  fs.mkdirSync(require('path').dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT, JSON.stringify({ allow, list: j, describe: desc }, null, 2));
  console.log('[pm2-probe] wrote', OUT); process.exit(0);
})();
