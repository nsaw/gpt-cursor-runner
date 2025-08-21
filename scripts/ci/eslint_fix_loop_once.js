/* eslint-disable */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path');
const ROOT="/Users/sawyer/gitSync/gpt-cursor-runner";
const RUNNER=path.join(ROOT,"scripts/ci/eslint_run_local_once.js");
const PRE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-pre.json";
const POST="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-post.json";
const DELTA="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-delta.json";
const OFF="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-offenders.json";
const SAMPLE_LOG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-sample-dryrun.log";
const FIXABLE=['no-var','prefer-const','dot-notation','eqeqeq','object-shorthand','no-extra-boolean-cast','no-useless-escape','semi','quotes','no-trailing-spaces','no-multiple-empty-lines','no-extra-semi'];
const forceFlags = FIXABLE.map(r=>['--rule',`${r}:error`]).flat();
const run = (args, out)=> new Promise(res=>{
  const outArgs = out ? ["-f","json","-o",out] : [];
  const p = spawn(process.execPath, [RUNNER, ".", "--ext",".ts,.tsx,.js","--no-error-on-unmatched-pattern", ...outArgs, ...args], { cwd: ROOT, stdio: outArgs.length?['ignore','ignore','inherit']:'inherit' });
  const t = setTimeout(()=>{ try{ p.kill("SIGKILL"); }catch(_){ } res({code:124}); }, 300000);
  p.on('exit', c=>{ clearTimeout(t); res({code:c??1}); });
});
const summarize=(file)=>{ try{ const r=JSON.parse(fs.readFileSync(file,'utf8')); let e=0,w=0; const files=[];
  for(const f of r){ const errs=(f.messages||[]).filter(m=>m.severity===2).length; const warns=(f.messages||[]).filter(m=>m.severity===1).length; if(errs||warns) files.push({file:f.filePath,errs, warns}); e+=errs; w+=warns; }
  return {errors:e,warnings:w,files};
}catch{ return {errors:-1,warnings:-1,files:[]}; }};
const offendersFrom=(files)=>{ const tally={}; for(const x of files){ const rel=path.relative(ROOT,x.file); const dir2=rel.split(path.sep).slice(0,2).join('/')||'.'; tally[dir2]=(tally[dir2]||0)+x.errs; }
  return Object.entries(tally).sort((a,b)=>b[1]-a[1]).map(([dir,errors])=>({dir,errors})); };
(async()=>{
  // Pre snapshot
  await run(["-f","json","-o",PRE,"--max-warnings","1000000"], null);
  let pre = summarize(PRE);
  fs.mkdirSync(path.dirname(OFF),{recursive:true});
  fs.writeFileSync(OFF, JSON.stringify({ranked: offendersFrom(pre.files)}, null, 2));
  // Sample dry-run over top ~20 files to validate fix behavior (no writes)
  const sample = pre.files.sort((a,b)=>b.errs-a.errs).slice(0,20).map(f=>f.file);
  fs.writeFileSync(SAMPLE_LOG, "sample_count="+sample.length+"\n");
  if (sample.length){
    await new Promise((res)=> {
      const p = spawn(process.execPath, [RUNNER, ...sample, "--fix-dry-run", "--max-warnings","1000000", ...forceFlags], { cwd: ROOT, stdio:'inherit' });
      const t=setTimeout(()=>{ try{p.kill("SIGKILL");}catch(_){ } res(); }, 120000);
      p.on('exit', ()=>{ clearTimeout(t); res(); });
    });
  }
  // Iterative passes (bounded)
  let iter=0, improved=true;
  while (iter<12) {
    iter++;
    // choose top chunk (expand gradually)
    const ranked=JSON.parse(fs.readFileSync(OFF,'utf8')).ranked||[];
    const pick = ranked.slice(0, Math.min(6+iter*2, 30)).map(x=>x.dir);
    if (!pick.length) break;
    // run fix pass on chunk
    for (const dir of pick) {
      await run(["--fix", "--fix-type","problem,suggestion,layout","--max-warnings","0", ...forceFlags, dir], null);
    }
    // compile check after each iteration
    const tsc = spawn(process.execPath, [path.join(ROOT,"scripts/ci/run_tsc_once.js")], { cwd: ROOT, stdio:'inherit' });
    await new Promise(r=>tsc.on('exit',()=>r()));
    // re-scan
    await run(["-f","json","-o",POST,"--max-warnings","1000000"], null);
    const post = summarize(POST);
    const deltaE = pre.errors - post.errors, deltaW = pre.warnings - post.warnings;
    fs.writeFileSync(DELTA, JSON.stringify({iter, pre:{errors:pre.errors,warnings:pre.warnings}, post:{errors:post.errors,warnings:post.warnings}, deltaE, deltaW}, null, 2));
    // update offenders for next pass
    fs.writeFileSync(OFF, JSON.stringify({ ranked: offendersFrom(post.files) }, null, 2));
    improved = deltaE>0 || deltaW>0;
    pre = post;
    if (post.errors===0 && post.warnings<=20) break;
    if (!improved) break; // stop if stuck to avoid infinite loop
  }
  // Final gate
  const final = summarize(POST);
  if (final.errors===0 && final.warnings<=20) process.exit(0);
  process.exit(2);
})();
