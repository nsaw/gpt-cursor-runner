/* eslint-disable */
const { spawn } = require('child_process'); const fs=require('fs'); const path=require('path');
const ROOT="/Users/sawyer/gitSync/gpt-cursor-runner";
const RUN=path.join(ROOT,"scripts/ci/eslint_run_local_once.js");
const PRE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-pre.json";
const POST="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-post.json";
const DELTA="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-delta.json";
const OFF="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-offenders.json";
const RULES="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-rule-inventory.json";
const EX="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-extract-hits.json";
const FIXABLE=['no-var','prefer-const','dot-notation','eqeqeq','object-shorthand','no-extra-boolean-cast','no-useless-escape','semi','quotes','no-trailing-spaces','no-multiple-empty-lines','eol-last','comma-dangle'];
const pass=(args,out)=>new Promise(r=>{ const of=out?["-f","json","-o",out]:[];
  const p=spawn(process.execPath,[RUN,".","--ext",".ts,.tsx,.js","--no-error-on-unmatched-pattern",...of,...args],{cwd:ROOT,stdio:of.length?['ignore','ignore','inherit']:'inherit'});
  const t=setTimeout(()=>{try{p.kill('SIGKILL');}catch(_){}r({code:124})},900000); p.on('exit',c=>{clearTimeout(t);r({code:c??1})});});
const tsc=()=>new Promise(r=>{ const p=spawn(process.execPath,[path.join(ROOT,'scripts/ci/run_tsc_once.js')],{cwd:ROOT,stdio:'inherit'}); p.on('exit',c=>r(c??1)); });
const sum=(file)=>{ try{ const r=JSON.parse(fs.readFileSync(file,'utf8')); let e=0,w=0; const files=[];
  for(const f of r){ const msgs=f.messages||[]; const errs=msgs.filter(m=>m.severity===2).length; const warns=msgs.filter(m=>m.severity===1).length; if(errs||warns) files.push({file:f.filePath,errs,warns}); e+=errs; w+=warns; }
  return {errors:e,warnings:w,files}; }catch{ return {errors:-1,warnings:-1,files:[]}; }};
const offendersFrom=(files)=>{ const tally={}; for(const x of files){ const rel=path.relative(ROOT,x.file); const d=rel.split(path.sep).slice(0,2).join('/')||'.'; tally[d]=(tally[d]||0)+x.errs; }
  return Object.entries(tally).sort((a,b)=>b[1]-a[1]).map(([dir,errors])=>({dir,errors})); };
(async()=>{
  await pass(["-f","json","-o",PRE,"--max-warnings","1000000"], null);
  const pre=sum(PRE); fs.writeFileSync(OFF, JSON.stringify({ranked: offendersFrom(pre.files)},null,2));
  // inventory + extract
  const inv=spawn(process.execPath,[path.join(ROOT,'scripts/ci/eslint_rule_inventory_once.js')],{cwd:ROOT,stdio:'inherit'});
  await new Promise(res=>inv.on('exit',()=>res()));
  const ex=spawn(process.execPath,[path.join(ROOT,'scripts/ci/eslint_extract_hits_once.js')],{cwd:ROOT,stdio:'inherit'});
  await new Promise(res=>ex.on('exit',()=>res()));
  // staged fixes
  await new Promise(res=>spawn(process.execPath,[path.join(ROOT,'scripts/ci/fix_require_await_once.js')],{cwd:ROOT,stdio:'inherit'}).on('exit',()=>res()));
  await new Promise(res=>spawn(process.execPath,[path.join(ROOT,'scripts/ci/fix_explicit_any_once.js')],{cwd:ROOT,stdio:'inherit'}).on('exit',()=>res()));
  // burst on fixable rules
  const rules=(JSON.parse(fs.readFileSync(RULES,'utf8')).ranked||[]).map(x=>x.rule).filter(r=>FIXABLE.includes(r));
  for(const r of rules.slice(0,10)){ await pass(["--fix","--fix-type","problem,suggestion,layout","--max-warnings","0","--rule",`${r}:error`], null); }
  // final sweep + unused prefix
  await new Promise(res=>spawn(process.execPath,[path.join(ROOT,'scripts/ci/eslint_apply_unused_prefix_once.js')],{cwd:ROOT,stdio:'inherit'}).on('exit',()=>res()));
  await pass(["--fix","--fix-type","problem,suggestion,layout","--max-warnings","0"], null);
  await tsc();
  await pass(["-f","json","-o",POST,"--max-warnings","1000000"], null);
  const post=sum(POST); fs.writeFileSync(DELTA, JSON.stringify({pre:{e:pre.errors,w:pre.warnings}, post:{e:post.errors,w:post.warnings}},null,2));
  process.exit(post.errors===0 && post.warnings<=20 ? 0 : 2);
})();
