/* eslint-disable */
const fs = require('fs'), path = require('path');
const roots = [
  '/Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o',
  '/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ci',
  '/Users/sawyer/gitSync/gpt-cursor-runner/scripts/metrics',
];
const OUT = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/nb2_precommit_scan.json';
const exts = new Set(['.js','.ts','.tsx','.mjs','.cjs','.sh','.yml','.yaml','.json']);
const shellPat = /(bash\s+-lc|sh\s+-c|exec\(\s*['"][^'"]+['"]\s*\)|shell:\s*true)/;
const nodeEPat = /node\s+-e\b/;
const hits = [];
const walk = (p) => {
  if (!fs.existsSync(p)) return;
  const st = fs.statSync(p);
  if (st.isDirectory()) return fs.readdirSync(p).forEach(n => walk(path.join(p, n)));
  if (!exts.has(path.extname(p))) return;
  const txt = fs.readFileSync(p, 'utf8');
  txt.split(/\r?\n/).forEach((ln,i)=>{
    if (shellPat.test(ln) || nodeEPat.test(ln)) hits.push({ file:p, line:i+1, snippet:ln.trim() });
  });
};
roots.forEach(walk);
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT, JSON.stringify({ count:hits.length, hits, roots }, null, 2));
console.log('[nb2-precommit-scan] hits=', hits.length, '->', OUT);
process.exit(hits.length ? 1 : 0);
