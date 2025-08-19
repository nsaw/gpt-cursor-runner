// eslint_fix_marathon_runner_nsb_once.js — no shebang
const fs=require('fs'), {spawnSync}=require('child_process'); const path=require('path');
const [,, passBudget, intervalMs, maxMs, jsonOut, outLog, errLog, stateFile, hotspotsJs, hotspotsOut, ...globs]=process.argv;
const B=Number(passBudget||120000), I=Number(intervalMs||15000), M=Number(maxMs||14400000);
const started=Date.now(); let pass=0;
const update = (s) => fs.writeFileSync(stateFile,JSON.stringify({...s,ts:new Date().toISOString()},null,2));
update({ok:false,status:'starting'});
while(Date.now()-started<=M){
  pass++;
  spawnSync(process.execPath,[path.resolve(__dirname,'run_eslint_fast_now_nsb_once.js'),
    String(B),jsonOut,outLog,errLog,...globs],{stdio:'inherit'});
  let errors=1, warnings=999999;
  try{
    const data=JSON.parse(fs.readFileSync(jsonOut,'utf8'));
    errors=0; warnings=0; for(const x of data){errors+=(x.errorCount||0); warnings+=(x.warningCount||0);}
  }catch{ /* ignore parse errors */ }
  spawnSync(process.execPath,[hotspotsJs,jsonOut,hotspotsOut,'25'],{stdio:'ignore'});
  const ok=(errors===0 && warnings<20);
  update({ok,status: ok?'green':'running',pass,errors,warnings,elapsed_ms:Date.now()-started,report:jsonOut,hotspots:hotspotsOut});
  if(ok) break;
  if(Date.now()-started>M){ update({ok:false,status:'timeout',pass,errors,warnings}); break; }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,Number(I)); // sleep I ms
}
