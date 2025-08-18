#!/usr/bin/env node
/**
 * Exec a patch JSON by running shell arrays safely (already "compat" sanitized upstream).
 * Returns 0 on success, non-zero on failure. Moves to .failed on failure if not already moved.
 */
const fs=require('fs'), p=require('path'), cp=require('child_process');
const abs=process.argv[2]; if(!abs||!fs.existsSync(abs)){console.log("NO_PATCH");process.exit(2)}
const QROOT="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches";
const FAILED=p.join(QROOT,".failed"); const name=p.basename(abs).replace(/\.hold$/,'');
const json=JSON.parse(fs.readFileSync(abs,'utf8'));
const shells=[...(json.preCommit?.checks||[]),...(json.mutation?.shell||[]),...(json.postMutationBuild?.shell||[]),...(json.validate?.shell||[])]
  .filter(s=>typeof s==='string' && s.trim().length);
const run=s=>cp.spawnSync(s,{shell:true,stdio:'inherit',timeout:300000}).status===0;
for(const s of shells){ if(!run(s)){ try{fs.mkdirSync(FAILED,{recursive:true}); fs.writeFileSync(p.join(FAILED,name), fs.readFileSync(abs));}catch{}; process.exit(3) } }
console.log("PATCH_OK:"+name); process.exit(0);
