/* eslint-disable */
const fs = require('fs'); const path = require('path');
const ROOTS = [
  '/Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o',
  '/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ci',
  '/Users/sawyer/gitSync/gpt-cursor-runner/scripts/metrics',
];
const OUT = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/node-e-scan-' + (process.argv[2]||'pre') + '.json';
const exts = new Set(['.js','.ts','.sh','.json','.yml','.yaml']);
const hits = [];
const walk = (p) => {
  if (!fs.existsSync(p)) return;
  const st = fs.statSync(p);
  if (st.isDirectory()) return fs.readdirSync(p).forEach(n => walk(path.join(p, n)));
  const ext = path.extname(p);
  if (!exts.has(ext)) return;
  const txt = fs.readFileSync(p, 'utf8');
  const lines = txt.split(/\r?\n/);
  lines.forEach((ln, i) => {
    if (/node\s+-e\b/.test(ln)) hits.push({ file: p, line: i+1, snippet: ln.trim() });
  });
};
ROOTS.forEach(walk);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ hits, count: hits.length, roots: ROOTS }, null, 2));
console.log(`[scan-inline-node-e] wrote ${OUT} with ${hits.length} hits`);
