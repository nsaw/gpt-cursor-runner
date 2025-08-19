#!/usr/bin/env node
// eslint_fix_marathon_runner_once.js — auto-fix marathon (report → fix → report) until gate passes
const fs=require('fs'), {spawnSync}=require('child_process'), path=require('path');
const [,, passBudget, intervalMs, maxMs, jsonOut, outLog, errLog, stateFile, hotspotsScript, hotspotsOut, ...globs]=process.argv;
const B=Number(passBudget||120000), I=Number(intervalMs||15000), M=Number(maxMs||5400000);
const started=Date.now(); let pass=0;

// Fix: Replace Atomics.wait with proper sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const update=(s) => fs.writeFileSync(stateFile,JSON.stringify({...s,ts:new Date().toISOString()},null,2));

const lint=() => spawnSync(process.execPath,[path.resolve(__dirname,'run_eslint_fast_now_once.js'),String(B),jsonOut,outLog,errLog,...globs],{stdio:'inherit'}).status??1;
const fix =() => spawnSync('npx',['eslint','--fix','--ext=.js,.ts,.tsx',...globs],{stdio:'inherit'}).status??1;

// Fix: Convert to async function to use proper sleep
(async () => {
  while(Date.now()-started<=M){
    pass++;
    lint();
    let errors=1, warnings=999999;
    try{
      const data=JSON.parse(fs.readFileSync(jsonOut,'utf8')); errors=0; warnings=0;
      for(const x of data){ errors+=(x.errorCount||0); warnings+=(x.warningCount||0); }
    }catch{ /* ignore parse errors */ }
    spawnSync(process.execPath,[hotspotsScript,jsonOut,hotspotsOut,'25'],{stdio:'ignore'});
    const ok=(errors===0 && warnings<20);
    update({ok,pass,phase:'post-lint',errors,warnings,elapsed_ms:Date.now()-started,report:jsonOut,hotspots:hotspotsOut});
    if(ok) break;
    if(Date.now()-started>M) break;

    // attempt auto-fix and re-check
    fix();
    lint();
    errors=1; warnings=999999;
    try{
      const data=JSON.parse(fs.readFileSync(jsonOut,'utf8')); errors=0; warnings=0;
      for(const x of data){ errors+=(x.errorCount||0); warnings+=(x.warningCount||0); }
    }catch{ /* ignore parse errors */ }
    spawnSync(process.execPath,[hotspotsScript,jsonOut,hotspotsOut,'25'],{stdio:'ignore'});
    update({ok:(errors===0&&warnings<20),pass,phase:'post-fix',errors,warnings,elapsed_ms:Date.now()-started});
    if(errors===0 && warnings<20) break;
    if(Date.now()-started>M) break;

    // Fix: Use proper sleep instead of Atomics.wait
    await sleep(Number.isFinite(I)?I:15000);
  }
})();
