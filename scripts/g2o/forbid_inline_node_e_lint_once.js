#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */
const fs=require('fs'),p=require('path'); const root='/Users/sawyer/gitSync/gpt-cursor-runner';
const pat=/\bnode\s+-e\b/; const bad=[];
(function walk(d){ for(const de of fs.readdirSync(d,{withFileTypes:true})){
  if(de.name.startsWith('.git')) continue; const fp=p.join(d,de.name);
  if(de.isDirectory()) walk(fp); else if(/\.(sh|mjs|js)$/.test(de.name)){
    try{ const t=fs.readFileSync(fp,'utf8'); if(pat.test(t)) bad.push(fp); }catch(_){ /* ignore file read errors */ }
  }
} })(root);
console.log(bad.length? `INLINE_NODE_E_FOUND:${bad.length}\n${bad.join('\n')}` : 'INLINE_NODE_E_NONE');
process.exit(0); // report-only (never blocks)
