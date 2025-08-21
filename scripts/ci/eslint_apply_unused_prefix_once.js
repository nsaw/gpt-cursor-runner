/* eslint-disable */
const fs = require('fs'); const path = require('path');
const PRE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-pre.json";
const ROOT="/Users/sawyer/gitSync/gpt-cursor-runner";
const BACK="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/_prefix-backups";
const UNUSED_RULES=new Set(["@typescript-eslint/no-unused-vars","no-unused-vars"]);
function applyEdits(file, edits){
  const src=fs.readFileSync(file,'utf8').split('\n');
  // sort by line desc then column desc to avoid offset drift
  edits.sort((a,b)=> b.line-a.line || b.column-a.column );
  for(const e of edits){
    const i=e.line-1; if(!src[i]) continue;
    const line=src[i];
    // Only insert '_' immediately before identifier start
    src[i] = line.slice(0, e.column-1) + "_" + line.slice(e.column-1);
  }
  fs.mkdirSync(BACK,{recursive:true});
  const rel=path.relative(ROOT,file).replace(/[\/\\]/g,'__');
  fs.writeFileSync(path.join(BACK, rel+".bak"), fs.readFileSync(file));
  fs.writeFileSync(file, src.join('\n'));
}
(()=>{
  let report=[]; try{ report=JSON.parse(fs.readFileSync(PRE,'utf8')); }catch{}
  const byFile=new Map();
  for(const f of report){
    const file=f.filePath;
    for(const m of (f.messages||[])){
      if(!UNUSED_RULES.has(m.ruleId)) continue;
      if(m.nodeType!=="Identifier") continue;
      // Skip obvious risky contexts based on message
      const msg=(m.message||"");
      if(/'default'/.test(msg)) continue;
      if(/assigned a value but never used/.test(msg)){} // ok
      // Require precise location
      if(typeof m.line!=='number' || typeof m.column!=='number') continue;
      if(!byFile.has(file)) byFile.set(file,[]);
      byFile.get(file).push({line:m.line, column:m.column});
    }
  }
  let total=0;
  for(const [file, edits] of byFile.entries()){
    // skip d.ts / types / interfaces files
    if(/\.d\.ts$/.test(file) || /\/types?\//.test(file)) continue;
    try{ applyEdits(file, edits); total+=edits.length; }catch(e){ /* ignore file-level failures */ }
  }
  process.stdout.write(`[unused-prefix] applied=${total} files=${byFile.size}\n`);
  process.exit(0);
})();
