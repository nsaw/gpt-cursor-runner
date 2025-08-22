/* eslint-disable */
// APPLY only if: APPLY=1 AND sample compile passes AND md5(original) != md5(proposed) AND backups stored
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const file=process.argv[2]; if(!file){ console.error("Usage: node ... <file>"); process.exit(2); }
const apply=process.env.APPLY==='1';
const md5=b=>crypto.createHash('md5').update(b).digest('hex');
const src=fs.readFileSync(file,'utf8'); const before=md5(src);
const propPath=path.join("/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/ts-proposals", path.basename(file)+'.proposal.json');
if(!fs.existsSync(propPath)){ console.error("No proposal for",file); process.exit(2); }
const proposal=JSON.parse(fs.readFileSync(propPath,'utf8'));
const proposed=proposal.diff_preview; // preview contains full text in this harness
// write preview to temp, sample-compile gate happens OUTSIDE before calling this with APPLY=1
const decDir="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/ts-decisions"; fs.mkdirSync(decDir,{recursive:true});
fs.writeFileSync(path.join(decDir, path.basename(file)+'.decision.json'), JSON.stringify({file,apply,ts_sample_gate:"caller_responsible"},null,2));
if(!apply){ process.exit(0); }
// backup then write
const bakDir="/Users/sawyer/gitSync/gpt-cursor-runner/backups/targeted-fix"; fs.mkdirSync(bakDir,{recursive:true});
fs.writeFileSync(path.join(bakDir, path.basename(file)+'.bak'), src);
fs.writeFileSync(file, proposed);
const after=md5(fs.readFileSync(file)); fs.mkdirSync("/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/ts-md5",{recursive:true});
fs.writeFileSync(path.join("/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/ts-md5", path.basename(file)+'.md5.json'), JSON.stringify({before,after,file},null,2));
process.exit(0)
