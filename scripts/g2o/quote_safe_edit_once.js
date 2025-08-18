#!/usr/bin/env node
(async function(){
  const fs=require('fs'), p=require('path');
  const planPath=process.argv[2];
  if(!planPath){ console.error("PLAN_ARG_MISSING"); process.exit(2); }
  const plan=JSON.parse(fs.readFileSync(planPath,'utf8'));
  const file=plan.target;
  let html=""; try{ html=fs.readFileSync(file,'utf8'); }catch{ html="<!doctype html><html><head></head><body></body></html>"; }
  function ensureHeadMeta(doc, httpEquiv, content){
    if(new RegExp(`<meta\\s+http-equiv=['"]${httpEquiv}['"]`,`i`).test(doc)) return doc;
    return doc.replace(/<head>/i, `<head>\n<meta http-equiv="${httpEquiv}" content="${content}">`);
  }
  let out=html;
  for(const e of (plan.edits||[])){
    if(e.ensureHeadMeta){ out=ensureHeadMeta(out, e.ensureHeadMeta.httpEquiv, e.ensureHeadMeta.content); }
  }
  fs.mkdirSync(p.dirname(file), {recursive:true});
  fs.writeFileSync(file, out);
  console.log("EDIT_OK:"+file);
})().catch(e=>{ console.error("EDIT_ERR:"+e.message); process.exit(1); });
