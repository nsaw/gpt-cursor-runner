import fs from "fs"; import path from "path";
const ROOT="/Users/sawyer/gitSync/.cursor-cache/CYOPS";
const P1=path.join(ROOT,"patches/G2o/P1");
const BLOCKED=path.join(ROOT,"patches/G2o/P1.blocked");
const TRIAGE=path.join(ROOT,"summaries/_triage");
fs.mkdirSync(TRIAGE,{recursive:true});
function blockedSet(){
  const f = path.join(P1,"P1.BLOCKED.json");
  try{ const j = JSON.parse(fs.readFileSync(f,"utf8")); return new Set((j?.blocked||j?.quarantined||[]).map(x=>x.id||x.blockId||x.file).filter(Boolean)); }catch{ return new Set(); }
}
function listP1(){ try{ return fs.readdirSync(P1).filter(f=>f.startsWith("patch-v") && f.endsWith(".json.hold")); }catch{ return []; } }
function orderKey(f){ const m=f.match(/\(P1\.(\d{2})\.(\d{2})\)/); return m?`${m[1]}-${m[2]}-${f}`:`99-99-${f}`; }
(function main(){
  const bset = blockedSet();
  const cand = listP1()
    .filter(f => !bset.has(f) && !fs.existsSync(path.join(BLOCKED,f+".blocked.json")))
    .sort((a,b)=> orderKey(a).localeCompare(orderKey(b)))[0];
  if(!cand){ console.log("NO_CANDIDATE"); process.exit(0); }
  console.log(path.join(P1, cand));
})();
