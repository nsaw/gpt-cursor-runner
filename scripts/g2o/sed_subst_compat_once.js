#!/usr/bin/env node
// sed substitution shim to avoid bash history expansion / quoting traps
(function(){
  const fs=require('fs');
  const cmd=(process.argv[2]||'').trim(), file=process.argv[3];
  if(!cmd||!file||!fs.existsSync(file)){ console.error('ARGS'); process.exit(2); }
  // Accept: s<delim>from<delim>to<delim>flags
  const m = cmd.match(/s([/@#|:;~^%])(.*?)(?:\1)(.*?)(?:\1)([gimuy]*)/);
  if(!m){ console.error('NO_SUBST_PATTERN'); process.exit(3); }
  const [, , from, to, flags ] = m;
  const data=fs.readFileSync(file,'utf8');
  const re=new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), flags.includes('g')?'g':'');
  fs.writeFileSync(file, data.replace(re,to), 'utf8');
  console.log(`SED_COMPAT_OK:${file}`);
})();
