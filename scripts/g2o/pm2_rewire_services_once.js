/* eslint-disable */
const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
const PLAN = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_rewire_plan.json';
const RESULT = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_rewire_result.json';
const ROOT = '/Users/sawyer/gitSync/gpt-cursor-runner';
const targets = [
  { name: 'g2o-handoff-watcher', script: path.join(ROOT, 'scripts/monitor/handoff_close_the_loop_once.js') },
  { name: 'g2o-completed-validator', script: path.join(ROOT, 'scripts/monitor/completed_validate_once.js') },
  { name: 'main-queue-counters', script: path.join(ROOT, 'scripts/monitor/main_queue_counters_once.js') },
  { name: 'main-failure-emitter', script: path.join(ROOT, 'scripts/monitor/main_failure_emitter_once.js') },
];
const pm2=(args,ms=15000)=>new Promise(res=>{ const p=spawn('pm2',args,{stdio:['ignore','pipe','pipe']});
  let out='',err=''; const t=setTimeout(()=>{ try{p.kill('SIGKILL');}catch(_){ } res({code:124,out,err:'timeout'}); }, ms);
  p.stdout.on('data',d=> out+=d); p.stderr.on('data',d=> err+=d);
  p.on('exit',c=>{ clearTimeout(t); res({code:c??1,out,err}); }); p.on('error',()=>res({code:127,out:'',err:'spawn-error'}));
});
(async ()=>{
  fs.mkdirSync(path.dirname(PLAN),{recursive:true});
  fs.writeFileSync(PLAN, JSON.stringify({ targets }, null, 2));
  const actions=[];
  for (const t of targets) {
    actions.push({ name: t.name, step: 'start-or-restart' });
    await pm2(['start', t.script, '--name', t.name]);
  }
  // Save ecosystem
  await pm2(['save']);
  // Verify online
  const j = await pm2(['jlist']); let list=[]; try{ list=JSON.parse(j.out||'[]'); }catch{}
  const verify = targets.map(t => {
    const found = list.find(x=>x.name===t.name);
    return { name: t.name, status: found?.pm2_env?.status||'unknown' };
  });
  fs.writeFileSync(RESULT, JSON.stringify({ actions, verify }, null, 2));
  process.exit(0);
})();
