#!/usr/bin/env node
const fs=require('fs'), {spawnSync}=require('child_process');
const [,, stateFile, maxAgeMs]=process.argv;
const maxAge=Number(maxAgeMs||300000); // 5min default
try{
  const data=JSON.parse(fs.readFileSync(stateFile,'utf8'));
  const age=Date.now()-new Date(data.ts).getTime();
  if(age>maxAge){
    console.log(`Marathon stale (${age}ms > ${maxAge}ms), killing...`);
    spawnSync('pkill',['-f','eslint_fix_marathon_runner'],{stdio:'inherit'});
  }
}catch{ /* ignore parse errors */ }
