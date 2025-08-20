/* eslint-disable */
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const ROOT = '/Users/sawyer/gitSync/gpt-cursor-runner';
const TARGETS = [
  path.join(ROOT,'scripts/g2o'),
  path.join(ROOT,'scripts/ci'),
  path.join(ROOT,'scripts/metrics'),
];
const LOG = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/node-e-refactor-log.json';
const OUTDIR = path.join(ROOT,'scripts/g2o/_inlined');
fs.mkdirSync(OUTDIR, { recursive: true });
const results = [];
const rewriteFile = (file) => {
  let src = fs.readFileSync(file,'utf8'); let changed = false;
  // Pattern A: spawn('node', ['/Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/_inlined/inlined_26593925.js', ...])
  src = src.replace(/spawn\(\s*(['"])node\1\s*,\s*\[\s*(['"])-e\2\s*,\s*(['"])((?:\\.|[^'"])*)\3\s*(?:,|\])([\s\S]*?)\]\s*\)/g,
    (m, q1, q2, q3, code, tail) => {
      const body = code.replace(/\\n/g,'\n').replace(/\\'/g,"'").replace(/\\"/g,'"');
      const hash = crypto.createHash('md5').update(file + ':' + body).digest('hex').slice(0,8);
      const outFile = path.join(OUTDIR, `inlined_${hash}.js`);
      const banner = `/* auto-extracted from ${path.basename(file)} */\n`;
      fs.writeFileSync(outFile, banner + body + '\n');
      results.push({ file, kind:'spawn-array', outFile });
      changed = true;
      return `spawn(${q1}node${q1}, [${q1}${outFile}${q1}${tail ? ','+tail : ''}])`;
    });
  // Pattern B: exec("node /Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/_inlined/inlined_26593925.js" ...")
  src = src.replace(/exec\(\s*(['"])node\s+-e\s+((?:"[^"]*"|'[^']*'))([^'"]*)\1\s*(?:,|\))/g,
    (m, q, codeq, rest) => {
      const code = codeq.slice(1,-1).replace(/\\n/g,'\n').replace(/\\'/g,"'").replace(/\\"/g,'"');
      const hash = crypto.createHash('md5').update(file + ':' + code).digest('hex').slice(0,8);
      const outFile = path.join(OUTDIR, `inlined_${hash}.js`);
      fs.writeFileSync(outFile, `/* auto-extracted from ${path.basename(file)} */\n${code}\n`);
      results.push({ file, kind:'exec-string', outFile });
      return `exec(${q}node ${outFile}${q}${rest||''}${q})`;
    });
  if (changed) fs.writeFileSync(file, src);
  return changed;
};
const walk = (p)=> {
  if (!fs.existsSync(p)) return;
  const st = fs.statSync(p);
  if (st.isDirectory()) return fs.readdirSync(p).forEach(n => walk(path.join(p,n)));
  if (!/\.(js|ts|mjs|cjs|sh|json|yml|yaml)$/.test(p)) return;
  const txt = fs.readFileSync(p,'utf8'); if (!/node\s+-e\b/.test(txt)) return;
  const ok = rewriteFile(p);
  if (!ok) results.push({ file:p, kind:'unhandled', note:'pattern not matched' });
};
TARGETS.forEach(walk);
fs.writeFileSync(LOG, JSON.stringify({ results }, null, 2));
console.log('[auto-refactor-inline-node-e] log at', LOG);
