/* eslint-disable */
const fs = require('fs'); const path = require('path');
const roots = [
  '/Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o',
  '/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ci',
  '/Users/sawyer/gitSync/gpt-cursor-runner/scripts/metrics',
];
const OUT = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/' + (process.argv[2]||'shell-scan-pre.json');
const hits=[]; const exts=new Set(['.js','.ts','.tsx','.mjs','.cjs','.sh']);
const pat = /(bash\s+-lc|sh\s+-c|exec\(\s*['"][^'"]+['"]\s*\)|shell:\s*true)/;
const walk=(p)=>{ if(!fs.existsSync(p)) return;
  const st=fs.statSync(p); if(st.isDirectory()) return fs.readdirSync(p).forEach(n=>walk(path.join(p,n)));
  if(!exts.has(path.extname(p))) return;
  const txt=fs.readFileSync(p,'utf8'); const lines=txt.split(/\r?\n/);
  lines.forEach((ln,i)=>{ if(pat.test(ln)) hits.push({file:p,line:i+1,snippet:ln.trim()}); });
};
roots.forEach(walk);
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT, JSON.stringify({count:hits.length,hits,roots},null,2));
console.log('[scan-shell-exec] wrote', OUT, 'hits=', hits.length);
