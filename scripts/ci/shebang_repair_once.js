#!/usr/bin/env node
// shebang_repair_once.js — move '#!/usr/bin/env node' to line 1, keep any eslint banner on line 2
const fs=require('fs'), p=require('path');
const files=[];
(function walk(d){ for(const de of fs.readdirSync(d,{withFileTypes:true})){
  if(de.name.startsWith('.git')) continue;
  const fp=p.join(d,de.name);
  if(de.isDirectory()) walk(fp);
  else if(/\.js$/.test(de.name)) files.push(fp);
} })(p.join(__dirname,'..'));
let fixed=0;
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  if(t.startsWith('#!')) continue;
  const m=t.match(/^\s*(\/\*[\s\S]*?\*\/\s*)?#!\/usr\/bin\/env node/m);
  if(!m) continue;
  const idx=t.indexOf('#!');
  const pre=t.slice(0,idx);
  const rest=t.slice(idx);
  const banner=(/^\s*\/\*\s*eslint-disable\b[\s\S]*?\*\/\s*/.exec(pre)||[''])[0];
  const pre2=pre.replace(banner,'');
  const updated=`#!/usr/bin/env node\n${banner?banner:''}${pre2}${rest.replace(/^#![^\n]*\n?/,'')}`;
  fs.writeFileSync(f,updated);
  fixed++;
}
console.log(JSON.stringify({ok:true,fixed},null,2));
