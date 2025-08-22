/* eslint-disable */
const fs=require('fs'); const path=require('path');
const MAT="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/ts-error-matrix.json"; const QUE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/ts-repair-queue.json";
// Build queue from matrix: rank files by errors; limit to .ts/.tsx under src-nextgen/**
(()=>{
  let mtx={}; try{ mtx=JSON.parse(fs.readFileSync(MAT,'utf8')); }catch{}
  const files=(mtx.fileRank||[]).map(x=>x.file).filter(f=>/src-nextgen\/.+\.(ts|tsx)$/.test(f));
  const queue=files.map((f,i)=>({idx:i,file:f,status:"pending"}));
  fs.mkdirSync(path.dirname(QUE),{recursive:true}); fs.writeFileSync(QUE, JSON.stringify(queue,null,2)); process.exit(0);
})();
