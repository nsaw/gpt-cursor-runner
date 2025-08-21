/* eslint-disable */
const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
const ROOT="/Users/sawyer/gitSync/gpt-cursor-runner";
const PRE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-pre.json";
const OUT="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-rule-inventory.json";
const run=(out)=>new Promise(res=>{
  const p=spawn(process.execPath,[path.join(ROOT,'scripts/ci/eslint_run_local_once.js'),".","--ext",".ts,.tsx,.js","-f","json","-o",out,"--max-warnings","1000000"],{cwd:ROOT,stdio:['ignore','ignore','inherit']});
  const t=setTimeout(()=>{try{p.kill('SIGKILL');}catch(_){}res(124);},600000);
  p.on('exit',c=>{clearTimeout(t);res(c??1)});
});
(async()=>{
  await run(PRE);
  let r=[]; try{ r=JSON.parse(fs.readFileSync(PRE,'utf8')); }catch{}
  const tally={}; for(const f of r){ for(const m of (f.messages||[])){ if(!m.ruleId) continue; tally[m.ruleId]=(tally[m.ruleId]||0)+1; } }
  const ranked=Object.entries(tally).sort((a,b)=>b[1]-a[1]).map(([rule,count])=>({rule,count}));
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT, JSON.stringify({ ranked, totalRules: ranked.length }, null, 2));
  process.exit(0);
})();

