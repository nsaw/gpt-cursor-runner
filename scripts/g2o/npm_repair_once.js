#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */
const {execFile} = require('child_process'); 
const fs = require('fs'); 
const path = require('path');

const outJson = process.argv[2]; 
const outLog = process.argv[3]; 
const repo = process.argv[4];
const timeoutMs = Number(process.argv[5]||'900000'); // 15m hard cap

const candidates = ['/opt/homebrew/bin/npm','/usr/local/bin/npm','/usr/bin/npm','npm'];

function pick(binList){ 
  for(const p of binList){ 
    try{ 
      fs.accessSync(p, fs.constants.X_OK); 
      return p; 
    }catch{ /* ignore and try next path */ } 
  } 
  return null; 
}

const npmBin = pick(candidates);
const log = [];

function run(args){ 
  return new Promise((res) => {
    if (!npmBin) return res({code:127, args, error:'npm-not-found'});
    execFile(npmBin, args, {cwd: repo, timeout: timeoutMs}, (e,so,se) => {
      res({code: e? (e.code||1) : 0, stdout:so, stderr:se, args});
    });
  });
}

(async() => {
  const result = { ok:false, steps:[], npmBin, repo, ts:new Date().toISOString() };
  try {
    const lock = fs.existsSync(path.join(repo,'package-lock.json'));
    const args1 = lock ? ['ci','--no-audit','--fund=false','--progress=false'] : ['install','--no-audit','--fund=false','--progress=false'];
    const r1 = await run(args1); 
    result.steps.push({step:`npm:${args1.join(' ')}`, code:r1.code});
    if (r1.code!==0){
      const r2 = await run(['install','--no-audit','--fund=false','--progress=false']);
      result.steps.push({step:'npm install fallback', code:r2.code});
      result.ok = (r2.code===0);
    } else { 
      result.ok = true; 
    }
  } catch (e) { 
    result.error = String(e); 
  }
  fs.writeFileSync(outJson, JSON.stringify(result,null,2));
  fs.writeFileSync(outLog, (`${log.join('\n')  }\n${  JSON.stringify(result,null,2)}`));
  console.log(JSON.stringify(result,null,2));
})();
