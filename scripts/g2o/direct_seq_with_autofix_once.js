#!/usr/bin/env node
const fs=require('fs'), p=require('path'), cp=require('child_process');
const QROOT='/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
const P1=p.join(QROOT,'G2o/P1');
const FAILED=p.join(QROOT,'.failed');
const COMPLETED=p.join(QROOT,'.completed');
const LOGS='/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs';
const MAX=parseInt(process.env.MAX_AUTOFIX_ATTEMPTS||'3',10);

function log(s){ fs.mkdirSync(LOGS,{recursive:true}); fs.appendFileSync(p.join(LOGS,'patch-events.log'), `[AUTOSEQ] ${s}\n`); console.log(s); }
const list=d => {try{return fs.readdirSync(d);}catch{ return []; }};

function orderList(){
  const orderFile=p.join(P1,'execution_order_P1.md');
  let order=list(P1).filter(f => /^patch-v.+\.json(\.hold)?$/.test(f)).map(x => x.replace(/\.hold$/,''));
  try{
    const lines=fs.readFileSync(orderFile,'utf8').split(/\r?\n/).filter(Boolean);
    const inDir=new Set(order); order=lines.filter(l => l.startsWith('patch-v') && inDir.has(l));
  }catch{ /* ignore file read errors */ }
  return order;
}
function restoreFromFailed(name){
  const src=p.join(FAILED,name); if(!fs.existsSync(src)) return false;
  fs.mkdirSync(P1,{recursive:true});
  fs.writeFileSync(p.join(P1,`${name}.hold`), fs.readFileSync(src));
  fs.unlinkSync(src); return true;
}
function currentCandidate(){
  const order=orderList();
  for(const base of order){
    if(fs.existsSync(p.join(COMPLETED,base))) continue;
    if(fs.existsSync(p.join(FAILED,base))) { restoreFromFailed(base); return base; }
    if(fs.existsSync(p.join(P1,base))||fs.existsSync(p.join(P1,`${base}.hold`))) return base;
  }
  return null;
}
function execCompat(abs){ const r=cp.spawnSync('node',[p.join(__dirname,'exec_patch_with_compat_once.js'),abs],{stdio:'inherit'}); return r.status===0; }

function removeFromFailed(base){ const f=p.join(FAILED,base); if(fs.existsSync(f)) try{fs.unlinkSync(f);}catch{ /* ignore unlink errors */ } }

(function main(){
  const started = Date.now();
  const maxRuntime = 30 * 60 * 1000; // 30 minutes max
  while(Date.now() - started < maxRuntime){
    const base=currentCandidate();
    if(!base){ log('NO_CANDIDATE'); process.exit(0); } // eslint-disable-line no-process-exit

    const pAbs = fs.existsSync(p.join(P1,`${base}.hold`)) ? p.join(P1,`${base}.hold`)
      : fs.existsSync(p.join(P1,base)) ? p.join(P1,base) : null;
    if(!pAbs){ log(`ERR_NO_SOURCE:${base}`); process.exit(2); } // eslint-disable-line no-process-exit

    let passed=false;
    for(let attempt=1; attempt<=MAX; attempt++){
      // auto-fix before each try
      cp.spawnSync('node',[p.join(__dirname,'autofix_forbidden_shell_once.js'), pAbs],{stdio:'inherit'});

      const ok=execCompat(pAbs);
      if(ok){
        fs.mkdirSync(COMPLETED,{recursive:true});
        try{ if(fs.existsSync(pAbs)) fs.renameSync(pAbs, p.join(COMPLETED,base)); }catch{ /* ignore rename errors */ }
        removeFromFailed(base);
        log(`PASS:${base}:attempt=${attempt}`);
        passed=true; break;
      }
      // on failure: rehydrate from .failed to .hold for next loop
      const fpath=p.join(FAILED,base);
      if(fs.existsSync(fpath)){ fs.mkdirSync(P1,{recursive:true}); fs.writeFileSync(p.join(P1,`${base}.hold`), fs.readFileSync(fpath)); fs.unlinkSync(fpath); }
      log(`RETRY:${base}:attempt=${attempt}`);
    }

    if(!passed){
      const blocked=p.join(P1,'P1.BLOCKED.json');
      const payload={ ts:Date.now(), reason:'repair_exhausted', patch:base, maxAttempts:MAX };
      try{ fs.writeFileSync(blocked, JSON.stringify(payload,null,2)); }catch{ /* ignore write errors */ }
      log(`HALT:${base}:repair_exhausted`);
      process.exit(3); // eslint-disable-line no-process-exit
    }

    // loop continues to next candidate
  }
})();
