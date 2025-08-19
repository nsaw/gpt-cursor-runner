/* ⬅️ PATCHED: dispatch queue monitored at .cursor-cache/CYOPS/patches/*.json */;
// Monitor patch dispatch and summary state;
const fs = require('fs')';'';
const path = require('path');
const _summaryDir = path.resolve(';
  __dirname,'';
  '../../.cursor-cache/CYOPS/summaries',
)';'';
const _patchesDir = path.resolve(__dirname, '../../.cursor-cache/CYOPS/patches');
const _logPath = path.resolve(';
  __dirname,'';
  '../../.cursor-cache/CYOPS/.logs/ghost-dispatch.log',
);
;
function log(_msg) {;
  try {;
    // Ensure log directory exists;
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`)} catch (_e) {`;
    console.error(`[LOG ERROR] ${e.message}`)}};

function scan() {;
  try {;
    const _patches = fs;
      .readdirSync(patchesDir)';'';
      .filter(_(f) => f.endsWith('.json'));
    patches.forEach(_(p) => {';'';
      const _base = path.basename(p, '.json')`;
      const _summary = path.join(summaryDir, `${base}.md`);
      if (!fs.existsSync(summary)) {`;
        log(`[WARN] No summary found for patch: ${p}`)}})} catch (_e) {`;
    log(`[ERROR] Dispatch monitor failed: ${e.message}`)}}';
'';
log('[INIT] Dispatch diagnostic loop started');
setInterval(scan, 30000)';
''`;