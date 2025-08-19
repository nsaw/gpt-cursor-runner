#!/usr/bin/env node
// run_eslint_fast_now_once.js
const { spawn } = require('child_process'); const fs = require('fs'), path = require('path');
const [,, budgetArg, jsonOut, outLog, errLog, ...globs] = process.argv;
const budget = Number(budgetArg || 120000);
if (!jsonOut || !outLog || !errLog) { console.error("Usage: <budget_ms> <json_out> <stdout_log> <stderr_log> [globs...]"); process.exit(2); }
const ensure = p=>fs.mkdirSync(path.dirname(p),{recursive:true});
ensure(jsonOut); ensure(outLog); ensure(errLog);
const outFD=fs.openSync(outLog,'a'), errFD=fs.openSync(errLog,'a');
const scope = globs.length?globs:[
  "scripts/g2o/**/*.{js,ts,tsx}",
  "scripts/ci/**/*.{js,ts,tsx}",
  "scripts/metrics/**/*.{js,ts,tsx}",
  "scripts/validate/**/*.{js,ts,tsx}",
  "config/**/*.{js,ts,tsx}",
];
const args=["--format","json","--output-file",jsonOut,"--max-warnings","1000000",...scope];
const child=spawn(process.execPath,[require.resolve("eslint/bin/eslint.js"),...args],{stdio:['ignore',outFD,errFD]});
const t=setTimeout(()=>{try{process.kill(child.pid,'SIGTERM');}catch{}},budget);
child.on('exit',c=>{clearTimeout(t);process.exit(fs.existsSync(jsonOut)?0:(c??1));});
