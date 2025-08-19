#!/usr/bin/env node
(function(){
  const fs=require('fs');
  const file=process.argv[2], needle=process.argv.slice(3).join(' ');
  if(!file||!needle){ console.error('ARGS'); process.exit(2); }
  const txt=fs.readFileSync(file,'utf8');
  if(txt.indexOf(needle)>=0){ console.log('CONTAINS'); process.exit(0); }
  console.log('MISSING'); process.exit(3);
})();
