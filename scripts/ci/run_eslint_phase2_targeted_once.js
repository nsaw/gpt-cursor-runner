/* eslint-disable */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path');
const ROOT='/Users/sawyer/gitSync/gpt-cursor-runner';
const OFF='/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-top-offenders.json';
const PRE='/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-phase2-pre.json';
const POST='/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-phase2-post.json';
const DELTA='/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-phase2-delta.json';
const FIXABLE=['no-var','prefer-const','dot-notation','eqeqeq','object-shorthand','no-extra-boolean-cast','no-useless-escape','semi','quotes'];
const forceFlags = FIXABLE.map(r=>['--rule',`${r}:error`]).flat();
const run = (args, jsonOut) => new Promise(res=>{
  const base=['eslint','--ext','.ts,.tsx,.js','--no-error-on-unmatched-pattern'];
  const out = jsonOut ? ['-f','json','-o',jsonOut] : [];
  const p = spawn('npx',[...base, ...out, ...args], { cwd: ROOT, stdio: out.length?['ignore','ignore','inherit']:'inherit' });
  const t = setTimeout(()=>{ try{p.kill('SIGKILL');}catch(_){ } res(124); }, 120000);
  p.on('exit', c=>{ clearTimeout(t); res(c??1); });
});
const summarize=(file)=>{ try{
  const r=JSON.parse(fs.readFileSync(file,'utf8')); let e=0,w=0;
  for(const f of r){ for(const m of (f.messages||[])){ if(m.severity===2) e++; else if(m.severity===1) w++; } }
  return {errors:e,warnings:w};
}catch{return{errors:-1,warnings:-1}}};
(async()=>{
  // Pre snapshot
  await run(['-f','json','-o',PRE,'--max-warnings','1000000'], null);
  const pre = summarize(PRE);

  // Top offenders list
  let ranked=[]; try{ ranked = JSON.parse(fs.readFileSync(OFF,'utf8')).ranked || []; }catch{}
  const top = ranked.slice(0,6).map(x=>x.dir); // limit to top 6 chunks this pass
  for (const dir of top) {
    const target = path.join(ROOT, dir);
    if (!fs.existsSync(target)) continue;
    await run(['--fix','--max-warnings','0',...forceFlags, dir], null);
  }

  // Post snapshot
  await run(['-f','json','-o',POST,'--max-warnings','1000000'], null);
  const post = summarize(POST);
  const delta = { pre, post, reducedErrors: pre.errors - post.errors, reducedWarnings: pre.warnings - post.warnings,
                  ratio: pre.errors>0 ? (pre.errors - post.errors)/pre.errors : 0 };
  fs.writeFileSync(DELTA, JSON.stringify(delta, null, 2));
  // Gate: require >= 0.15 error reduction ratio
  process.exit(delta.ratio >= 0.15 ? 0 : 2);
})();
