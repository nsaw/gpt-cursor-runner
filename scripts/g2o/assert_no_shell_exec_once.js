/* eslint-disable */
const fs = require('fs'); const path = require('path');
const roots=['/Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o','/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ci','/Users/sawyer/gitSync/gpt-cursor-runner/scripts/metrics'];
const pat=/(bash\s+-lc|sh\s+-c|exec\(\s*['"][^'"]+['"]\s*\)|shell:\s*true)/;
let count=0;
(function walk(p){ if(!fs.existsSync(p)) return;
  const st=fs.statSync(p); if(st.isDirectory()) return fs.readdirSync(p).forEach(n=>walk(path.join(p,n)));
  const txt=fs.readFileSync(p,'utf8'); if(pat.test(txt)) count++;
})(roots[0]); (function walk2(p){ if(!fs.existsSync(p)) return;
  const st=fs.statSync(p); if(st.isDirectory()) return fs.readdirSync(p).forEach(n=>walk2(path.join(p,n)));
  const txt=fs.readFileSync(p,'utf8'); if(pat.test(txt)) count++;
})(roots[1]); (function walk3(p){ if(!fs.existsSync(p)) return;
  const st=fs.statSync(p); if(st.isDirectory()) return fs.readdirSync(p).forEach(n=>walk3(path.join(p,n)));
  const txt=fs.readFileSync(p,'utf8'); if(pat.test(txt)) count++;
})(roots[2]);
if(count>0){ console.error('[assert-no-shell-exec] FAIL: occurrences=',count); process.exit(1); }
console.log('[assert-no-shell-exec] PASS: 0 occurrences.');
