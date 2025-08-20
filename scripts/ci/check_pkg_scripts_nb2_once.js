/* eslint-disable */
const fs = require('fs'), path = require('path');
const pkgPath = '/Users/sawyer/gitSync/gpt-cursor-runner/package.json';
const OUT = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pkg-scripts-nb2-scan.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath,'utf8'));
const bad = [];
const pat = /(bash\s+-lc|sh\s+-c|node\s+-e\b)/;
for (const [k,v] of Object.entries(pkg.scripts||{})) {
  if (pat.test(String(v))) bad.push({ script:k, cmd:v });
}
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT, JSON.stringify({ count: bad.length, bad }, null, 2));
console.log('[pkg-scripts-nb2-scan] bad=', bad.length);
process.exit(bad.length ? 1 : 0);
