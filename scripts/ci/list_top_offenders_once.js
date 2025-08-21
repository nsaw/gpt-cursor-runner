/* eslint-disable */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT="/Users/sawyer/gitSync/gpt-cursor-runner";
const OUT="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-top-offenders.json";
const PRE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-phase2-pre.json";
const run = (extraArgs)=> new Promise(res=>{
  const p = spawn(process.execPath, [path.join(ROOT,'scripts/ci/eslint_run_local_once.js'), ".", "--ext", ".ts,.tsx,.js", "-f", "json", "-o", PRE, "--max-warnings", "1000000", ...extraArgs], { cwd: ROOT, stdio:['ignore','ignore','inherit'] });
  const t = setTimeout(()=>{ try{ p.kill("SIGKILL"); }catch(_){ } res(124); }, 120000);
  p.on('exit', c=>{ clearTimeout(t); res(c??1); });
});
(async()=>{
  await run([]);
  let r=[]; try{ r=JSON.parse(fs.readFileSync(PRE,'utf8')); }catch{}
  const tally = {};
  for (const f of r) {
    const errs = (f.messages||[]).filter(m=>m.severity===2).length;
    if (!errs) continue;
    const rel = path.relative(ROOT, f.filePath);
    const dir2 = rel.split(path.sep).slice(0,2).join('/') || '.';
    tally[dir2] = (tally[dir2]||0) + errs;
  }
  const ranked = Object.entries(tally).sort((a,b)=>b[1]-a[1]).map(([dir,errors])=>({dir,errors}));
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT, JSON.stringify({ ranked, totalDirs: ranked.length }, null, 2));
  console.log("[top-offenders] wrote", OUT, "dirs:", ranked.length);
  process.exit(0);
})();
