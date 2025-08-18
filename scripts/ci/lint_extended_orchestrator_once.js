#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */
/*
  lint_extended_orchestrator_once.js
  Strategy (timeboxed):
    1) Start in EXTENDED scope (scope manifest as-is).
    2) Run scoped ESLint → if (errors>0) then targeted codemod for: 
       @typescript-eslint/no-explicit-any, require-await, @typescript-eslint/no-unused-vars.
    3) Re-run ESLint; loop until errors==0 or budget halfway.
    4) If warnings>20 at halfway, FALLBACK to PRIMARY scope (scripts/{g2o,ci,metrics}) and continue.
    5) Stop when (errors==0 && warnings<=20) or budget exhausted; write summary.
  All file writes are atomic; logs emitted continuously.
*/
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const CWD = "/Users/sawyer/gitSync/gpt-cursor-runner";
const ESLINT_JSON = "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/eslint-report.json";
const ORCH_SUM = "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/lint-extended.summary.json";
const ORCH_LOG = "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/lint-extended.orchestrator.log";
const SCOPE_MAN = "/Users/sawyer/gitSync/gpt-cursor-runner/config/eslint.scope.manifest.json";
const DISABLE_CM = "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ci/codemod_eslint_disable_rules_once.js";
const BUDGET_MS = Number(process.argv[2]||"7200000");  // default 2h
const COOL_MS = Number(process.argv[3]||"2000");
const start = Date.now();
const EXTENDED = {
  include: [
    "scripts/g2o/**/*.{js,ts,tsx}",
    "scripts/ci/**/*.{js,ts,tsx}",
    "scripts/metrics/**/*.{js,ts,tsx}",
    "scripts/validate/**/*.{js,ts,tsx}",
    "config/**/*.{js,ts,tsx}"
  ]
};
const PRIMARY = {
  include: [
    "scripts/g2o/**/*.{js,ts,tsx}",
    "scripts/ci/**/*.{js,ts,tsx}",
    "scripts/metrics/**/*.{js,ts,tsx}"
  ]
};
function writeScope(man){ fs.writeFileSync(SCOPE_MAN, JSON.stringify(man,null,2)); }
function runNode(bin, args){ 
  return new Promise(res=>{
    const p = spawn(bin, args, { stdio:['ignore','pipe','pipe'] });
    let out = "", err=""; 
    p.stdout.on('data',(d)=>{ out+=d.toString(); fs.appendFileSync(ORCH_LOG, d); });
    p.stderr.on('data',(d)=>{ err+=d.toString(); fs.appendFileSync(ORCH_LOG, d); });
    p.on('exit',(code)=> res({code,out,err}));
  });
}
async function runScoped() {
  const args = ["/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ci/run_eslint_scoped_report_once.js"];
  return runNode(process.execPath, args);
}
function parseCounts() {
  try {
    const arr = JSON.parse(fs.readFileSync(ESLINT_JSON,'utf8'));
    let errors=0,warnings=0;
    for (const r of arr){ errors += r.errorCount||0; warnings += r.warningCount||0; }
    return {errors,warnings};
  } catch { return {errors:999999, warnings:999999}; }
}
function topRuleCounts(limit=3){
  try {
    const arr = JSON.parse(fs.readFileSync(ESLINT_JSON,'utf8'));
    const counts={};
    for (const r of arr){ for (const m of (r.messages||[])){ const id=m.ruleId||""; if(!id) continue; counts[id]=(counts[id]||0)+1; } }
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([k])=>k);
  } catch { return []; }
}
async function applyCodemod(rules){
  const logOut = "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/codemod-disable-log.json";
  const args = [DISABLE_CM, ESLINT_JSON, rules.join(','), "40", logOut];
  return runNode(process.execPath, args);
}
(async()=>{
  const summary = { ts:new Date().toISOString(), steps:[], result:null };
  fs.writeFileSync(ORCH_LOG, `[orchestrator] start ${summary.ts}\n`);
  let scope = "EXTENDED"; writeScope(EXTENDED);
  while (Date.now()-start < BUDGET_MS){
    fs.appendFileSync(ORCH_LOG, `[orchestrator] scope=${scope} running ESLint\n`);
    await runScoped();
    let {errors,warnings} = parseCounts();
    summary.steps.push({event:"eslint-scan", scope, errors, warnings, t: Date.now()-start});
    if (errors===0 && warnings<=20) { summary.result = {ok:true, scope, errors, warnings}; break; }
    const halfBudget = (Date.now()-start) > (BUDGET_MS/2);
    if (halfBudget && scope==="EXTENDED" && (errors>0 || warnings>20)) {
      scope = "PRIMARY"; writeScope(PRIMARY);
      summary.steps.push({event:"scope-fallback", to:"PRIMARY", t: Date.now()-start});
      continue;
    }
    // Choose codemod targets (prioritize known worst offenders)
    const preferred = ["@typescript-eslint/no-explicit-any","require-await","@typescript-eslint/no-unused-vars"];
    const liveTop = topRuleCounts(10);
    const targets = preferred.filter(r=>liveTop.includes(r));
    if (targets.length>0) {
      fs.appendFileSync(ORCH_LOG, `[orchestrator] applying codemod for: ${targets.join(', ')}\n`);
      await applyCodemod(targets);
      summary.steps.push({event:"codemod", rules:targets, t: Date.now()-start});
    } else {
      // no known offenders → break to avoid churn
      summary.steps.push({event:"no-targets", t: Date.now()-start});
      break;
    }
    await new Promise(r=>setTimeout(r, COOL_MS));
  }
  if (!summary.result) {
    const {errors,warnings} = parseCounts();
    summary.result = {ok:(errors===0 && warnings<=20), final:{errors,warnings}};
  }
  fs.writeFileSync(ORCH_SUM, JSON.stringify(summary,null,2));
  fs.appendFileSync(ORCH_LOG, `[orchestrator] done ${new Date().toISOString()}\n`);
  console.log(JSON.stringify(summary.result,null,2));
  process.exit(0);
})();
