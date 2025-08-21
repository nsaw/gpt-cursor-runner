/* eslint-disable */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path');
const ROOT = '/Users/sawyer/gitSync/gpt-cursor-runner';
const PRE = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-phase2-pre.json';
const OUT = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-top-offenders.json';
const run = (args, jsonOut) => new Promise(res=>{
  const p = spawn('npx', ['eslint','.', '--ext','.ts,.tsx,.js','--no-error-on-unmatched-pattern','-f','json','-o',jsonOut, ...args], { cwd: ROOT, stdio:['ignore','ignore','inherit'] });
  const t = setTimeout(()=>{ try{p.kill('SIGKILL');}catch(_){ } res(124); }, 90000);
  p.on('exit', c=>{ clearTimeout(t); res(c??1); });
});
(async()=>{
  await run(['--max-warnings','1000000'], PRE);
  let r=[]; try{ r = JSON.parse(fs.readFileSync(PRE,'utf8')); }catch{}
  const tally = {};
  for (const f of r) {
    const cnt = (f.messages||[]).filter(m=>m.severity===2).length;
    if (!cnt) continue;
    const dir = path.relative(ROOT, f.filePath).split(path.sep).slice(0,2).join('/') || '.';
    tally[dir] = (tally[dir]||0) + cnt;
  }
  const ranked = Object.entries(tally).sort((a,b)=>b[1]-a[1]).map(([dir,errors])=>({dir,errors}));
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT, JSON.stringify({ ranked, totalDirs: ranked.length }, null, 2));
  process.exit(0);
})();
