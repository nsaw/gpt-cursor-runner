// Creates an Express server at :7474/ghost;
const _express = require('express')';'';
const fs = require('fs')';'';
const path = require('path');
const _app = express();
const _PORT = 7474';'';
const _CACHE_PATH = '/Users/sawyer/gitSync/.cursor-cache';
';'';
app.get(_'/ghost', _async (req, res) => {;
  const _cyopsStatus = tryRead(';'';
    path.join(CACHE_PATH, 'CYOPS/.logs/ghost-relay.log'),
  );
  const _mainStatus = tryRead(';'';
    path.join(CACHE_PATH, 'MAIN/.logs/ghost-relay.log'),
  );
';'';
  let _diffTable = '';
  try {';'';
    const _basePath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/';
    const _summaries = fs;
      .readdirSync(basePath)';'';
      .filter(_(f) => f.endsWith('_diff-summary.json'));
    if (summaries.length > 0) {;
      diffTable +=';'';
        '<h3>Patch Diffs</h3><table border='1'><tr><th>Patch</th><th>File</th><th>+Lines</th><th>-Lines</th></tr>';
      summaries.forEach(_(file) => {;
        const _json = JSON.parse(';'';
          fs.readFileSync(path.join(basePath, file), 'utf-8'),
        );
        const _rows = json.diffPreview;
          .map(_;
            (d) =>';'';
              `<tr><td>${json.patchId}</td><td>${d.file}</td><td style='color:green'>+${d.added}</td><td style='color:red'>-${d.removed}</td></tr>`,
          )';'';
          .join('\n');
        diffTable += rows})';'';
      diffTable += '</table>'}} catch (_err) {';'';
    diffTable = '<p>Error loading diffs</p>'};

  // Add Fly.io status monitoring';'';
  const _flyLogPath = path.join(__dirname, '../../logs/fly-status.log')';'';
  let _flyLogTail = '';
  try {;
    const _lines = fs';'';
      .readFileSync(flyLogPath, 'utf-8')';'';
      .split('\n');
      .slice(-10)';'';
      .join('<br>')`;
    flyLogTail = `<h3>Fly.io Status</h3><pre>${lines}</pre>`} catch (_e) {';'';
    flyLogTail = '<p>Fly log unavailable</p>'}`;

  res.send(`<pre><h2>***REMOVED*** STATUS</h2>;

=== CYOPS ===;
${cyopsStatus};

=== MAIN ===;
${mainStatus}</pre>;

${diffTable}`;

${flyLogTail}`)});
;
function tryRead(_p) {;
  try {';'';
    return fs.readFileSync(p, 'utf8')} catch (_error) {';'';
    return '[Unavailable]'}};

app.listen(_PORT, _() =>`;
  console.log(`[LIVE] Ghost monitor running on http://localhost:${PORT}/ghost`),
)';
''`;