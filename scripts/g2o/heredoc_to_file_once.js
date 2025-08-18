#!/usr/bin/env node
const fs=require('fs'), p=require('path');
const [target,b64,append='0']=process.argv.slice(2);
if(!target||!b64){console.error("USAGE: heredoc_to_file_once.js <path> <b64> [append=0|1]");process.exit(2)}
fs.mkdirSync(p.dirname(target),{recursive:true});
const data=Buffer.from(b64,'base64');
fs[append==='1'?'appendFileSync':'writeFileSync'](target,data);
console.log((append==='1'?'APPEND_OK:':'FILE_OK:')+target);
