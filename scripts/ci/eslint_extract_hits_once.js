/* eslint-disable */
const fs=require('fs'), path=require('path');
const PRE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-pre.json";
const OUT="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-extract-hits.json";
const RULES=new Set(["require-await","@typescript-eslint/no-explicit-any","@typescript-eslint/no-unused-vars","no-unused-vars"]);
(()=>{
  let r=[]; try{ r=JSON.parse(fs.readFileSync(PRE,'utf8')); }catch{}
  const hits={}; for(const f of r){ for(const m of (f.messages||[])){ if(!RULES.has(m.ruleId)) continue;
    (hits[m.ruleId]||(hits[m.ruleId]=[])).push({file:f.filePath,line:m.line||0,column:m.column||0,message:m.message||""}); } }
  fs.writeFileSync(OUT, JSON.stringify(hits,null,2)); process.exit(0);
})();
