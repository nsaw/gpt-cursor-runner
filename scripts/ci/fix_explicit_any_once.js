/* eslint-disable */
const fs=require('fs'), path=require('path');
const HITS="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-extract-hits.json";
const hits=(JSON.parse(fs.readFileSync(HITS,'utf8')||"{}")["@typescript-eslint/no-explicit-any"]||[]).map(x=>x.file);
const set=new Set(hits);
for(const file of set){
  if(/node_modules|\/types\//.test(file) || /\.d\.ts$/.test(file)) continue;
  if(!fs.existsSync(file)) continue; const before=fs.readFileSync(file,'utf8');
  const after=before.replace(/:\s*any(\b)/g,': unknown$1');
  if(after!==before) fs.writeFileSync(file,after);
}
process.exit(0);
