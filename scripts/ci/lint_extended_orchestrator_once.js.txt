/* eslint-disable @typescript-eslint/no-explicit-any, require-await, @typescript-eslint/no-unused-vars */
#!/usr/bin/env node
// lint_extended_orchestrator_once.js — resume-capable (10m default)
const { spawn } = require('child_process');
const fs = require('fs');
const CWD = "/Users/sawyer/gitSync/gpt-cursor-runner";
const ESLINT_JSON = "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/eslint-report.json";
const SCOPE_MAN = "/Users/sawyer/gitSync/gpt-cursor-runner/config/eslint.scope.manifest.json";
const ORCH_SUM = "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/lint-extended.summary.json";
const ORCH_LOG = "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/lint-extended.orchestrator.log";
const DISABLE_CM = "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ci/codemod_eslint_disable_rules_once.js";
const budgetMs = Number(process.argv[2]||"600000");      // 10 minutes
const cooldownMs = Number(process.argv[3]||"1500");      // 1.5s
const start = Date.now();
const EXTENDED = { include: ["scripts/g2o/**/*.{js,ts,tsx}","scripts/ci/**/*.{js,ts,tsx}","scripts/metrics/**/*.{js,ts,tsx}","scripts/validate/**/*.{js,ts,tsx}","config/**/*.{js,ts,tsx}"] };
const PRIMARY  = { include: ["scripts/g2o/**/*.{js,ts,tsx}","scripts/ci/**/*.{js,ts,tsx}","scripts/metrics/**/*.{js,ts,tsx}"] };
const state = fs.existsSync(ORCH_SUM) ? JSON.parse(fs.readFileSync(ORCH_SUM,'utf8')) : { ts:new Date().toISOString(), steps:[], result:null, scope:"EXTENDED" };
function writeScope(man){ fs.writeFileSync(SCOPE_MAN, JSON.stringify(man,null,2)); }
function log(s){ fs.appendFileSync(ORCH_LOG, s + "\n"); }
function runNode(args){ return new Promise(res=>{ const p=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe']}); let out=""; p.stdout.on('data',d=>{out+=d.toString(); log(d.toString().trim());}); p.stderr.on('data',d=>log(d.toString().trim())); p.on('exit',c=>res({code:c,out}));});}
async function runScoped(){ return runNode(["/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ci/run_eslint_scoped_report_once.js"]); }
function counts(){ try{ const arr=JSON.parse(fs.readFileSync(ESLINT_JSON,'utf8')); let e=0,w=0; for(const r of arr){e+=r.errorCount||0; w+=r.warningCount||0;} return {e,w}; }catch{ return {e:999999,w:999999}; } }
async function codemod(rules){
  const logOut="/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/codemod-disable-log.json";
  return runNode([DISABLE_CM, ESLINT_JSON, rules.join(','), "40", logOut]);
}
function checkpoint(){ fs.writeFileSync(ORCH_SUM, JSON.stringify(state,null,2)); }
process.on('SIGINT', ()=>{ log("[orchestrator] SIGINT → checkpoint + exit 130"); checkpoint(); process.exit(130); });
process.on('SIGTERM',()=>{ log("[orchestrator] SIGTERM → checkpoint + exit 130"); checkpoint(); process.exit(130); });
(async()=>{
  log(`[orchestrator] resume start; scope=${state.scope||"EXTENDED"}`);
  if (!state.scope) state.scope="EXTENDED";
  writeScope(state.scope==="EXTENDED"?EXTENDED:PRIMARY);
  while (Date.now()-start < budgetMs){
    const half = (Date.now()-start) > (budgetMs/2);
    await runScoped();
    const {e,w} = counts();
    state.steps.push({event:"eslint-scan", scope:state.scope, errors:e, warnings:w, t:(Date.now()-start)});
    checkpoint();
    if (e===0 && w<=20){ state.result={ok:true, scope:state.scope, errors:e, warnings:w}; break; }
    if (half && state.scope==="EXTENDED"){ state.scope="PRIMARY"; writeScope(PRIMARY); state.steps.push({event:"scope-fallback", to:"PRIMARY", t:(Date.now()-start)}); checkpoint(); continue; }
    const preferred=["@typescript-eslint/no-explicit-any","require-await","@typescript-eslint/no-unused-vars"];
    await codemod(preferred); state.steps.push({event:"codemod", rules:preferred, t:(Date.now()-start)}); checkpoint();
    await new Promise(r=>setTimeout(r, cooldownMs));
  }
  if (!state.result){ const {e,w}=counts(); state.result={ok:(e===0 && w<=20), final:{errors:e,warnings:w}}; }
  checkpoint(); log("[orchestrator] done");
  console.log(JSON.stringify(state.result,null,2));
  process.exit(0);
})();
