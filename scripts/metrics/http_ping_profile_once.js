#!/usr/bin/env node
const https = require('https'); const http = require('http'); const fs = require('fs');
function fetch(url){ return new Promise(res=>{
  const lib = url.startsWith('https')? https : http;
  const req = lib.request(url, { method:'GET', timeout:8000 }, r=>{
    // Drain
    r.on('data',()=>{}); r.on('end',()=>res({ status:r.statusCode||0 }));
  });
  req.on('timeout', ()=>{ try{req.destroy();}catch{} res({ status:0 }); });
  req.on('error', ()=>res({ status:0 }));
  req.end();
});}
(async()=>{
  const profilePath = process.argv[2], outPath = process.argv[3];
  const prof = JSON.parse(fs.readFileSync(profilePath,'utf8'));
  const results = [];
  for (const h of prof.http){
    const r = await fetch(h.url);
    const ok = (h.accept||[]).includes(r.status);
    results.push({ id:h.id, url:h.url, status:r.status, ok, accepted:h.accept||[], required:!!h.required });
  }
  const summary = {
    ok: results.filter(x=>x.required).every(x=>x.ok),
    phase: prof.phase, results
  };
  if (outPath) fs.writeFileSync(outPath, JSON.stringify(summary,null,2));
  console.log(JSON.stringify(summary,null,2));
  process.exit(summary.ok?0:0); // phase P2.11.00: record-only, non-blocking
})();
