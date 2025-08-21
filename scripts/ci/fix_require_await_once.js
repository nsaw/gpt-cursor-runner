/* eslint-disable */
const fs=require('fs');
const HITS="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-extract-hits.json";
const hits=JSON.parse(fs.readFileSync(HITS,'utf8')||"{}")["require-await"]||[];
const group=new Map(); for(const h of hits){ (group.get(h.file)||group.set(h.file,[]).get(h.file)).push(h); }
for(const [file, arr] of group.entries()){
  if(!fs.existsSync(file)) continue; let src=fs.readFileSync(file,'utf8'); let before=src;
  // simple, conservative: remove leading "async " before 'function' or arrow parameters if the line contains no 'await'
  const lines=src.split('\n');
  for(const h of arr){
    const i=Math.max(0,(h.line||1)-1); const L=lines[i]; if(!L || /\bawait\b/.test(L)) continue;
    lines[i]=lines[i].replace(/\basync\s+(function\b|\()/,'$1'); // function foo / (...
    lines[i]=lines[i].replace(/\basync\s+([A-Za-z0-9_]+)\s*=\s*\(/,'$1= ('); // const f = async (..
  }
  src=lines.join('\n'); if(src!==before) fs.writeFileSync(file,src);
}
process.exit(0);
