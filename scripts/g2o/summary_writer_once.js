/* eslint-disable @typescript-eslint/no-unused-vars */
#!/usr/bin/env node
const fs=require('fs'),p=require('path');
function arg(k,def){const i=process.argv.indexOf(k);return i>-1?process.argv[i+1]:def}
const mainDir=arg('--mainDir','/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries');
const cyopsDir=arg('--cyopsDir','/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries');
const title  =arg('--title','Untitled');
const bodyB64=arg('--bodyB64','');
const body   =Buffer.from(bodyB64,'base64').toString('utf8');
const ts=new Date().toISOString().replace(/[:.]/g,'-'); const fn=`summary-${ts}.md`;
const md=`# ${title}\n\n${body}\n`;
for(const d of [mainDir,cyopsDir]){
  try{ fs.mkdirSync(d,{recursive:true}); fs.writeFileSync(p.join(d,fn),md); console.log('SUMMARY_WROTE:'+p.join(d,fn)); }
  catch(e){ try{ const fb=p.join(d,`summary-fallback-${ts}.md`); fs.writeFileSync(fb,`# Fallback Summary\n${e.message}\n`); console.log('SUMMARY_FALLBACK:'+fb); }catch(_){} }
}
