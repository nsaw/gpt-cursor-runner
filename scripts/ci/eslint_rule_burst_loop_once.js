/* eslint-disable */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path');
const ROOT="/Users/sawyer/gitSync/gpt-cursor-runner";
const RUNNER=path.join(ROOT,"scripts/ci/eslint_run_local_once.js");
const PRE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-pre.json";
const POST="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-post.json";
const DELTA="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-delta.json";
const OFF="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-offenders.json";
const RULES="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-rule-inventory.json";
const SAMPLE_LOG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-sample-dryrun.log";

// conservative set of fixable rules for automated passes
const FIXABLE=['no-var','prefer-const','dot-notation','eqeqeq','object-shorthand','no-extra-boolean-cast','no-useless-escape','semi','quotes','no-trailing-spaces','no-multiple-empty-lines','eol-last','comma-dangle'];
const pass = (args, out)=> new Promise(res=>{
  const of = out ? ["-f","json","-o",out] : [];
  const p = spawn(process.execPath,[RUNNER,".","--ext",".ts,.tsx,.js","--no-error-on-unmatched-pattern",...of,...args],{cwd:ROOT,stdio:of.length?['ignore','ignore','inherit']:'inherit'});
  const t = setTimeout(()=>{ try{p.kill('SIGKILL');}catch(_){} res({code:124}); }, 600000);
  p.on('exit', c=>{ clearTimeout(t); res({code:c??1}); });
});
const tsc = ()=> new Promise(res=>{
  const p = spawn(process.execPath,[path.join(ROOT,"scripts/ci/run_tsc_once.js")],{cwd:ROOT,stdio:'inherit'});
  p.on('exit', c=>res(c??1));
});
const sum=(file)=>{ try{ const r=JSON.parse(fs.readFileSync(file,'utf8')); let e=0,w=0; const files=[];
  for(const f of r){ const msgs=f.messages||[]; const errs=msgs.filter(m=>m.severity===2).length; const warns=msgs.filter(m=>m.severity===1).length;
    if(errs||warns) files.push({file:f.filePath,errs,warns}); e+=errs; w+=warns; }
  return {errors:e,warnings:w,files}; }catch{ return {errors:-1,warnings:-1,files:[]}; }};
const offendersFrom=(files)=>{ const tally={}; for(const x of files){ const rel=path.relative(ROOT,x.file); const d=rel.split(path.sep).slice(0,2).join('/')||'.'; tally[d]=(tally[d]||0)+x.errs; }
  return Object.entries(tally).sort((a,b)=>b[1]-a[1]).map(([dir,errors])=>({dir,errors})); };

(async()=>{
  // Pre snapshot + offenders + rule inventory
  await pass(["-f","json","-o",PRE,"--max-warnings","1000000"], null);
  const pre = sum(PRE);
  fs.mkdirSync(path.dirname(OFF),{recursive:true});
  fs.writeFileSync(OFF, JSON.stringify({ ranked: offendersFrom(pre.files) }, null, 2));
  // ensure rules inventory exists
  if (!fs.existsSync(RULES)) {
    // lightweight inline inventory (no extra scan): infer from PRE
    const raw=JSON.parse(fs.readFileSync(PRE,'utf8')); const tally={};
    for(const f of raw){ for(const m of (f.messages||[])){ if(!m.ruleId) continue; tally[m.ruleId]=(tally[m.ruleId]||0)+1; } }
    const ranked=Object.entries(tally).sort((a,b)=>b[1]-a[1]).map(([rule,count])=>({rule,count}));
    fs.writeFileSync(RULES, JSON.stringify({ ranked }, null, 2));
  }

  // Sample dry-run: take top 25 files by errors
  const sample = pre.files.sort((a,b)=>b.errs-a.errs).slice(0,25).map(f=>f.file);
  fs.writeFileSync(SAMPLE_LOG, "sample_count="+sample.length+"\n");
  if (sample.length){
    await new Promise((res)=>{
      const p=spawn(process.execPath,[RUNNER,...sample,"--fix-dry-run","--max-warnings","1000000"],{cwd:ROOT,stdio:'inherit'});
      const t=setTimeout(()=>{ try{p.kill('SIGKILL');}catch(_){} res(); }, 180000);
      p.on('exit',()=>{ clearTimeout(t); res(); });
    });
  }

  // RULE-BURST: iterate rules (most frequent first) but only from FIXABLE allowlist
  let rules=[]; try{ rules = (JSON.parse(fs.readFileSync(RULES,'utf8')).ranked||[]).map(x=>x.rule); }catch{ rules=[]; }
  rules = rules.filter(r=>FIXABLE.includes(r));

  let iter=0; let post=pre;
  const forceRule=(r)=>["--rule",`${r}:error`];
  while (iter<8) {
    iter++;
    // rule pass over top 8 fixable rules this iteration
    for (const r of rules.slice(0,8)) {
      await pass(["--fix","--fix-type","problem,suggestion,layout","--max-warnings","0", ...forceRule(r)], null);
    }
    // chunked directory pass over offenders (grow window)
    const ranked=JSON.parse(fs.readFileSync(OFF,'utf8')).ranked||[];
    const dirs = ranked.slice(0, Math.min(10+iter*2, 30)).map(x=>x.dir);
    for (const d of dirs) {
      await pass(["--fix","--fix-type","problem,suggestion,layout","--max-warnings","0", d], null);
    }
    // compile check, then measure progress
    await tsc();
    await pass(["-f","json","-o",POST,"--max-warnings","1000000"], null);
    post = sum(POST);
    fs.writeFileSync(DELTA, JSON.stringify({iter, pre:{e:pre.errors,w:pre.warnings}, post:{e:post.errors,w:post.warnings},
      deltaE: pre.errors-post.errors, deltaW: pre.warnings-post.warnings}, null, 2));
    fs.writeFileSync(OFF, JSON.stringify({ ranked: offendersFrom(post.files) }, null, 2));
    if (post.errors===0 && post.warnings<=20) break;
    if ((pre.errors-post.errors)<=0 && (pre.warnings-post.warnings)<=0) break; // stuck
    pre = post;
  }
  // Final gate
  if (post.errors===0 && post.warnings<=20) process.exit(0);
  process.exit(2);
})();

