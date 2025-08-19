import fs from 'fs'; import path from 'path';
const Q='/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches', P1='/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/G2o/P1', FAILED='/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.failed', TRI='/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage', PIN='patch-v2.0.142'.trim();
const NAME=/^(patch-v\d+\.\d+\.\d+\(P1\.\d{2}\.\d{2}\)_([a-z0-9][a-z0-9-]*))\.json(\.hold)?$/;
const kebab=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const ensure=d=>{try{fs.mkdirSync(d,{recursive:true});}catch{}};
const list=d=>{try{return fs.readdirSync(d);}catch{return[];}};
const key=f=>{const m=f.match(/\(P1\.(\d{2})\.(\d{2})\)/);return [m?+m[1]:99,m?+m[2]:99,f];};
function pick(){
  if(PIN){ const f=[...list(P1),...list(FAILED)].find(x=>x.includes(PIN)); return f?{dir:list(P1).includes(f)?P1:FAILED,file:f}:null; }
  const p=list(P1).filter(f=>/\.json(\.hold)?$/.test(f)).sort((a,b)=>{const A=key(a),B=key(b);return A[0]-B[0]||A[1]-B[1]||(A[2]<B[2]?-1:1);});
  if(p.length) return {dir:P1,file:p[0]};
  const f=list(FAILED).filter(f=>/\.json$/.test(f)).sort((a,b)=>{const A=key(a),B=key(b);return A[0]-B[0]||A[1]-B[1]||(A[2]<B[2]?-1:1);});
  return f.length?{dir:FAILED,file:f[0]}:null;
}
function restoreFromFailed(sel){
  const src=path.join(FAILED, sel.file); const dst=path.join(P1, sel.file+'.hold'); ensure(P1);
  fs.writeFileSync(dst, fs.readFileSync(src)); try{fs.unlinkSync(src);}catch{};
  return {placed:true, path:dst};
}
function diagnoseAndFix(fp){
  const base=path.basename(fp); const noHold=base.replace(/\.hold$/,''); const m=noHold.match(NAME);
  let reason=[], changed=false, outPath=fp;
  // rename to kebab if slug contains uppercase/space
  if(m){
    const wantSlug=kebab(m[2]); if(wantSlug!==m[2]){
      const target=m[1].replace(/_[^_]+$/, '_'+wantSlug)+'.json'+(fp.endsWith('.hold')?'.hold':'');
      const dst=path.join(path.dirname(fp), target);
      fs.renameSync(fp, dst); outPath=dst; changed=true; reason.push('slug_kebabized');
    }
  } else {
    // filename not matching policy: attempt to coerce by keeping version tuple, kebab the tail
    const tail=noHold.split(')_')[1]||'patch'; const want=noHold.split(')_')[0]+')_'+kebab(tail)+'.json'+(fp.endsWith('.hold')?'.hold':'');
    const dst=path.join(path.dirname(fp), want); try{fs.renameSync(fp,dst); outPath=dst; changed=true; reason.push('coerced_name');}catch(e){reason.push('rename_fail:'+e.message);}
  }
  // sync JSON blockId/version to filename (without .hold)
  try{
    const nj=path.basename(outPath).replace(/\.hold$/,''); const mm=nj.match(/^((patch-v\d+\.\d+\.\d+\(P1\.\d{2}\.\d{2}\))_[a-z0-9-]+)\.json$/);
    if(mm){
      const blockId=mm[1], version=mm[2];
      const j=JSON.parse(fs.readFileSync(outPath,'utf8'));
      if(j.blockId!==blockId){ j.blockId=blockId; changed=true; reason.push('blockId_sync'); }
      if(j.version!==version){ j.version=version; changed=true; reason.push('version_sync'); }
      if(!j.role){ j.role='command_patch'; changed=true; reason.push('role_defaulted'); }
      if(!j.target){ j.target='CYOPS'; changed=true; reason.push('target_defaulted'); }
      fs.writeFileSync(outPath, JSON.stringify(j,null,2));
    } else { reason.push('json_sync_skipped_no_match'); }
  }catch(e){ reason.push('json_sync_error:'+e.message); }
  return {changed, reason, path:outPath};
}
(function main(){
  ensure(TRI);
  let sel=pick(); if(!sel){ console.log('NAMER_NO_CANDIDATE'); return; }
  if(sel.dir===FAILED){ const r=restoreFromFailed(sel); sel={dir:P1,file:path.basename(r.path)}; }
  const fp=path.join(P1, sel.file);
  const fix=diagnoseAndFix(fp);
  const report={ts:new Date().toISOString(), candidate:sel.file, final:path.basename(fix.path), changed:fix.changed, reasons:fix.reason};
  const out=path.join(TRI,'naming_doctor_'+Date.now()+'.json'); fs.writeFileSync(out, JSON.stringify(report,null,2));
  console.log('NAMER_DONE:'+out);
})();