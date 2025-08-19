#!/usr/bin/env node
// eslint_top_hotspots_from_report_once.js
// Usage: <report_json> <out_md> <topN=25>
const fs=require('fs'), path=require('path');
const [,, report, out, nArg]=process.argv; const N=Number(nArg||25);
if(!report||!out){console.error('Usage: eslint_top_hotspots_from_report_once.js <report_json> <out_md> [topN]');
// eslint-disable-next-line no-process-exit
  process.exit(2);}
const data=JSON.parse(fs.readFileSync(report,'utf8'));
const byFile=new Map(), byRule=new Map();
for(const r of data){const f=r.filePath||'unknown'; const e=r.errorCount||0,w=r.warningCount||0;
  const cur=byFile.get(f)||{e:0,w:0}; cur.e+=e; cur.w+=w; byFile.set(f,cur);
  for(const m of r.messages||[]){const k=m.ruleId||'__no_rule__'; const v=byRule.get(k)||{c:0}; v.c++; byRule.set(k,v);}
}
const topFiles=[...byFile.entries()].map(([f,{e,w}]) => ({f,e,w,t:e+w})).sort((a,b) => b.t-a.t).slice(0,N);
const topRules=[...byRule.entries()].map(([k,{c}]) => ({rule:k,count:c})).sort((a,b) => b.count-a.count).slice(0,10);
let md=`# ESLint Hotspots (Top ${N})\n\n## Files\n`; topFiles.forEach((x,i) => md+=`${i+1}. ${x.f} — errors:${x.e} warnings:${x.w}\n`);
md+='\n## Rules (Top 10 by hits)\n'; topRules.forEach((r,i) => md+=`${i+1}. ${r.rule} — ${r.count}\n`);
fs.mkdirSync(path.dirname(out),{recursive:true}); fs.writeFileSync(out,md); console.log(JSON.stringify({ok:true,out},null,2));
