/* eslint-disable */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT="/Users/sawyer/gitSync/gpt-cursor-runner";
const PRE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-phase2-pre.json";
const POST="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-phase2-post.json";
const DELTA="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-phase2-delta.json";
const OFF="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-top-offenders.json";
const BIN=path.join(ROOT,"scripts/ci/eslint_run_local_once.js");
const FIXABLE=['no-var','prefer-const','dot-notation','eqeqeq','object-shorthand','no-extra-boolean-cast','no-useless-escape','semi','quotes'];
const forceFlags = FIXABLE.map(r=>['--rule',`${r}:error`]).flat();
const run = (args, out)=> new Promise(res=>{
  const base=[BIN, "--", "--ext", ".ts,.tsx,.js"]; // pass-thru args to eslint
  const of = out ? ["-f","json","-o", out] : [];
  const p = spawn(process.execPath, [path.join(ROOT,'scripts/ci/eslint_run_local_once.js'), ".", "--ext",".ts,.tsx,.js", ...of, ...args], { cwd: ROOT, stdio: of.length?['ignore','ignore','inherit']:'inherit' });
  const t = setTimeout(()=>{ try{ p.kill("SIGKILL"); }catch(_){ } res(124); }, 180000);
  p.on('exit', c=>{ clearTimeout(t); res(c??1); });
});
const sum=(file)=>{ try{ const r=JSON.parse(fs.readFileSync(file,'utf8')); let e=0,w=0;
  for(const f of r){ for(const m of (f.messages||[])){ if(m.severity===2) e++; else if(m.severity===1) w++; } }
  return {errors:e,warnings:w};
}catch{return{errors:-1,warnings:-1}}};
(async()=>{
  await run(["-f","json","-o",PRE,"--max-warnings","1000000"], null);
  let ranked=[]; try{ ranked = JSON.parse(fs.readFileSync(OFF,'utf8')).ranked || []; }catch{}
  const targets = ranked.slice(0,6).map(x=>x.dir);
  for (const dir of targets) {
    await run(["--fix","--max-warnings","0", ...forceFlags, dir], null);
  }
  await run(["-f","json","-o",POST,"--max-warnings","1000000"], null);
  const pre=sum(PRE), post=sum(POST);
  const delta = { pre, post, reducedErrors: pre.errors - post.errors, reducedWarnings: pre.warnings - post.warnings,
                  ratio: pre.errors>0 ? (pre.errors - post.errors)/pre.errors : 0 };
  fs.writeFileSync(DELTA, JSON.stringify(delta, null, 2));
  process.exit(delta.ratio >= 0.15 ? 0 : 2);
})();
