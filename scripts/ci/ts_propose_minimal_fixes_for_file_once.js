/* eslint-disable */
// Generates a PROPOSAL ONLY (no writes): underscores unused params; adds :unknown to untyped params;
// renames local 'console' param to '_console'. Emits proposal JSON + preview text.
const fs=require('fs'); const path=require('path');
const file=process.argv[2]; if(!file){ console.error("Usage: node ... <file>"); process.exit(2); }
const src=fs.readFileSync(file,'utf8'); let out=src, changes=[];
const push=(desc)=>changes.push(desc);
// 6133: prefix unused params (shallow heuristic)
out=out.replace(/(function\s+\w+\s*\(|\(|)([^)]*)(\)\s*[:=])/g,(m,a,params,c)=>{
  const pp=params.split(',').map(s=>s.trim()).filter(Boolean).map(p=>p.replace(/^(\w+)(\s*:\s*[^=,]+)?$/, (mm,n,ty)=>`_${n}${ty||''}`));
  if(pp.join(', ')!==params){ push("prefixed-unused-params"); return a+pp.join(', ')+c; } return m;
});
// 7006: annotate simple single params without type
out=out.replace(/\((\s*[a-zA-Z_][\w]*)\s*\)\s*=>/g,'($1: unknown) =>'); // () => arg
out=out.replace(/\((\s*[a-zA-Z_][\w]*)\s*,/g,'($1: unknown,');
out=out.replace(/,\s*([a-zA-Z_][\w]*)\s*\)/g,', $1: unknown)');
// console param rename
out=out.replace(/(function\s+\w+\s*\([^)]*)\bconsole\b/g,'$1_console')
       .replace(/(\(|,\s*)console(\s*:\s*[^),]+)?(\s*[),])/g,'$1_console$2$3');
const proposal={file, changes, diff_preview: out.slice(0,4000)};
const dir="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/ts-proposals"; fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir, path.basename(file)+'.proposal.json'), JSON.stringify(proposal,null,2));
process.exit(0);
