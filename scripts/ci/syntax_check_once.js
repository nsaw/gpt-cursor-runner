#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any, require-await, @typescript-eslint/no-unused-vars */
// syntax_check_once.js — compile-only check using vm.Script
const fs = require('fs'), vm = require('vm');
const files = (process.argv[2]||'').split(',').map(s => s.trim()).filter(Boolean);
const out = []; let ok = true;
for (const f of files) {
  try { const code = fs.readFileSync(f, 'utf8'); new vm.Script(code,{filename:f}); out.push({file:f, ok:true}); }
  catch(e){ ok=false; out.push({file:f, ok:false, error:String(e)}); }
}
console.log(JSON.stringify({ok, results:out}, null, 2));
// eslint-disable-next-line no-process-exit
process.exit(ok?0:1);
