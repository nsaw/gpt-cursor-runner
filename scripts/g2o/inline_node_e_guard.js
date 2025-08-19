#!/usr/bin/env node
// inline_node_e_guard.js — scoped scanner for `node -e` usage (NB-2.0)
// Usage: node inline_node_e_guard.js --paths <comma-separated> --mode report|fail-on-violation
const fs = require('fs'); const path = require('path');
function val(flag){ const i=process.argv.indexOf(flag); return i>0?process.argv[i+1]:''; }
const roots = (val('--paths')||'').split(',').filter(Boolean).map(p => path.resolve(p));
const mode = val('--mode') || 'report';
const rx = /\bnode\s+-e\b/;
const filesRx = /\.(m?js|cjs|ts|tsx|sh|zsh|bash)$/;
const selfPath = __filename; // Exclude self from scanning
const violations = [];
function walk(dir){
  let ents=[]; try{ ents=fs.readdirSync(dir,{withFileTypes:true}); }catch{ return; }
  for(const e of ents){
    const p = path.join(dir, e.name);
    if(e.isDirectory()){ walk(p); }
    else if(filesRx.test(e.name) && p !== selfPath){ // Skip self
      let t=''; try{ t=fs.readFileSync(p,'utf8'); }catch{ continue; }
      // Skip files that are scanners themselves
      if(p.includes('scan') || p.includes('guard')) continue;
      if(rx.test(t)) violations.push({file:p, pattern:String(rx)});
    }
  }
}
for(const r of roots){ if(fs.existsSync(r)) walk(r); }
const out = { ok: violations.length===0, count: violations.length, violations, roots, mode };
console.log(JSON.stringify(out,null,2));
if(violations.length && mode==='fail-on-violation') process.exit(2);
