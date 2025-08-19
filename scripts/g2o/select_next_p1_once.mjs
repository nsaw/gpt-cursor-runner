import fs from 'fs'; import path from 'path';
const ROOT='/Users/sawyer/gitSync/.cursor-cache/CYOPS';
const P1=path.join(ROOT,'patches/G2o/P1');
const BLOCKED=path.join(ROOT,'patches/G2o/P1.blocked');
const TRIAGE=path.join(ROOT,'summaries/_triage');
const FAILED=path.join(ROOT,'patches/.failed');
const COMPLETED=path.join(ROOT,'patches/.completed');

fs.mkdirSync(TRIAGE,{recursive:true});

function blockedSet(){
  const f = path.join(P1,'P1.BLOCKED.json');
  try{ const j = JSON.parse(fs.readFileSync(f,'utf8')); return new Set((j?.blocked||j?.quarantined||[]).map(x => x.id||x.blockId||x.file).filter(Boolean)); }catch{ return new Set(); }
}

function listP1(){ 
  try{ 
    return fs.readdirSync(P1).filter(f => f.startsWith('patch-v') && f.endsWith('.json')); 
  }catch{ 
    return []; 
  } 
}

function orderKey(f){ 
  const m=f.match(/\(P1\.(\d{2})\.(\d{2})\)/); 
  return m?`${m[1]}-${m[2]}-${f}`:`99-99-${f}`; 
}

function isAlreadyProcessed(filename) {
  // Check if patch is in failed or completed directories
  return fs.existsSync(path.join(FAILED, filename)) || 
         fs.existsSync(path.join(COMPLETED, filename));
}

(function main(){
  const bset = blockedSet();
  const allPatches = listP1();
  
  // Filter out blocked patches and already processed patches
  const candidates = allPatches
    .filter(f => !bset.has(f) && 
                 !fs.existsSync(path.join(BLOCKED, `${f}.blocked.json`)) &&
                 !isAlreadyProcessed(f))
    .sort((a,b) => orderKey(a).localeCompare(orderKey(b)));
  
  if(candidates.length === 0){ 
    console.log('NO_CANDIDATE'); 
    process.exit(0); 
  }
  
  console.log(path.join(P1, candidates[0]));
})();
