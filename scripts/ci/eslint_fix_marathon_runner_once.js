/* eslint-disable @typescript-eslint/no-explicit-any, require-await, @typescript-eslint/no-unused-vars */
#!/usr/bin/env node
const fs=require('fs'), {spawnSync}=require('child_process');
const path=require('path'); const [,, passBudget, intervalMs, maxMs, jsonOut, outLog, errLog, stateFile, hotspotsScript, hotspotsOut, ...globs]=process.argv;
const B=Number(passBudget||120000), I=Number(intervalMs||15000), M=Number(maxMs||5400000);
const started=Date.now(); let pass=0;
const updateState=(s)=>fs.writeFileSync(stateFile,JSON.stringify({...s,ts:new Date().toISOString()},null,2));
while(true){
  pass++;
  const r=spawnSync(process.execPath,[path.resolve(__dirname,"run_eslint_fast_now_once.js"),String(B),jsonOut,outLog,errLog,...globs],{stdio:'inherit'});
  let errors=1, warnings=999999;
  try{
    const data=JSON.parse(fs.readFileSync(jsonOut,'utf8'));
    errors=0; warnings=0; for(const x of data){errors+=(x.errorCount||0); warnings+=(x.warningCount||0);}
  }catch{}
  spawnSync(process.execPath,[hotspotsScript,jsonOut,hotspotsOut,'25'],{stdio:'ignore'});
  const ok=(errors===0 && warnings<20);
  updateState({ok,pass,errors,warnings,elapsed_ms:Date.now()-started,report:jsonOut,hotspots:hotspotsOut});
  if(ok) break;
  if(Date.now()-started>M) break;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,I); // sleep I ms
}
